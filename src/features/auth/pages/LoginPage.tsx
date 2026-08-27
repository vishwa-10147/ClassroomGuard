import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { Button, Input, StatusIndicator } from '@/components/ui';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-cg-severity-critical-border bg-cg-severity-critical-bg px-4 py-3 text-sm text-cg-status-error"
        >
          {error}
        </div>
      )}

      <Input
        label="Email or Username"
        type="email"
        placeholder="admin@university.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
        autoComplete="email"
        autoFocus
      />

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
        autoComplete="current-password"
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-cg-text-tertiary hover:text-cg-text-secondary transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
      />

      <Button
        type="submit"
        loading={isLoading}
        className="w-full h-10"
        size="lg"
      >
        Sign In
      </Button>

      <div className="text-center">
        <button
          type="button"
          className="text-xs text-cg-text-secondary hover:text-cg-brand transition-colors"
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cg-bg-primary p-4">
      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #8B95A8 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-cg-brand-subtle p-3">
            <Shield className="h-8 w-8 text-cg-brand" />
          </div>
          <h1 className="text-2xl font-semibold text-cg-text-primary">
            ClassroomGuard
          </h1>
          <p className="mt-1.5 text-sm text-cg-text-secondary">
            AI-Powered Classroom Intelligence
          </p>
        </div>

        {/* Login card */}
        <div className="card p-6">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-cg-text-tertiary">
          <StatusIndicator status="online" label="System Online" size="sm" />
          <span className="text-cg-border-strong">·</span>
          <span className="font-mono">v2.4.1</span>
        </div>
      </div>
    </div>
  );
}
