import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/store';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.05 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errors = {};
    if (!email.trim()) errors.email = 'Please enter your email address.';
    if (!password) errors.password = 'Please enter your password.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await signIn({ email: email.trim(), password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    }
  }

  function clearFieldError(field) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // No real Google OAuth in a local demo — this signs in a demo account
  // (creating it on first use) so the button still does something useful.
  async function handleGoogle() {
    const demo = { name: 'Demo User', email: 'demo@flow.local', password: 'demo' };
    try {
      await signIn(demo);
    } catch {
      await signUp(demo);
    }
    navigate('/');
  }

  return (
    <div className="auth-card">
      <h1>Sign in</h1>

      <button type="button" className="btn btn-google" onClick={handleGoogle}>
        <GoogleIcon />
        Sign in with Google
      </button>

      <div className="divider"><span>or</span></div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form" noValidate>
        <label className="field">
          <span>Email Address *</span>
          <input
            type="email"
            required
            value={email}
            aria-invalid={Boolean(fieldErrors.email)}
            onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
            placeholder="you@example.com"
          />
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </label>
        <label className="field">
          <span>Password *</span>
          <input
            type="password"
            required
            value={password}
            aria-invalid={Boolean(fieldErrors.password)}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
            placeholder="••••••••"
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>
        <button type="submit" className="btn btn-primary btn-block">Sign in</button>
      </form>

      <div className="auth-links">
        <Link to="/forgot-password">Forgot password?</Link>
        <span>
          Don&apos;t have an account? <Link to="/sign-up">Sign up</Link>
        </span>
      </div>
    </div>
  );
}
