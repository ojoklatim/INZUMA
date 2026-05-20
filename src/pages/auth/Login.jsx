import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { insforge } from '../../lib/insforge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

import Logo from '../../components/ui/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await signIn(email, password);
      if (!data?.user) {
        throw new Error('Authentication failed.');
      }

      // Query database user role directly for immediate redirect
      const { data: userProfile, error: dbError } = await insforge.database
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
      
      const userRole = userProfile?.role || 'user';
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'professional') {
        navigate('/professional');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid email or password.');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Logo size={48} />
          <h2 className="auth-logo" style={{ margin: 0 }}>Inzuma</h2>
        </div>
        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '-12px', marginBottom: '16px' }}>
          a space for reflection
        </p>

        {error && (
          <div className="text-sm text-danger" style={{ textAlign: 'center', border: '1px solid rgba(224,82,82,0.3)', padding: '8px', borderRadius: 'var(--radius-input)', backgroundColor: 'rgba(224,82,82,0.05)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <Input
            type="email"
            label="Email Address"
            placeholder="name@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />

          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          <Button type="submit" variant="primary" isLoading={isLoading} style={{ marginTop: '8px' }}>
            Sign In
          </Button>
        </form>

        <div className="auth-links">
          <Link to="/auth/forgot-password">Forgot password?</Link>
          <div className="flex gap-xs justify-between mt-sm text-xs">
            <span className="text-muted">Need a standard account?</span>
            <Link to="/auth/register" style={{ fontWeight: '500' }}>Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
