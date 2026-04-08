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
        setError(err.message);
      } else {
        setError('Failed to connect to server');
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
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--border-radius)', fontSize: '0.875rem' }}>
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
