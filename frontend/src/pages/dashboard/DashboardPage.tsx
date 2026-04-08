import React from 'react';
import { useAuth } from '../../lib/auth';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.fullName || 'Investor'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Available Balance</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>₹0.00</div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Invested</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>₹0.00</div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total ROI</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>+₹0.00</div>
          </CardBody>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
            No recent activity found.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
