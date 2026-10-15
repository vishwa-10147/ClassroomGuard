import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { apiClient } from '@/services/api/client';
import { AuthLayout } from './LoginPage';

const MIN_PASSWORD_LENGTH = 8;

function Notice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-cg-severity-critical-border bg-cg-severity-critical-bg text-cg-status-error'
      : 'border-cg-border-default bg-cg-bg-tertiary text-cg-text-primary';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch {
      setError('Could not send the reset email. Check the address and try again in a minute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {sent ? (
        <div className="space-y-5">
          <Notice tone="success">
            If an account exists for <strong>{email}</strong>, a password reset link is on its way.
            The link is valid for one hour.
          </Notice>
          <Link to="/login" className="block text-center text-xs text-cg-text-secondary hover:text-cg-brand">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <p className="text-sm text-cg-text-secondary">
            Enter your account email and we will send you a link to choose a new password.
          </p>
          {error && <Notice tone="error">{error}</Notice>}
          <Input
            label="Email"
            type="email"
            placeholder="you@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            autoFocus
          />
          <Button type="submit" loading={loading} className="w-full h-10" size="lg">
            Send reset link
          </Button>
          <Link to="/login" className="block text-center text-xs text-cg-text-secondary hover:text-cg-brand">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch {
      setError('This reset link is invalid or has expired. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-5">
          <Notice tone="error">This reset link is incomplete. Request a new one.</Notice>
          <Link to="/forgot-password" className="block text-center text-xs text-cg-text-secondary hover:text-cg-brand">
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {done ? (
        <Notice tone="success">Your password was changed. Redirecting to sign in…</Notice>
      ) : (
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {error && <Notice tone="error">{error}</Notice>}
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            autoFocus
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
          <Button type="submit" loading={loading} className="w-full h-10" size="lg">
            Set new password
          </Button>
          {error && (
            <Link to="/forgot-password" className="block text-center text-xs text-cg-text-secondary hover:text-cg-brand">
              Request a new link
            </Link>
          )}
        </form>
      )}
    </AuthLayout>
  );
}
