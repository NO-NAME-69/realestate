import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { FileSearch, AlertCircle, Search, Server } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  eventType: string;
  actorId: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  result: string;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filterType) queryParams.append('event_type', filterType);
        
        const res: any = await api.get(`/admin/audit-logs?${queryParams.toString()}`);
        const data = res.data;
        setLogs(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Failed to load audit logs');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchLogs();
  }, [filterType]);

  const filteredLogs = (logs || []).filter(l => 
    l.eventType?.toLowerCase().includes(search.toLowerCase()) || 
    l.ipAddress?.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>System Audit Logs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Immutable ledger of all sensitive infrastructure actions</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <Card glass>
          <CardBody style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FileSearch size={32} color="var(--accent-blue)" />
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Logs Tracked</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{logs.length}</div>
            </div>
          </CardBody>
        </Card>
        <Card glass>
          <CardBody style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AlertCircle size={32} color="var(--danger)" />
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Failed Actions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>
                {logs.filter(l => l.result === 'FAILURE').length}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card glass>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <CardTitle>Security Registry</CardTitle>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ 
                padding: '0.5rem', 
                borderRadius: 'var(--border-radius)', 
                backgroundColor: 'var(--bg-tertiary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                outline: 'none'
              }}
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Logins</option>
              <option value="SALE_INITIATED">Sales</option>
              <option value="USER_ROLE_CHANGED">User Changes</option>
              <option value="SYSTEM_CONFIG_CHANGED">Config Changes</option>
            </select>
            
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius)', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)' }}>
              <Search size={16} color="var(--text-secondary)" style={{ margin: '0 0.5rem' }} />
              <input 
                type="text" 
                placeholder="Search IPs, Events..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }} 
              />
            </div>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Fetching secure logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No audit logs found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Timestamp</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Action</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Actor</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Resource</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Environment</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{log.eventType}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div>{log.actorRole || 'SYSTEM'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>ID: {log.actorId?.substring(0,8) || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {log.targetType || '—'} <br/>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{log.targetId?.substring(0,8) || ''}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Server size={12} /> {log.ipAddress || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.125rem 0.375rem', 
                          borderRadius: 'var(--border-radius-sm)',
                          backgroundColor: log.result === 'SUCCESS' ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: log.result === 'SUCCESS' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {log.result}
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
