# backend/ai_services.py

import os
import uuid
import openai
from faster_whisper import WhisperModel
import pyttsx3  # <-- CHANGED IMPORT

# --- MODEL INITIALIZATION (runs once on startup) ---
print("Loading AI models...")
stt_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")

# --- Initialize the new TTS engine ---
tts_engine = pyttsx3.init()
print("AI models loaded successfully.")

# --- OLLAMA CLIENT INITIALIZATION ---
ollama_client = openai.OpenAI(
    base_url='http://127.0.0.1:11434/v1',
    api_key='ollama'
)

# --- SERVICE FUNCTIONS ---

def transcribe_audio(audio_path: str) -> str:
    """Transcribes audio file to text using Whisper."""
    segments, _ = stt_model.transcribe(audio_path, beam_size=5)
    transcribed_text = "".join([segment.text for segment in segments])
    print(f"Transcription complete: {transcribed_text}")
    return transcribed_text

def get_llm_response(text: str, system_prompt: str) -> str:
    """Gets a response from the Ollama LLM."""
    print("Sending text to LLM...")
    try:
        response = ollama_client.chat.completions.create(
            model="llama3.2",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.1,
        )
        llm_text = response.choices[0].message.content
        print("LLM response received.")
        return llm_text
    except Exception as e:
        print(f"Error communicating with Ollama: {e}")
        return "Error: Could not get a response from the language model."

# v-- THIS ENTIRE FUNCTION IS REPLACED --v
def generate_speech(text: str, output_dir: str) -> str:
    """Generates speech from text using pyttsx3 and returns the file path."""
    print("Generating speech with pyttsx3...")
    
    text_to_speak = text.split("Disclaimer:")[0].strip()
    
    output_filename = f"{uuid.uuid4()}.wav"
    output_path = os.path.join(output_dir, output_filename)
    
    # Use the engine to save the speech to a file
    tts_engine.save_to_file(text_to_speak, output_path)
    # This is crucial: it processes the command queue
    tts_engine.runAndWait()
    
    print(f"Speech generated at {output_path}")
    return output_filename
# ^-- THIS ENTIRE FUNCTION IS REPLACED --^