import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Wallet, Briefcase, TrendingUp, ArrowDownLeft, ArrowUpRight, MapPin, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardData {
  walletBalance: number;
  totalInvested: number;
  totalProfit: number;
  roi: string;
  activeInvestments: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    createdAt: string;
  }>;
}

interface HeldPlot {
  id: string;
  plotId: string;
  status: string;
  heldAt: string;
  expiresAt: string;
  plot: {
    id: string;
    plotNumber: string;
    sizeSqft: number;
    price: number;
    project?: { name: string };
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [heldPlots, setHeldPlots] = useState<HeldPlot[]>([]);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [walletRes, portfolioRes, txnRes, holdsRes] = await Promise.all([
          api.get<{ data: { balance: number } }>('/wallet/balance').catch(() => ({ data: { balance: 0 } })),
          api.get<{ data: { totalInvested: number; totalProfit: number; roi: string; activeInvestments: number } }>('/investments/portfolio').catch(() => ({ data: { totalInvested: 0, totalProfit: 0, roi: '0.00', activeInvestments: 0 } })),
          api.get<{ data: { transactions: Array<{ id: string; type: string; amount: number; description: string | null; createdAt: string }> } }>('/wallet/transactions?limit=5').catch(() => ({ data: { transactions: [] } })),
          api.get<{ data: HeldPlot[] }>('/plots/held').catch(() => ({ data: [] })),
        ]);

        setData({
          walletBalance: walletRes.data.balance,
          totalInvested: portfolioRes.data.totalInvested,
          totalProfit: portfolioRes.data.totalProfit,
          roi: portfolioRes.data.roi,
          activeInvestments: portfolioRes.data.activeInvestments,
          recentTransactions: txnRes.data.transactions || [],
        });
        setHeldPlots(holdsRes.data || []);
      } catch {
        // Silently fail — cards show 0
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balance = data?.walletBalance ?? 0;
  const totalInvested = data?.totalInvested ?? 0;
  const totalProfit = data?.totalProfit ?? 0;
  const roi = data?.roi ?? '0.00';
  const recentTxns = data?.recentTransactions ?? [];

  const handleReleaseHold = async (plotId: string) => {
    setReleasingId(plotId);
    try {
      await api.delete(`/plots/${plotId}/hold`);
      setHeldPlots(prev => prev.filter(h => h.plotId !== plotId));
      toast.success('Hold released successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to release hold');
    } finally {
      setReleasingId(null);
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const txnTypeLabel: Record<string, string> = {
    ADMIN_CREDIT: 'Credit',
    WALLET_TOPUP: 'Top-up',
    INVESTMENT_DEBIT: 'Investment',
    PROFIT_CREDIT: 'Profit',
    WITHDRAWAL: 'Withdrawal',
    REFUND: 'Refund',
    REGISTRATION_FEE: 'Registration',
    ADMIN_DEBIT: 'Debit',
  };

  const txnTypeColor: Record<string, string> = {
    ADMIN_CREDIT: 'var(--success)',
    WALLET_TOPUP: 'var(--success)',
    PROFIT_CREDIT: 'var(--success)',
    REFUND: 'var(--success)',
    INVESTMENT_DEBIT: 'var(--accent-gold)',
    WITHDRAWAL: 'var(--danger)',
    REGISTRATION_FEE: 'var(--danger)',
    ADMIN_DEBIT: 'var(--danger)',
  };

  const isCredit = (type: string) => ['ADMIN_CREDIT', 'WALLET_TOPUP', 'PROFIT_CREDIT', 'REFUND'].includes(type);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.fullName || 'Investor'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Wallet size={18} /> Available Balance
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              {isLoading ? '...' : formatCurrency(balance)}
            </div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Briefcase size={18} /> Total Invested
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              {isLoading ? '...' : formatCurrency(totalInvested)}
            </div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <TrendingUp size={18} /> Total ROI
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
              +{isLoading ? '...' : formatCurrency(totalProfit)}
              {!isLoading && totalInvested > 0 && (
                <span style={{ fontSize: '0.875rem', marginLeft: '0.5rem', opacity: 0.7 }}>({roi}%)</span>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Held Plots Section */}
      {heldPlots.length > 0 && (
        <Card glass>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} /> My Held Plots ({heldPlots.length})
            </CardTitle>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Plot</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Project</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Size</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Value</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Expires</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {heldPlots.map(hold => (
                    <tr key={hold.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{hold.plot.plotNumber}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{hold.plot.project?.name || '—'}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>{hold.plot.sizeSqft} Sq.Ft</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{formatCurrency(hold.plot.price)}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: getDaysRemaining(hold.expiresAt) <= 5 ? 'var(--danger)' : 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          <Clock size={14} /> {getDaysRemaining(hold.expiresAt)} days left
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleReleaseHold(hold.plotId)}
                          disabled={releasingId === hold.plotId}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                        >
                          <X size={14} /> {releasingId === hold.plotId ? 'Releasing…' : 'Release'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Card glass>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {recentTxns.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
              No recent activity found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {recentTxns.map((txn) => (
                <div
                  key={txn.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isCredit(txn.type) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    }}>
                      {isCredit(txn.type) ? (
                        <ArrowDownLeft size={18} color="var(--success)" />
                      ) : (
                        <ArrowUpRight size={18} color="var(--accent-gold)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {txnTypeLabel[txn.type] || txn.type}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {txn.description || new Date(txn.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    color: txnTypeColor[txn.type] || 'var(--text-primary)',
                  }}>
                    {isCredit(txn.type) ? '+' : '-'}{formatCurrency(txn.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
