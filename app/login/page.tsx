'use client';
import { useState, type FormEvent } from 'react';

const ALLOWED = ['/detection', '/evaluation'];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Sign-in failed. Please try again.');
      const requested = new URLSearchParams(window.location.search).get('return_to') || '';
      window.location.assign(ALLOWED.includes(requested) ? requested : '/detection');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="workspace shell" style={{ maxWidth: 520 }}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">OPERATOR ACCESS</span>
          <h1>Sign in<span>.</span></h1>
          <p>Only approved operators can upload footage and review evidence. Searching needs no account.</p>
        </div>
      </div>
      <form className="studio-sidebar" onSubmit={submit}>
        <div className="form-field">
          <label htmlFor="email">Operator email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="button primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {error && <div className="error-note" role="alert">{error}</div>}
        <p className="fineprint" style={{ marginTop: 14 }}><a href="/">Back to vehicle lookup</a></p>
      </form>
    </main>
  );
}
