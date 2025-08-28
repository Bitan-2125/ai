# backend/main.py

import os
import uuid
import aiofiles
import markdown  # <--- ADD THIS IMPORT
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Import our custom modules
import ai_services
from prompts import SYSTEM_PROMPT

# --- APP INITIALIZATION ---
app = FastAPI()

# --- CORS MIDDLEWARE ---
# This allows our frontend (running on a different origin) to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity (in production, restrict this)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DIRECTORIES ---
TEMP_DIR = "temp_files"
os.makedirs(TEMP_DIR, exist_ok=True)


# --- API ENDPOINTS ---

@app.post("/api/simplify")
async def simplify_legal_text(
    audio_file: UploadFile = File(None),
    text_input: str = Form(None)
):
    if not audio_file and not text_input:
        raise HTTPException(status_code=400, detail="Please provide either an audio file or text.")

    user_text = ""
    temp_audio_path = None

    try:
        if audio_file:
            # Save uploaded audio to a temporary file
            temp_audio_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_{audio_file.filename}")
            async with aiofiles.open(temp_audio_path, 'wb') as out_file:
                content = await audio_file.read()
                await out_file.write(content)

            # Transcribe the audio file
            user_text = ai_services.transcribe_audio(temp_audio_path)
        else:
            user_text = text_input

        if not user_text.strip():
            raise HTTPException(status_code=400, detail="Input text is empty after processing.")

        # Get the simplified explanation from the LLM (this will be in Markdown format)
        simplified_text_md = ai_services.get_llm_response(user_text, SYSTEM_PROMPT)

        # Generate speech from the simplified text (before converting to HTML)
        output_audio_filename = ai_services.generate_speech(simplified_text_md, TEMP_DIR)

        # --- CONVERT MARKDOWN TO HTML --- # <--- NEW STEP
        simplified_text_html = markdown.markdown(simplified_text_md)

        return JSONResponse(content={
            # Send the HTML version to the frontend
            "simplified_text": simplified_text_html, # <--- MODIFIED THIS LINE
            "audio_filename": output_audio_filename
        })

    except Exception as e:
        # Generic error handler
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up the temporary uploaded audio file
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


@app.get("/api/audio/{filename}")
async def get_audio(filename: str):
    """Serves the generated audio files."""
    file_path = os.path.join(TEMP_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/wav")
    raise HTTPException(status_code=404, detail="Audio file not found.")