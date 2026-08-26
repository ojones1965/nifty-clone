import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../lib/store';

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  function validate() {
    const errors = {};
    if (!name.trim()) errors.name = 'Please enter your name.';
    if (!email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = 'That doesn’t look like a valid email address.';
    }
    if (!password) {
      errors.password = 'Please choose a password.';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters.';
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await signUp({ name: name.trim(), email: email.trim(), password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Unable to create account.');
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

  return (
    <div className="auth-card">
      <h1>Create your account</h1>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form" noValidate>
        <label className="field">
          <span>Full Name *</span>
          <input
            required
            value={name}
            aria-invalid={Boolean(fieldErrors.name)}
            onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
            placeholder="Jane Doe"
          />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </label>
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
        <button type="submit" className="btn btn-primary btn-block">Sign up</button>
      </form>

      <div className="auth-links">
        <span>
          Already have an account? <Link to="/sign-in">Sign in</Link>
        </span>
      </div>
    </div>
  );
}
