import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('US');
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword || !country) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!acceptedDisclaimer) {
      setError('You must accept the care disclaimer to register.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signUp({ email, password, name, country });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'UG', name: 'Uganda' },
    { code: 'KE', name: 'Kenya' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'IN', name: 'India' },
    { code: 'DE', name: 'Germany' },
  ];

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Logo size={48} />
          <h2 className="auth-logo" style={{ margin: 0 }}>Inzuma</h2>
        </div>
        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '-12px', marginBottom: '16px' }}>
          create a space for reflection
        </p>

        {error && (
          <div className="text-sm text-danger" style={{ textAlign: 'center', border: '1px solid rgba(224,82,82,0.3)', padding: '8px', borderRadius: 'var(--radius-input)', backgroundColor: 'rgba(224,82,82,0.05)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <Input
            type="text"
            label="Full Name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />

          <Input
            type="email"
            label="Email Address"
            placeholder="name@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />

          <div className="input-container">
            <label className="input-label">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                padding: '10px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-input)',
                width: '100%',
                outline: 'none'
              }}
            >
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          <label className="text-xs text-secondary flex items-start gap-sm mt-sm" style={{ cursor: 'pointer', lineHeight: '1.4' }}>
            <input
              type="checkbox"
              checked={acceptedDisclaimer}
              onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
              disabled={isLoading}
              style={{ accentColor: 'var(--accent)', marginTop: '2px' }}
            />
            <span>I understand that Inzuma is an AI reflection tool and is not a substitute for professional mental health care or clinical therapy.</span>
          </label>

          <Button type="submit" variant="primary" isLoading={isLoading} style={{ marginTop: '8px' }}>
            Register Account
          </Button>
        </form>

        <div className="auth-links" style={{ marginTop: 'var(--space-md)' }}>
          <div className="flex gap-xs justify-between text-xs">
            <span className="text-muted">Already have an account?</span>
            <Link to="/auth/login" style={{ fontWeight: '500' }}>Login here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
