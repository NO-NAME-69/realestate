import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Building, MapPin, Plus, X } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '0.5rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'white',
  outline: 'none',
  fontSize: '0.875rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.375rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export default function ManageProjectsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', type: 'Residential', location: '', description: '',
    totalAreaSqft: '', totalCost: '', estimatedValue: '',
  });

  const loadProjects = async () => {
    try {
      const res: any = await api.get('/projects?limit=50');
      const dbProjects = res.data || [];
      const mapped = dbProjects.map((p: any) => {
        const total = p.stats.total;
        const sold = p.stats.sold;
        const available = p.stats.available;
        const soldPercent = total > 0 ? Math.round((sold / total) * 100) : 0;
        return {
          id: p.id, name: p.name, location: p.location, status: p.status,
          statusColor: p.status === 'UNDER_DEVELOPMENT' ? '#f59e0b' : p.status === 'COMPLETED' ? '#10b981' : '#3b82f6',
          bgHeader: p.status === 'UNDER_DEVELOPMENT' ? 'rgba(245, 158, 11, 0.05)' : p.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(59, 130, 246, 0.05)',
          stats: { total, available, soldText: `${sold} Sold`, availableText: `${available} Available` },
          soldPercent
        };
      });
      setProjects(mapped);
    } catch (err: any) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.location || !form.totalAreaSqft || !form.totalCost || !form.estimatedValue) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/projects', {
        data: {
          name: form.name,
          type: form.type,
          location: form.location,
          description: form.description || undefined,
          totalAreaSqft: parseInt(form.totalAreaSqft),
          totalCost: parseInt(form.totalCost),
          estimatedValue: parseInt(form.estimatedValue),
        },
        idempotencyKey: `create-project-${Date.now()}`,
      });
      toast.success('Project created successfully!');
      setShowModal(false);
      setForm({ name: '', type: 'Residential', location: '', description: '', totalAreaSqft: '', totalCost: '', estimatedValue: '' });
      setLoading(true);
      await loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading projects...</div>;

  return (
    <div style={{ padding: '0 0.5rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Project Management</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{projects.length} Total Projects</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? '📄 List View' : '🔲 Grid View'}
          </Button>
          <Button style={{ background: '#3b82f6', color: 'white', fontWeight: 600 }} onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add Project
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {projects.map(p => (
          <Card key={p.id} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '1.5rem', background: p.bgHeader, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: p.statusColor, fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)' }}>
                {p.status}
              </div>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: `1px solid ${p.statusColor}40` }}>
                <Building size={32} color={p.statusColor} />
              </div>
            </div>
            
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', textAlign: 'center' }}>{p.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                <MapPin size={14} /> {p.location}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{p.stats.total}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Plots</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{p.stats.available}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{p.stats.soldText.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sold</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{p.stats.availableText.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Sold</span>
                  <span>{p.soldPercent}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#3b82f6', width: `${p.soldPercent}%`, borderRadius: '3px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                <Button variant="outline" style={{ flex: 1, fontSize: '0.875rem' }}>View Plots</Button>
                <Button variant="outline" style={{ flex: 1, fontSize: '0.875rem' }}>Edit</Button>
              </div>
            </div>
          </Card>
        ))}

        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', border: '2px dashed rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '500px' }}
          onClick={() => setShowModal(true)}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Plus size={32} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>Add New Project</h3>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem', margin: 0, maxWidth: '200px' }}>
            Click to create a new property project listing
          </p>
        </Card>
      </div>

      {/* Add Project Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'var(--bg-secondary, #1e1e2e)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '520px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700 }}>Add New Project</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Project Name *</label>
                <input style={inputStyle} placeholder="e.g. Sunrise Meadows Phase II" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Type *</label>
                  <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Mixed">Mixed Use</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Total Area (sqft) *</label>
                  <input style={inputStyle} type="number" placeholder="50000" value={form.totalAreaSqft} onChange={e => setForm({ ...form, totalAreaSqft: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Location *</label>
                <input style={inputStyle} placeholder="e.g. Bhopal, MP" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Total Cost (₹) *</label>
                  <input style={inputStyle} type="number" placeholder="10000000" value={form.totalCost} onChange={e => setForm({ ...form, totalCost: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Estimated Value (₹) *</label>
                  <input style={inputStyle} type="number" placeholder="15000000" value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Brief project description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</Button>
                <Button style={{ flex: 1, background: '#3b82f6', color: 'white', fontWeight: 600 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? '⏳ Creating...' : '✅ Create Project'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
