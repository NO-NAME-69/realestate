import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function AdminReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const generateReport = async (type: string) => {
    setGenerating(type);
    try {
      if (type === 'users') {
        const res: any = await api.get('/admin/users?limit=200');
        const users = res.data || [];
        const csv = 'Name,Email,Mobile,Role,Status,Created\n' + users.map((u: any) =>
          `"${u.fullName}","${u.email}","${u.mobile}","${u.role}","${u.status}","${new Date(u.createdAt).toLocaleDateString()}"`
        ).join('\n');
        downloadCSV('users_report.csv', csv);
      } else if (type === 'transactions') {
        const res: any = await api.get('/admin/transactions?limit=200');
        const txns = res.data || [];
        const csv = 'ID,User,Amount,Type,Status,Date\n' + txns.map((t: any) =>
          `"${t.id}","${t.user.fullName}","${t.amount}","${t.type}","${t.status}","${new Date(t.createdAt).toLocaleDateString()}"`
        ).join('\n');
        downloadCSV('transactions_report.csv', csv);
      } else if (type === 'ledger') {
        const res: any = await api.get('/admin/ledger');
        const entries = res.data || [];
        const csv = 'Owner,Email,Project,Plot,Sqft,Value,Ownership%,Date\n' + entries.map((e: any) =>
          `"${e.user.fullName}","${e.user.email}","${e.project.name}","${e.plots.join(' ')}","${e.totalSqft}","${e.purchaseValue}","${e.ownershipPercentage}%","${new Date(e.registeredAt).toLocaleDateString()}"`
        ).join('\n');
        downloadCSV('ownership_ledger.csv', csv);
      } else if (type === 'plots') {
        const res: any = await api.get('/admin/plots?limit=200');
        const plots = res.data || [];
        const csv = 'Plot No,Project,Size (sqft),Price,Type,Status\n' + plots.map((p: any) =>
          `"${p.plotNumber}","${p.project.name}","${p.sizeSqft}","${p.price}","${p.type}","${p.status}"`
        ).join('\n');
        downloadCSV('plots_report.csv', csv);
      } else if (type === 'sales') {
        const res: any = await api.get('/admin/sales');
        const sales = res.data || [];
        const csv = 'Buyer,Plot,Base Price,Final Price,Payment Status,Date\n' + sales.map((s: any) =>
          `"${s.buyerName}","${s.plotNumber}","${s.basePrice}","${s.finalPrice}","${s.paymentStatus}","${new Date(s.createdAt).toLocaleDateString()}"`
        ).join('\n');
        downloadCSV('sales_report.csv', csv);
      } else if (type === 'audit') {
        const res: any = await api.get('/admin/audit-logs?limit=200');
        const logs = res.data || [];
        const csv = 'Event,Actor Role,Target Type,IP Address,Result,Date\n' + logs.map((l: any) =>
          `"${l.eventType}","${l.actorRole || 'SYSTEM'}","${l.targetType || ''}","${l.ipAddress || ''}","${l.result}","${new Date(l.createdAt).toLocaleString()}"`
        ).join('\n');
        downloadCSV('audit_logs.csv', csv);
      }
      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const reports = [
    {
      title: 'User Report',
      desc: 'All registered users, roles, and activation status',
      icon: '👥',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      type: 'users'
    },
    {
      title: 'Transaction Report',
      desc: 'All deposits, withdrawals, and payment records',
      icon: '💶',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      type: 'transactions'
    },
    {
      title: 'Ownership Ledger',
      desc: 'Complete ownership registry with plot allocations',
      icon: '🏛️',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
      type: 'ledger'
    },
    {
      title: 'Plot Status Report',
      desc: 'Available, held, and sold plots per project',
      icon: '🗺️',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      type: 'plots'
    },
    {
      title: 'Sales & Revenue',
      desc: 'Revenue collected, pending, and project-wise breakdown',
      icon: '📈',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      type: 'sales'
    },
    {
      title: 'Audit Logs',
      desc: 'Security events and system operation records',
      icon: '✅',
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.1)',
      type: 'audit'
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Reports & Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Generate and download platform reports</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {reports.map((report, i) => (
          <Card key={i} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', background: report.bg, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                flexShrink: 0
              }}>
                {report.icon}
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{report.title}</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{report.desc}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
              <Button 
                variant="outline" 
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem' }}
                onClick={() => generateReport(report.type)}
                disabled={generating === report.type}
              >
                {generating === report.type ? '⏳ Generating...' : '📊 Download CSV'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
