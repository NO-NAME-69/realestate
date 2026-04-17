import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    address: '',
    referral_code: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear specific field error on type
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    }
    if (error) setError(null);
  };

  // Real-time check: is email/mobile already taken?
  const checkField = async (field: 'email' | 'mobile', value: string) => {
    if (!value.trim()) return;
    // Basic format validation before hitting the API
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    if (field === 'mobile' && !/^\d{10}$/.test(value)) return;

    try {
      const res = await api.get<{ data: { available: boolean } }>(
        `/auth/check-availability?field=${field}&value=${encodeURIComponent(value.trim())}`
      );
      if (!res.data.available) {
        setFieldErrors(prev => ({
          ...prev,
          [field]: `This ${field} is already registered. Please sign in.`,
        }));
      }
    } catch {
      // silently ignore — the full validation happens on submit
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const payload = { ...formData };
      if (!payload.referral_code) payload.referral_code = undefined as any;
      if (!payload.address) payload.address = undefined as any;

      const res = await api.post<{ data: { userId: string, message: string } }>('/auth/register', {
        data: payload,
      });
      
      toast.success(res.data.message);
      
      // Pass mobile to OTP verification step
      navigate('/verify-otp', { state: { mobile: formData.mobile, isRegistration: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) {
          setFieldErrors(err.fields);
          setError('Please fix the highlighted fields below.');
        } else if (err.status === 409) {
          // Duplicate email/mobile
          setError('This email or mobile number is already registered. Please sign in instead.');
        } else if (err.status === 422) {
          setError(err.message || 'Please check your inputs and try again.');
        } else if (err.status === 429) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else if (err.status >= 500) {
          setError('Our servers are temporarily unavailable. Please try again shortly.');
        } else {
          setError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setError('Unable to reach the server. Please check your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card glass hover>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Join the premium property investment platform
        </p>
      </CardHeader>
      
      <CardBody>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ 
              padding: '0.75rem 1rem', 
              backgroundColor: 'var(--danger-bg)', 
              color: 'var(--danger)', 
              borderRadius: 'var(--border-radius)', 
              fontSize: '0.875rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              lineHeight: 1.5
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>⚠</span>
              <span>
                {error}
                {error.includes('already registered') && (
                  <> <Link to="/login" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>Sign In →</Link></>
                )}
              </span>
            </div>
          )}
          
          <Input 
            name="full_name"
            label="Full Name" 
            type="text" 
            placeholder="e.g. John Doe"
            value={formData.full_name}
            onChange={handleChange}
            error={fieldErrors.full_name}
            required
            leftIcon={<User size={18} />}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input 
              name="email"
              label="Email Address" 
              type="email" 
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => checkField('email', formData.email)}
              error={fieldErrors.email}
              required
              leftIcon={<Mail size={18} />}
            />
            
            <Input 
              name="mobile"
              label="Mobile Number" 
              type="tel" 
              placeholder="e.g. 9876543210"
              value={formData.mobile}
              onChange={handleChange}
              onBlur={() => checkField('mobile', formData.mobile)}
              error={fieldErrors.mobile}
              required
              leftIcon={<Phone size={18} />}
            />
          </div>
          
          <Input 
            name="password"
            label="Password" 
            type="password" 
            placeholder="Secure password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
            leftIcon={<Lock size={18} />}
          />
          
          <Input 
            name="address"
            label="Address (Optional)" 
            type="text" 
            placeholder="City, State"
            value={formData.address}
            onChange={handleChange}
            error={fieldErrors.address}
            leftIcon={<MapPin size={18} />}
          />
          
          <Input 
            name="referral_code"
            label="Referral Code (Optional)" 
            type="text" 
            placeholder="e.g. RP0123A"
            value={formData.referral_code}
            onChange={handleChange}
            error={fieldErrors.referral_code}
          />
          
          <Button type="submit" fullWidth isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
            Create Account
          </Button>
        </form>
      </CardBody>
      
      <CardFooter style={{ justifyContent: 'center', gap: '0.5rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Already have an account?</span>
        <Link to="/login">Sign In</Link>
      </CardFooter>
    </Card>
  );
}
