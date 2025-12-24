'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass/GlassCard';
import { GlassInput } from '@/components/ui/glass/GlassInput';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { Layers } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/token`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      document.cookie = `token=${data.access_token}; path=/`; // For middleware if needed

      router.push('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
      </div>

      <GlassCard className="w-full max-w-md relative z-10 backdrop-blur-xl bg-white/40 border-white/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Layers className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SenstoSales</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <GlassInput
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
          <GlassInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center border border-red-100">
              {error}
            </div>
          )}

          <GlassButton
            type="submit"
            className="w-full mt-2"
            loading={loading}
          >
            Sign In
          </GlassButton>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Internal System • Authorized Personnel Only
        </div>
      </GlassCard>
    </div>
  );
}
