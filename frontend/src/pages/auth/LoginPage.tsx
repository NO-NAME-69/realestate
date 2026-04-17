import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api, ApiError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post<{ data: { accessToken: string; user: any } }>('/auth/login', {
        data: { identifier, password },
      });
      
      login(res.data.accessToken, res.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Invalid email/mobile or password. Please try again.');
        } else if (err.status === 403) {
          setError('Your account is suspended. Please contact support.');
        } else if (err.status === 429) {
          setError('Too many login attempts. Please wait a moment and try again.');
        } else if (err.status >= 500) {
          setError('Our servers are temporarily unavailable. Please try again shortly.');
        } else {
          setError(err.message || 'Login failed. Please try again.');
        }
      } else {
        setError('Unable to reach the server. Please check your internet connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card glass hover>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Sign in to your investment dashboard
        </p>
      </CardHeader>
      
      <CardBody>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ 
              padding: '0.75rem 1rem', 
              backgroundColor: 'var(--danger-bg)', 
              color: 'var(--danger)', 
              borderRadius: 'var(--border-radius)', 
              fontSize: '0.875rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              lineHeight: 1.5
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
              {error}
            </div>
          )}
          
          <Input 
            label="Email or Mobile" 
            type="text" 
            placeholder="Enter your email or 10-digit mobile"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            leftIcon={<Mail size={18} />}
          />
          
          <Input 
            label="Password" 
            type="password" 
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            leftIcon={<Lock size={18} />}
          />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.875rem' }}>
              Forgot password?
            </Link>
          </div>
          
          <Button type="submit" fullWidth isLoading={isLoading}>
            Sign In
          </Button>
        </form>
      </CardBody>
      
      <CardFooter style={{ justifyContent: 'center', gap: '0.5rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Don't have an account?</span>
        <Link to="/register">Create Account</Link>
      </CardFooter>
    </Card>
  );
}
