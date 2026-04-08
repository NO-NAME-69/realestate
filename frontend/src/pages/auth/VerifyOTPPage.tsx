import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Safely get state ignoring TS errors on unknown type
  const state = location.state as { mobile?: string; isRegistration?: boolean } | null;
  const mobile = state?.mobile;

  useEffect(() => {
    if (!mobile) {
      toast.error('Mobile number required for verification');
      navigate('/login');
    }
  }, [mobile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/verify-otp', {
        data: { mobile, otp },
      });
      
      toast.success('Mobile number verified successfully!');
      navigate('/login'); // Redirect to login after successful OTP verification
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to verify OTP');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!mobile) return null;

  return (
    <Card glass hover>
      <CardHeader>
        <CardTitle>Verify Mobile</CardTitle>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          We sent a 6-digit code to {mobile}
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
            label="Verification Code" 
            type="text" 
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            style={{ letterSpacing: '8px', fontSize: '1.25rem', textAlign: 'center' }}
            leftIcon={<KeyRound size={18} />}
          />
          
          <Button type="submit" fullWidth isLoading={isLoading} disabled={otp.length !== 6}>
            Verify Code
          </Button>
        </form>
      </CardBody>
      
      <CardFooter style={{ justifyContent: 'center' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
          Back to Login
        </Button>
      </CardFooter>
    </Card>
  );
}
