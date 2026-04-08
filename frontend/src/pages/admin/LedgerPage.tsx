import { useState, useEffect } from 'react';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

interface LedgerEntry {
  id: string;
  userId: string;
  user: { fullName: string; email: string };
  projectId: string;
  project: { name: string; totalAreaSqft: number };
  plots: string[];
  totalSqft: number;
  purchaseValue: number;
  ownershipPercentage: number;
  registeredAt: string;
}

export function AdminLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalOwners: 0, totalPlots: 0, totalValue: 0 });

  useEffect(() => {
    const fetchLedger = async () => {
      setIsLoading(true);
      try {
        const res: any = await api.get('/admin/ledger');
        setEntries(res.data || []);
        setStats(res.stats || { totalOwners: 0, totalPlots: 0, totalValue: 0 });
      } catch (error) {
        toast.error('Failed to load ledger entries');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchLedger();
  }, []);

  const filteredEntries = entries.filter(e =>
    e.user.fullName.toLowerCase().includes(search.toLowerCase()) || e.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const summaryCards = [
    { label: 'Total Owners', value: stats.totalOwners.toLocaleString(), prefix: '' },
    { label: 'Total Plots Owned', value: stats.totalPlots.toLocaleString(), prefix: '' },
    { label: 'Total Registered Value', value: formatCurrency(stats.totalValue), prefix: '' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Ownership Ledger</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Comprehensive record of all property ownership across projects</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {summaryCards.map((stat, i) => (
          <Card key={i} style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {stat.value}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <CardTitle style={{ margin: '0 0 0.25rem 0' }}>Ownership Registry</CardTitle>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Legal ownership records per sale</div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Search owner..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Owner</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Project</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Plot(s)</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Total Sqft</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Purchase Value</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Ownership %</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading ledger...</td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No ownership records found</td></tr>
              ) : (
                filteredEntries.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{entry.user.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{entry.user.email}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{entry.project.name}</td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{entry.plots.join(', ')}</td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{entry.totalSqft}</td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(entry.purchaseValue)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', fontSize: '0.875rem' }}>
                          {entry.ownershipPercentage.toFixed(2)}%
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', width: '80%' }}>
                          <div style={{ height: '100%', background: 'var(--primary)', width: `${Math.min(100, entry.ownershipPercentage * 5)}%`, borderRadius: '2px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {new Date(entry.registeredAt).toLocaleDateString()}
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
