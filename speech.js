// A reference to the speech recognition interface
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

// State to track if we are currently recording
let isRecording = false;

// Callbacks to communicate with other modules
let onTranscriptCallback;
let onStateChangeCallback;

// Check if the browser supports the Web Speech API
export function isSpeechRecognitionSupported() {
    return !!SpeechRecognition;
}

// Initialize the speech recognition engine
export function initializeSpeech(onTranscript, onStateChange) {
    if (!isSpeechRecognitionSupported()) {
        console.warn("Speech recognition not supported in this browser.");
        return;
    }

    onTranscriptCallback = onTranscript;
    onStateChangeCallback = onStateChange;

    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening even after a pause
    recognition.interimResults = true; // Get results as the user speaks

    // Event handler for when speech is recognized
    recognition.onresult = (event) => {
        let final_transcript = '';
        let interim_transcript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final_transcript += event.results[i][0].transcript;
            } else {
                interim_transcript += event.results[i][0].transcript;
            }
        }
        
        // Pass the final and interim transcripts to the callback
        if (onTranscriptCallback) {
            onTranscriptCallback(final_transcript, interim_transcript);
        }
    };

    // Event handler for when the recognition service ends
    recognition.onend = () => {
        if (isRecording) {
            // If it stopped unexpectedly, restart it
            recognition.start();
        } else {
            // Update the UI to show we are no longer recording
            if (onStateChangeCallback) {
                onStateChangeCallback(false);
            }
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        isRecording = false;
        if (onStateChangeCallback) {
            onStateChangeCallback(false);
        }
    };
}

// Function to start or stop the recording
export function toggleRecording() {
    if (!isSpeechRecognitionSupported()) return;

    isRecording = !isRecording;
    if (isRecording) {
        recognition.start();
    } else {
        recognition.stop();
    }

    if (onStateChangeCallback) {
        onStateChangeCallback(isRecording);
    }
}
