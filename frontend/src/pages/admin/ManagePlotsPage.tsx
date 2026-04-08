import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

interface Plot {
  id: string;
  projectId: string;
  project: { name: string };
  plotNumber: string;
  sizeSqft: number;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'SOLD';
  type: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

export function AdminManagePlotsPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const fetchPlots = async () => {
      setIsLoading(true);
      try {
        const res: any = await api.get(`/admin/plots?status=${filterStatus}`);
        setPlots(res.data || []);
        setProjects(res.projects || []);
      } catch (error) {
        toast.error('Failed to load plots');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchPlots();
  }, [filterStatus]);

  const filteredPlots = plots.filter(p => p.plotNumber.toLowerCase().includes(search.toLowerCase()))
    .filter(p => filterProject === 'ALL' || p.projectId === filterProject);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Plot Management</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage individual property parcels and allocations</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} /> Available
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} /> Held
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }} /> Sold
        </div>
      </div>

      <Card>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search plot number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="HELD">Held</option>
            <option value="SOLD">Sold</option>
          </select>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
          >
            <option value="ALL">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Plot No.</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Project</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Size</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Price</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Type</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading plots...</td></tr>
              ) : filteredPlots.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No plots found</td></tr>
              ) : (
                filteredPlots.map(plot => (
                  <tr key={plot.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: 700 }}>{plot.plotNumber}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{plot.project.name}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{plot.sizeSqft} sqft</td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace' }}>{formatCurrency(plot.price)}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{plot.type}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600,
                        background: plot.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.1)' : plot.status === 'SOLD' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: plot.status === 'AVAILABLE' ? '#10b981' : plot.status === 'SOLD' ? '#38bdf8' : '#fbbf24'
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {plot.status === 'AVAILABLE' ? 'Available' : plot.status === 'SOLD' ? 'Sold' : 'Held'}
                      </span>
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
