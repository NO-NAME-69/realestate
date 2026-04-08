import { useState, useEffect } from 'react';
import { Card, CardTitle } from '../../components/ui/Card';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  userId: string;
  user: { fullName: string; email: string };
  amount: number;
  type: string;
  status: string;
  referenceId: string | null;
  createdAt: string;
}

interface StatItem {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export function AdminGlobalWalletPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const res: any = await api.get(`/admin/transactions?type=${filterType}&status=${filterStatus}`);
        setTransactions(res.data || []);
        setStats(res.stats || []);
      } catch (error) {
        toast.error('Failed to load global transactions');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchTransactions();
  }, [filterType, filterStatus]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Wallet & Transactions</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>All financial movements across the platform</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((stat, i) => (
          <Card key={i} style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '1.5rem', background: 'rgba(255,255,255,0.05)'
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>
                {formatCurrency(stat.value)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <CardTitle style={{ margin: 0 }}>Transaction Ledger</CardTitle>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
            >
              <option value="ALL">All Types</option>
              <option value="WALLET_TOPUP">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="INVESTMENT_DEBIT">Investment</option>
            </select>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
            >
              <option value="ALL">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Txn ID</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>User</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Amount</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Type</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Date & Time</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Ref No.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading transactions...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No transactions found</td></tr>
              ) : (
                transactions.map(txn => (
                  <tr key={txn.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{txn.id}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{txn.user.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{txn.user.email}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: 600, color: ['WALLET_TOPUP','PROFIT_CREDIT','ADMIN_CREDIT','REFUND'].includes(txn.type) ? '#10b981' : '#ef4444' }}>
                      {['WALLET_TOPUP','PROFIT_CREDIT','ADMIN_CREDIT','REFUND'].includes(txn.type) ? '+' : '-'}{formatCurrency(txn.amount)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase',
                        background: txn.type.includes('TOPUP') ? 'rgba(37, 99, 235, 0.2)' : txn.type.includes('WITHDRAWAL') ? 'rgba(124, 58, 237, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: txn.type.includes('TOPUP') ? '#60a5fa' : txn.type.includes('WITHDRAWAL') ? '#a78bfa' : '#fbbf24'
                      }}>
                        {txn.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600,
                        background: txn.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : txn.status === 'FAILED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: txn.status === 'COMPLETED' ? '#10b981' : txn.status === 'FAILED' ? '#ef4444' : '#fbbf24'
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {txn.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {txn.referenceId || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
