import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Filter, Map, Square, IndianRupee, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Plot {
  id: string;
  project?: { name: string };
  plotNumber: string;
  type: string;
  status: string;
  sizeSqft: number;
  price: number;
}

export default function PlotsPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchPlots = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('status', statusFilter);
      if (typeFilter) queryParams.append('type', typeFilter);
      
      const res = await api.get<{ data: Plot[] }>(`/plots?${queryParams.toString()}`);
      setPlots(res.data || []);
    } catch (error) {
      toast.error('Failed to load plots');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlots();
  }, [statusFilter, typeFilter]);

  const [holdingPlotId, setHoldingPlotId] = useState<string | null>(null);

  const handleHoldPlot = async (plotId: string) => {
    if (holdingPlotId) return; // prevent double-click
    setHoldingPlotId(plotId);
    try {
      await api.post(`/plots/${plotId}/hold`, {
        idempotencyKey: `hold-${plotId}-${Date.now()}`,
      });
      toast.success('Plot held successfully for 30 days');
      void fetchPlots();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to hold plot. Ensure your account is active.');
    } finally {
      setHoldingPlotId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Browse Plots</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Find and hold properties across our premium projects</p>
        </div>
      </div>

      <Card glass style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Filter size={18} /> Filters:
          </div>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ 
              padding: '0.5rem', 
              borderRadius: 'var(--border-radius)', 
              backgroundColor: 'var(--bg-tertiary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              outline: 'none'
            }}
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="HELD">Held</option>
            <option value="SOLD">Sold</option>
          </select>
          
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ 
              padding: '0.5rem', 
              borderRadius: 'var(--border-radius)', 
              backgroundColor: 'var(--bg-tertiary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              outline: 'none'
            }}
          >
            <option value="">All Types</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="AGRICULTURAL">Agricultural</option>
          </select>
        </div>
      </Card>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="loader" style={{ position: 'relative', width: '40px', height: '40px', color: 'var(--accent-gold)' }} />
        </div>
      ) : plots.length === 0 ? (
        <Card glass>
          <CardBody style={{ textAlign: 'center', padding: '3rem' }}>
            <Map size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem' }} />
            <h3>No Plots Found</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Try adjusting your filters or check back later.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {plots.map((plot) => (
            <Card key={plot.id} glass hover>
              <CardBody style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Plot {plot.plotNumber}</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{plot.project?.name || 'Project Name'}</div>
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: 'var(--border-radius-sm)', 
                    backgroundColor: plot.status === 'AVAILABLE' ? 'var(--success-bg)' : plot.status === 'HELD' ? 'var(--warning-bg)' : 'var(--danger-bg)',
                    color: plot.status === 'AVAILABLE' ? 'var(--success)' : plot.status === 'HELD' ? 'var(--warning)' : 'var(--danger)',
                    fontWeight: 600
                  }}>
                    {plot.status}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Square size={16} color="var(--text-tertiary)" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Size</div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{plot.sizeSqft} Sq.Ft</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IndianRupee size={16} color="var(--text-tertiary)" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Price</div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{(plot.price / 100).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
                
                {plot.status === 'AVAILABLE' ? (
                  <Button fullWidth onClick={() => void handleHoldPlot(plot.id)} disabled={holdingPlotId === plot.id}>
                    {holdingPlotId === plot.id ? 'Holding…' : 'Hold Plot'}
                  </Button>
                ) : plot.status === 'HELD' ? (
                  <Button fullWidth variant="secondary" disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Clock size={16} /> Held Separately
                  </Button>
                ) : (
                  <Button fullWidth variant="outline" disabled>
                    Sold Out
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
