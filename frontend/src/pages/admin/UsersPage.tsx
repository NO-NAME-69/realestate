import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  role: string;
  status: string;
  isActivated: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // In production this would have pagination
      const res: any = await api.get('/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { data: { status: newStatus } });
      toast.success(`User status updated to ${newStatus}`);
      void fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = (users || []).filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.mobile?.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage investor accounts, verify KYC, and enforce bans</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius)', padding: '0.5rem 1rem', border: '1px solid var(--border-color)' }}>
          <Search size={18} color="var(--text-secondary)" style={{ marginRight: '0.5rem' }} />
          <input 
            type="text" 
            placeholder="Search email, name or mobile..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-primary)',
              outline: 'none',
              width: '250px'
            }} 
          />
        </div>
      </div>

      <Card glass>
        <CardBody style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading users database...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem', backgroundColor: 'var(--bg-tertiary)' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>User</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Contact</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Role</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Activation</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.fullName || 'No Name'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>ID: {user.id.substring(0, 8)}...</div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          <div>{user.email}</div>
                          <div style={{ color: 'var(--text-tertiary)' }}>{user.mobile}</div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: 'var(--border-radius-sm)',
                            backgroundColor: user.role.includes('ADMIN') ? 'var(--warning-bg)' : 'var(--bg-tertiary)',
                            color: user.role.includes('ADMIN') ? 'var(--warning)' : 'var(--text-secondary)',
                            fontWeight: 600
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: 'var(--border-radius-sm)',
                            backgroundColor: user.status === 'ACTIVE' ? 'var(--success-bg)' : user.status === 'BANNED' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                            color: user.status === 'ACTIVE' ? 'var(--success)' : user.status === 'BANNED' ? 'var(--danger)' : 'var(--warning)'
                          }}>
                            {user.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          {user.isActivated ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.875rem' }}>
                              <CheckCircle size={14} /> Activated
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                              <XCircle size={14} /> Pending
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {user.status !== 'SUSPENDED' && (
                              <Button variant="outline" size="sm" onClick={() => void handleUpdateStatus(user.id, 'SUSPENDED')}>Suspend</Button>
                            )}
                            {user.status !== 'ACTIVE' && (
                              <Button variant="secondary" size="sm" onClick={() => void handleUpdateStatus(user.id, 'ACTIVE')}>Activate</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
