import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Users, UserPlus, TrendingUp, IndianRupee, Copy, Check } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  totalTeamInvestment: number;
  referralEarnings: number;
}

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  status: string;
  totalInvested: number;
  joinedAt: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TeamStats>({ totalMembers: 0, activeMembers: 0, totalTeamInvestment: 0, referralEarnings: 0 });
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate a mock referral code based on user ID for MVP
  const referralCode = user ? `RP-${user.id.substring(0, 6).toUpperCase()}` : 'LOADING...';
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  useEffect(() => {
    // In a real app we'd fetch from actual endpoints
    // For MVP, if we don't have the endpoints yet, we'll mock the data
    const fetchTeamData = async () => {
      try {
        const [statsRes, membersRes] = await Promise.all([
          api.get<{ data: TeamStats }>('/teams/mine/stats').catch(() => ({ data: { totalMembers: 0, activeMembers: 0, totalTeamInvestment: 0, referralEarnings: 0 }})),
          api.get<{ data: TeamMember[] }>('/teams/mine/members').catch(() => ({ data: [] }))
        ]);
        
        setStats(statsRes.data);
        setMembers(membersRes.data);
      } catch (error) {
        console.error('Failed to load team data');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTeamData();
  }, []);

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>My Team</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your network and track referral earnings</p>
      </div>

      <Card glass>
        <CardBody style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <UserPlus size={48} color="var(--accent-gold)" style={{ opacity: 0.8 }} />
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Invite Investors</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
              Share your referral link with potential investors. When they register and activate, you earn a ₹500 referral bonus.
            </p>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: 'var(--bg-primary)', 
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '0.5rem',
            width: '100%',
            maxWidth: '500px',
            marginTop: '0.5rem'
          }}>
            <div style={{ 
              flex: 1, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              padding: '0 0.5rem'
            }}>
              {referralLink}
            </div>
            <button 
              onClick={copyToClipboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem'
              }}
            >
              {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />} 
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </CardBody>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} /> Total Network
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.totalMembers}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{stats.activeMembers} Active Members</div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} /> Team Investment
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              ₹{(stats.totalTeamInvestment / 100).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Across all active members</div>
          </CardBody>
        </Card>

        <Card glass hover>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IndianRupee size={16} /> Referral Earnings
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              ₹{(stats.referralEarnings / 100).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Paid to your wallet</div>
          </CardBody>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>Team Directory</CardTitle>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading team members...</div>
          ) : members.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              You don't have any team members yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Investor</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Mobile</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Joined</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Invested</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{member.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {member.mobile}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                        ₹{(member.totalInvested / 100).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: 'var(--border-radius-sm)',
                          backgroundColor: member.status === 'ACTIVE' ? 'var(--success-bg)' : 'var(--warning-bg)',
                          color: member.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {member.status}
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
