import { useState } from 'react';

// Login form for both students and admins
function LoginForm({ initialEmail = '', onLogin, onCancel }) {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sends the details up to App.jsx, which returns an error message or null
  async function handleSubmit(event) {
    event.preventDefault();
    if (email.trim() === '' || password === '') {
      setError('Enter your email and password');
      return;
    }

    setError('');
    setSubmitting(true);
    const errorMessage = await onLogin({ role, email: email.trim(), password });
    setSubmitting(false);
    if (errorMessage) {
      setError(errorMessage);
    }
  }

  return (
    <section className="card">
      <h2>Log in</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="role-switch" role="radiogroup" aria-label="Log in as">
          {['student', 'admin'].map((option) => (
            <label key={option} className={role === option ? 'active' : ''}>
              <input
                type="radio"
                name="role"
                value={option}
                checked={role === option}
                onChange={() => setRole(option)}
              />
              {option === 'student' ? 'Student' : 'Admin'}
            </label>
          ))}
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export default LoginForm;
