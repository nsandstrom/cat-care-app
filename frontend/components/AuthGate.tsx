'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const TOKEN_KEY = 'hh_token';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  // null = still reading localStorage (avoid flash)
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthed(!!localStorage.getItem(TOKEN_KEY));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.authenticate(code);
      setAuthed(true);
    } catch {
      setError('Wrong code — try again.');
    } finally {
      setLoading(false);
    }
  }

  if (authed === null) return null;

  if (!authed) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--cream)', color: 'var(--brown)' }}
      >
        <div className="w-full max-w-xs">
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            Cat Care 🐱
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>
            Enter the household access code to continue.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              autoFocus
              autoComplete="current-password"
              className="rounded-xl border px-4 py-3 text-sm focus:outline-none"
              style={{
                borderColor: 'var(--soft)',
                background: 'var(--warm)',
                color: 'var(--brown)',
              }}
            />

            {error && (
              <p className="text-sm" style={{ color: 'var(--red)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !code}
              className="rounded-xl py-3 text-sm font-semibold text-white transition-opacity"
              style={{
                background: 'var(--accent)',
                opacity: loading || !code ? 0.5 : 1,
              }}
            >
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
