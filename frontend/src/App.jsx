import React, { useState, useRef } from 'react';
import './LegalSimplifier.css';

const App = () => {
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  const API_URL = 'http://127.0.0.1:8000';

  // Handle text input submission
  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      alert('Please enter some text.');
      return;
    }
    
    console.log('Sending text:', textInput);
    await sendData({ text_input: textInput });
  };

  // Start audio recording
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support audio recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorderRef.current.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendData({ audio_file: audioBlob });
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus('Recording audio...');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access the microphone.');
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setStatus('');
  };

  // Send data to backend
  const sendData = async (data) => {
    console.log('sendData called with:', data);
    
    setStatus('Processing... Please wait.');
    setResult(null);
    setIsProcessing(true);

    const formData = new FormData();
    if (data.text_input) {
      formData.append('text_input', data.text_input);
      console.log('Added text_input to formData:', data.text_input);
    } else if (data.audio_file) {
      formData.append('audio_file', data.audio_file, 'recording.webm');
      console.log('Added audio_file to formData');
    }

    console.log('About to send request to:', `${API_URL}/api/simplify`);

    try {
      const response = await fetch(`${API_URL}/api/simplify`, {
        method: 'POST',
        mode: 'cors',
        body: formData,
      });

      console.log('Response received:', response);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.detail || 'An unknown error occurred.');
        } catch (parseError) {
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
      }

      const responseData = await response.json();
      console.log('Parsed result:', responseData);
      
      setResult(responseData);
      setStatus('');
    } catch (error) {
      console.error('Full error details:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle audio playback
  const handleAudioPlay = (audioFilename) => {
    const audioUrl = `${API_URL}/api/audio/${audioFilename}`;
    console.log('Audio URL:', audioUrl);
    
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      alert('Error playing audio. Please try again.');
    });
  };

  return (
    <div className="app-container">
      <div className="main-wrapper">
        
        {/* Header */}
        <div className="header">
          <h1>AI Legal Simplifier ⚖️</h1>
          <p>Get clear explanations for complex legal text. Input text or record your voice.</p>
        </div>

        {/* Input Area */}
        <div className="input-area">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste or type legal text here..."
            className="text-input"
          />
          
          <div className="button-group">
            <button
              onClick={handleTextSubmit}
              disabled={isProcessing}
              className={`btn btn-primary ${isProcessing ? 'disabled' : ''}`}
            >
              {isProcessing ? 'Processing...' : 'Simplify Text'}
            </button>
            
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className={`btn btn-success ${isProcessing ? 'disabled' : ''}`}
              >
                🎤 Record Audio
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="btn btn-danger"
              >
                ⏹️ Stop Recording
              </button>
            )}
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div className={`status-message ${status.startsWith('Error') ? 'error' : ''}`}>
            {status}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="results-container">
            {/* Text Output */}
            {result.simplified_text && (
              <div className="result-section">
                <h3>Simplified Explanation:</h3>
                <div
                  className="text-output"
                  dangerouslySetInnerHTML={{ __html: result.simplified_text }}
                />
              </div>
            )}

            {/* Audio Output */}
            {result.audio_filename && (
              <div className="result-section">
                <h3>Audio Summary:</h3>
                <button
                  onClick={() => handleAudioPlay(result.audio_filename)}
                  className="btn btn-info"
                >
                  🔊 Listen to Summary
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;