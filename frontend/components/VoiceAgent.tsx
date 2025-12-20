'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, X, Loader2, Volume2, Check, AlertTriangle } from 'lucide-react';
import { uiContext } from '@/lib/uiContext';
import { tts } from '@/lib/tts';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'text' | 'confirm' | 'error';
    data?: any;
    isStreaming?: boolean;
}

interface VoiceAgentProps {
    sessionId?: string;
    onAction?: (action: any) => void;
}

export function VoiceAgent({ sessionId, onAction }: VoiceAgentProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [transcript, setTranscript] = useState('');
    const [currentSessionId, setCurrentSessionId] = useState(sessionId || `session-${Date.now()}`);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const streamRef = useRef<EventSource | null>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, transcript]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            tts.stop(); // Stop any speech when recording starts

        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Microphone access denied. Please enable microphone permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const sttResponse = await fetch('http://localhost:8000/api/voice/stt', {
                method: 'POST',
                body: formData
            });

            if (!sttResponse.ok) throw new Error('Speech-to-text failed');

            const { text } = await sttResponse.json();
            setTranscript(text);

            // Add user message immediately
            addMessage('user', text);

            // Send to chat
            await streamChat(text);

        } catch (error) {
            console.error('Processing error:', error);
            addMessage('assistant', 'Sorry, I couldn\'t hear that clearly.', 'error');
        } finally {
            setIsProcessing(false);
            setTranscript('');
        }
    };

    const streamChat = async (message: string) => {
        setIsProcessing(true);
        const assistantMsgId = Date.now().toString();

        // Add placeholder for streaming message
        setMessages(prev => [...prev, {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
        }]);

        try {
            const context = uiContext.getContext();
            const response = await fetch('http://localhost:8000/api/voice/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    session_id: currentSessionId,
                    ui_context: context
                })
            });

            if (!response.ok) throw new Error("Chat API failed");

            const result = await response.json();

            // Update the placeholder with full content
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                    ? {
                        ...msg,
                        content: result.message || (result.type === 'message' ? result.text : "Action executed"),
                        isStreaming: false,
                        type: result.type === 'confirm' ? 'confirm' : (result.type === 'error' ? 'error' : 'text'),
                        data: result
                    }
                    : msg
            ));

            // Handle TTS
            if (result.tts_text || result.message) {
                tts.speak(result.tts_text || result.message);
            }

            // Execute immediate non-confirm actions
            if (result.type !== 'confirm' && result.type !== 'message' && result.type !== 'error') {
                if (onAction) onAction(result);
            }

        } catch (error) {
            console.error("Chat Error", error);
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                    ? { ...msg, content: "Sorry, connection failed.", type: 'error', isStreaming: false }
                    : msg
            ));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = async (originalAction: any) => {
        // Execute the confirmed action
        try {
            setIsProcessing(true);
            const actionType = originalAction.confirm.action;
            const actionData = originalAction.confirm.data;

            const response = await fetch(`http://localhost:8000/api/voice/confirm/${actionType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actionData)
            });

            if (!response.ok) throw new Error("Action failed");

            const result = await response.json();
            addMessage('assistant', result.message || "Action completed successfully.");
            tts.speak(result.message || "Action completed.");

            if (onAction) onAction({ type: 'refresh', ...result });

        } catch (e) {
            addMessage('assistant', "Failed to execute action.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const addMessage = (role: 'user' | 'assistant', content: string, type: 'text' | 'confirm' | 'error' = 'text', data?: any) => {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role,
            content,
            timestamp: new Date(),
            type,
            data
        }]);
    };

    const sendTextMessage = async () => {
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText('');
        addMessage('user', text);
        await streamChat(text);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center z-50 hover:scale-105"
                title="Open Voice Assistant"
            >
                <Mic className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
                <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold tracking-wide">AI Assistant</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => tts.stop()} className="p-1 hover:bg-white/20 rounded" title="Stop speaking">
                        <Volume2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center ring-4 ring-blue-100">
                            <Mic className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-gray-900">How can I help?</p>
                            <p className="text-sm mt-1">"Create DC using this PO"</p>
                            <p className="text-sm">"Show me pending orders"</p>
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                            }`}>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                            {/* Confirmation Card */}
                            {msg.type === 'confirm' && msg.data?.confirm && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 mb-3">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                                            <div className="text-xs text-yellow-800">
                                                <p className="font-medium mb-1">Verify Action:</p>
                                                <ul className="list-disc pl-4 space-y-1">
                                                    <li>{msg.data.confirm.message}</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleConfirm(msg.data)}
                                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700 rounded-md flex items-center gap-1.5 transition-colors shadow-sm"
                                        >
                                            <Check className="w-3 h-3" />
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}

                {isProcessing && !messages.some(m => m.isStreaming) && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 border-gray-200 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        disabled={isProcessing}
                    />

                    {inputText.trim() ? (
                        <button
                            onClick={sendTextMessage}
                            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md transition-all hover:scale-105 active:scale-95"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-2.5 rounded-full transition-all shadow-md hover:scale-105 active:scale-95 ${isRecording
                                    ? 'bg-red-500 text-white hover:bg-red-600 ring-4 ring-red-100'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {isRecording ? <div className="w-5 h-5 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-white rounded-sm animate-pulse" /></div> : <Mic className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

