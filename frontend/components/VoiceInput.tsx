"use client";

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Send } from 'lucide-react';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    onCommand: (command: string) => Promise<void>;
    isProcessing?: boolean;
}

/**
 * Voice Input Component
 * Handles voice recording, transcription, and command processing
 */
export function VoiceInput({ onTranscript, onCommand, isProcessing = false }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Initialize Web Speech API
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                let interim = '';
                let final = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPart = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        final += transcriptPart + ' ';
                    } else {
                        interim += transcriptPart;
                    }
                }

                if (final) {
                    setTranscript(prev => prev + final);
                    onTranscript(final.trim());
                }
                setInterimTranscript(interim);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onTranscript]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser. Please use Chrome.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            setInterimTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleSend = async () => {
        if (!transcript.trim()) return;

        const command = transcript.trim();
        setTranscript('');
        setInterimTranscript('');

        await onCommand(command);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-96">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Voice Assistant</h3>
                    <button
                        onClick={toggleListening}
                        disabled={isProcessing}
                        className={`p-3 rounded-full transition-all ${isListening
                                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                : 'bg-primary hover:bg-blue-700'
                            } text-white disabled:opacity-50`}
                    >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                </div>

                {/* Transcript Display */}
                <div className="min-h-[80px] max-h-[200px] overflow-y-auto mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {transcript || interimTranscript ? (
                        <p className="text-sm text-gray-800">
                            {transcript}
                            {interimTranscript && (
                                <span className="text-gray-400 italic">{interimTranscript}</span>
                            )}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400 italic">
                            {isListening ? 'Listening...' : 'Click the microphone to start'}
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleSend}
                        disabled={!transcript.trim() || isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Execute
                            </>
                        )}
                    </button>
                </div>

                {/* Status Indicator */}
                {isListening && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Recording...
                    </div>
                )}
            </div>
        </div>
    );
}
