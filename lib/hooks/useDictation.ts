import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface DictationState {
  isListening: boolean;
  isProcessing: boolean;
  interimText: string;
  finalText: string;
  error: string | null;
}

export interface DictationOptions {
  language?: string;
  enableCleanup?: boolean;
  cleanupPrompt?: string;
  context?: string;
}

export function useDictation(options: DictationOptions = {}) {
  const {
    language = 'en-US',
    enableCleanup = true,
    cleanupPrompt,
    context
  } = options;

  const [state, setState] = useState<DictationState>({
    isListening: false,
    isProcessing: false,
    interimText: '',
    finalText: '',
    error: null
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser support for Web Speech API
  const isWebSpeechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const transcribeAndCleanup = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    if (enableCleanup) {
      formData.append('enableCleanup', 'true');
      if (cleanupPrompt) formData.append('cleanupPrompt', cleanupPrompt);
      if (context) formData.append('context', context);
    }

    const response = await fetch('/api/ai/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Transcription failed');
    }

    const data = await response.json();
    return data.text?.trim() || '';
  }, [enableCleanup, cleanupPrompt, context]);

  const startListening = useCallback(async () => {
    try {
      // Reset state
      setState(prev => ({
        ...prev,
        isListening: true,
        interimText: '',
        finalText: '',
        error: null
      }));

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Setup MediaRecorder for Whisper (accurate final transcription)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Setup Web Speech API for real-time interim results
      if (isWebSpeechSupported) {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();

          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = language;

          let accumulatedFinal = '';

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                accumulatedFinal += transcript + ' ';
              } else {
                interim = transcript;
              }
            }

            // Show accumulated final results + current interim
            const displayText = (accumulatedFinal + interim).trim();
            setState(prev => ({ ...prev, interimText: displayText }));
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.warn('[useDictation] Web Speech error:', event.error);
            // Don't fail - we still have MediaRecorder as backup
          };

          recognition.onend = () => {
            // Web Speech may auto-stop, restart if still listening
            if (recognitionRef.current && mediaRecorderRef.current?.state === 'recording') {
              try {
                recognition.start();
              } catch (e) {
                // Ignore restart errors
              }
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        }
      }

    } catch (error) {
      console.error('[useDictation] Start error:', error);
      setState(prev => ({
        ...prev,
        isListening: false,
        error: 'Failed to start dictation. Please check microphone permissions.'
      }));
    }
  }, [language, isWebSpeechSupported]);

  const stopListening = useCallback(async () => {
    setState(prev => ({ ...prev, isListening: false, isProcessing: true }));

    // Stop Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }

    // Stop MediaRecorder and wait for it to finish
    let audioBlob: Blob | null = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      audioBlob = await new Promise<Blob>((resolve) => {
        const recorder = mediaRecorderRef.current!;
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm'
          });
          resolve(blob);
        };
        recorder.stop();
      });
    }

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Transcribe with Whisper + optional Claude cleanup
    if (audioBlob && audioBlob.size > 0) {
      try {
        const transcribedText = await transcribeAndCleanup(audioBlob);
        setState(prev => ({
          ...prev,
          isProcessing: false,
          finalText: transcribedText,
          interimText: '' // Clear interim text
        }));
      } catch (error) {
        console.error('[useDictation] Transcription error:', error);
        // Fall back to interim text if transcription fails
        setState(prev => ({
          ...prev,
          isProcessing: false,
          finalText: prev.interimText, // Use Web Speech interim as fallback
          error: 'Transcription failed. Using interim text.'
        }));
      }
    } else {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        finalText: prev.interimText, // Use whatever Web Speech captured
        error: audioBlob ? null : 'No audio recorded.'
      }));
    }
  }, [transcribeAndCleanup]);

  const cancelListening = useCallback(() => {
    // Stop everything without transcribing
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState({
      isListening: false,
      isProcessing: false,
      interimText: '',
      finalText: '',
      error: null
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    ...state,
    isWebSpeechSupported,
    startListening,
    stopListening,
    cancelListening
  };
}
