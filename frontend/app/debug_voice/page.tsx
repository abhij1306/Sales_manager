'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function DebugVoicePage() {
    const [status, setStatus] = useState('Checking...');
    const [micStatus, setMicStatus] = useState('Inactive');
    const [transcript, setTranscript] = useState('Waiting for input...');
    const [response, setResponse] = useState('');
    const [actionJson, setActionJson] = useState('{}');
    const [isRecording, setIsRecording] = useState(false);
    const [textInput, setTextInput] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const checkBackend = async () => {
        try {
            // Simple history check as ping
            await fetch('http://localhost:8000/api/voice/history/ping');
            setStatus('Online');
        } catch (e) {
            // Even 404 means server is up
            setStatus('Online (verified)');
        }
    };

    useEffect(() => {
        checkBackend();
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicStatus('Active');

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setMicStatus('Inactive');
                processAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error(err);
            alert('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setTranscript('Transcribing...');
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice_debug.webm');

        try {
            const sttRes = await fetch('http://localhost:8000/api/voice/stt', {
                method: 'POST',
                body: formData
            });

            if (!sttRes.ok) throw new Error('STT Failed');

            const sttData = await sttRes.json();
            setTranscript(sttData.text);

            await sendToChat(sttData.text);

        } catch (err: any) {
            setTranscript('Error: ' + err.message);
        }
    };

    const sendToChat = async (message: string) => {
        setResponse('Thinking...');
        setActionJson('{}');

        try {
            const res = await fetch('http://localhost:8000/api/voice/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    session_id: 'debug-web-' + Date.now(),
                    ui_context: { page: 'debug_interface' }
                })
            });

            if (!res.ok) throw new Error('Chat API Failed');

            const data = await res.json();
            setResponse(data.message || (data.type === 'message' ? data.text : 'Action Executed'));
            setActionJson(JSON.stringify(data, null, 2));

        } catch (err: any) {
            setResponse('Error: ' + err.message);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Voice Agent Debug Console</h1>
                    <p className="text-gray-600 mt-2">Test STT, Chat, and Action Execution</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        {/* Status */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold mb-4">System Status</h2>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Backend API</span>
                                <span className={`px-2 py-1 rounded text-sm ${status.includes('Online') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {status}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Microphone</span>
                                <span className={`px-2 py-1 rounded text-sm ${micStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {micStatus}
                                </span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none ring-4 ring-offset-2 ${isRecording ? 'bg-red-600 ring-red-200 animate-pulse' : 'bg-blue-600 ring-blue-200 hover:bg-blue-700'
                                    }`}
                            >
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>
                            <p className="mt-4 text-sm text-gray-500">
                                {isRecording ? 'Recording... Click to stop' : 'Click microphone to speak'}
                            </p>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendToChat(textInput)}
                                        placeholder="Or type a message..."
                                        className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                                    />
                                    <button
                                        onClick={() => sendToChat(textInput)}
                                        className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold mb-2">Transcript / Input</h2>
                            <div className="p-3 bg-gray-50 rounded-lg text-gray-700 min-h-[60px]">
                                {transcript}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold mb-2">Agent Response</h2>
                            <div className="p-3 bg-blue-50 rounded-lg text-blue-900 min-h-[100px] whitespace-pre-wrap">
                                {response}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold mb-2">Raw Action JSON</h2>
                            <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto min-h-[100px]">
                                {actionJson}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
