import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="auth-card">
      <h1>Reset password</h1>
      {sent ? (
        <p className="auth-note">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
          (This is a local demo, so no email is actually sent.)
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Email Address *</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block">Send reset link</button>
        </form>
      )}
      <div className="auth-links">
        <Link to="/sign-in">Back to sign in</Link>
      </div>
    </div>
  );
}
