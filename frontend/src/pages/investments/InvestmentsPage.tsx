import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Briefcase, IndianRupee, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface PortfolioStats {
  totalInvested: number;
  activeInvestments: number;
  totalProfit: number;
  roi: string;
}

interface Investment {
  id: string;
  amount: number;
  status: string;
  projectId: string;
  createdAt: string;
  project?: { name: string };
}

export default function InvestmentsPage() {
  const [stats, setStats] = useState<PortfolioStats>({ totalInvested: 0, activeInvestments: 0, totalProfit: 0, roi: '0.00' });
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [portfolioRes, listRes] = await Promise.all([
          api.get<{ data: PortfolioStats }>('/investments/portfolio').catch(() => ({ data: { totalInvested: 0, activeInvestments: 0, totalProfit: 0, roi: '0.00' }})),
          api.get<{ data: Investment[] }>('/investments').catch(() => ({ data: [] }))
        ]);
        
        setStats(portfolioRes.data);
        setInvestments(listRes.data);
      } catch (error) {
        toast.error('Failed to load portfolio data');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>My Portfolio</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track your investments and returns</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Briefcase size={18} /> Total Invested
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              {isLoading ? '...' : formatCurrency(stats.totalInvested)}
            </div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <TrendingUp size={18} /> Total Returns
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>
              +{isLoading ? '...' : formatCurrency(stats.totalProfit)}
            </div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <IndianRupee size={18} /> Active Investments
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              {isLoading ? '...' : stats.activeInvestments}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>Investment History</CardTitle>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {investments.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '3rem' }}>
              You haven't made any investments yet. 
              <br/> Browse projects to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Project ID / Name</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Date</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Amount</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-primary)' }}>
                        {inv.project?.name || inv.projectId.split('-')[0]}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                        {formatCurrency(inv.amount)}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: 'var(--border-radius-sm)',
                          backgroundColor: inv.status === 'ACTIVE' ? 'var(--success-bg)' : 'var(--bg-tertiary)',
                          color: inv.status === 'ACTIVE' ? 'var(--success)' : 'var(--text-secondary)'
                        }}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
