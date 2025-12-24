'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GlassCard } from '@/components/ui/glass/GlassCard';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

export default function SRVPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('idle');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Call standard fetch because our api lib might not have this specific endpoint yet
      // Or we can extend api lib. Let's assume we use fetch for now for speed.
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/srv/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      // Auto-save logic would go here, or we present data for review.
      // For now, let's just create it directly with the scraped data

      const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/srv/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!createRes.ok) throw new Error('Creation failed');

      setStatus('success');
      setMessage(`Successfully processed SRV: ${data.srv_number}`);
      setFile(null);
    } catch (e) {
      setStatus('error');
      setMessage('Failed to process SRV. Please check the file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">SRV Management</h1>
        <p className="text-gray-500">Upload and manage Store Receipt Vouchers</p>
      </div>

      <GlassCard className="max-w-xl mx-auto text-center py-12">
        <div
          className={`
            border-2 border-dashed rounded-xl p-10 transition-all
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${file ? 'bg-green-50 border-green-500' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {status === 'success' ? (
            <div className="flex flex-col items-center text-green-600">
              <CheckCircle className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-medium">{message}</h3>
              <GlassButton variant="ghost" className="mt-4" onClick={() => setStatus('idle')}>
                Upload Another
              </GlassButton>
            </div>
          ) : (
            <>
              <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${file ? 'text-green-500' : 'text-gray-400'}`} />

              {file ? (
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500 mb-6">Ready to process</p>
                  <GlassButton onClick={handleUpload} loading={uploading}>
                    Process SRV
                  </GlassButton>
                  <GlassButton variant="ghost" className="ml-2" onClick={() => setFile(null)}>
                    Cancel
                  </GlassButton>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900">Drop SRV HTML file here</p>
                  <p className="text-sm text-gray-500 mt-1 mb-6">or click to browse</p>
                  <input
                    type="file"
                    className="hidden"
                    id="file-upload"
                    accept=".html"
                    onChange={(e) => e.target.files && setFile(e.target.files[0])}
                  />
                  <label htmlFor="file-upload">
                    <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                      Browse Files
                    </span>
                  </label>
                </div>
              )}
            </>
          )}

          {status === 'error' && (
             <div className="mt-6 flex items-center justify-center text-red-600 bg-red-50 p-3 rounded-lg">
               <AlertTriangle className="w-4 h-4 mr-2" />
               {message}
             </div>
          )}
        </div>
      </GlassCard>
    </DashboardLayout>
  );
}
