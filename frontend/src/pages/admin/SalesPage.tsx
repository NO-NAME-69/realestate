import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [stats, setStats] = useState({ totalRevenueCollected: 0, totalPlotsSold: 0, avgSaleValue: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  
  // Form resources
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [plots, setPlots] = useState<any[]>([]);
  const [selectedPlot, setSelectedPlot] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  
  const [salePrice, setSalePrice] = useState(0);

  useEffect(() => {
    async function loadResources() {
      try {
        const salesRes: any = await api.get('/admin/sales');
        const projectsRes: any = await api.get('/projects?limit=50');
        const usersRes: any = await api.get('/admin/users?limit=100');
        
        setStats(salesRes.stats);
        setRecentSales(salesRes.data);
        
        const projData = projectsRes.data || [];
        setProjects(projData);
        if (projData.length > 0) setSelectedProject(projData[0].id);

        setUsers(usersRes.data || []);
      } catch (err: any) {
        toast.error('Failed to load sales data');
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  // When project changes, fetch its plots
  useEffect(() => {
    if (!selectedProject) return;
    async function loadPlots() {
      try {
        const res: any = await api.get(`/projects/${selectedProject}`);
        const availablePlots = (res.data?.plots || []).filter((p: any) => p.status === 'AVAILABLE');
        setPlots(availablePlots);
        if (availablePlots.length > 0) {
          setSelectedPlot(availablePlots[0].id);
          setSalePrice(availablePlots[0].basePrice);
        } else {
          setSelectedPlot('');
          setSalePrice(0);
        }
      } catch (err) {
        toast.error('Failed to load plots');
      }
    }
    loadPlots();
  }, [selectedProject]);

  const handlePlotChange = (id: string) => {
    setSelectedPlot(id);
    const plot = plots.find(p => p.id === id);
    if (plot) setSalePrice(plot.basePrice);
  };

  const handleRecordSale = async () => {
    if (!selectedPlot || !selectedBuyer) {
      toast.error('Please select a plot and a buyer');
      return;
    }
    setSubmitting(true);
    try {
      const user = users.find(u => u.id === selectedBuyer);
      await api.post('/admin/sales', {
        data: {
          plot_id: selectedPlot,
          buyer_name: user?.fullName || 'Unknown',
          buyer_mobile: user?.mobile || 'Unknown',
          buyer_email: user?.email,
          base_price_paise: salePrice,
          negotiated_price_paise: salePrice,
          final_price_paise: salePrice,
        }
      });
      toast.success('Sale recorded successfully!');
      
      // Reload sales
      const salesRes = await api.get('/admin/sales');
      setStats(salesRes.data.stats);
      setRecentSales(salesRes.data.data);
      
      // Re-trigger plot load to remove sold plot
      setSelectedProject(selectedProject);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading sales dashboard...</div>;

  return (
    <div style={{ padding: '0 0.5rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Sales & Revenue</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Plot sales and revenue tracking</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <Card style={{ flex: 1, padding: '1.5rem', minWidth: '200px' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>₹{(stats.totalRevenueCollected / 10000000).toFixed(2)}Cr</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Revenue Collected</div>
        </Card>
        <Card style={{ flex: 1, padding: '1.5rem', minWidth: '200px' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.25rem' }}>{stats.totalPlotsSold}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Plots Sold</div>
        </Card>
        <Card style={{ flex: 1, padding: '1.5rem', minWidth: '200px' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>₹{(stats.avgSaleValue / 100000).toFixed(1)}L</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Avg. Sale Value</div>
        </Card>
        <div style={{ flex: 1, minWidth: '200px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(400px, 1.5fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Side: Form */}
        <Card style={{ padding: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem' }}>Record New Sale</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Select Project</label>
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Plot Number</label>
                <select value={selectedPlot} onChange={(e) => handlePlotChange(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}>
                  {plots.length === 0 ? <option value="">No plots available</option> : plots.map(p => <option key={p.id} value={p.id}>{p.plotNumber} ({p.areaSqft} sqft)</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Sale Price (₹)</label>
                <input type="text" value={Number(salePrice / 100).toLocaleString('en-IN')} readOnly style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Buyer</label>
              <select value={selectedBuyer} onChange={(e) => setSelectedBuyer(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}>
                <option value="">Select registered user...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.mobile})</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <Button disabled={submitting || !selectedPlot} onClick={handleRecordSale} style={{ background: '#3b82f6', color: 'white', fontWeight: 600 }}>
                {submitting ? 'Recording...' : 'Confirm Sale'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Side: Table */}
        <Card style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Recent Sales</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Plot</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Buyer</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale, i) => (
                <tr key={i} style={{ borderBottom: i < recentSales.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: 700 }}>#{sale.plotNumber}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{sale.buyerName}</td>
                  <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600 }}>₹{Number(sale.finalPrice / 100).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>Completed</td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No sales recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
