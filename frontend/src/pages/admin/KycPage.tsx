import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export function AdminKycPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus] = useState('PENDING');

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>KYC Verification</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Review and approve user identification documents.</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading documents...</div>
      ) : (
        <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No KYC Documents</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            No KYC documents have been submitted yet. When users submit their identification documents for verification, they will appear here.
          </p>
        </Card>
      )}
    </div>
  );
}
