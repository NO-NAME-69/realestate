import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Building, MapPin, Plus, X, Upload, Image as ImageIcon, Pencil, Printer, Download } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', type: 'Residential', location: '', description: '',
    totalAreaSqft: '', totalCost: '', estimatedValue: '',
  });

  const [editForm, setEditForm] = useState({
    name: '', type: 'Residential', location: '', description: '',
    totalAreaSqft: '', totalCost: '', estimatedValue: '', status: 'PLANNED',
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
          galleryUrls: p.galleryUrls || [],
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setSelectedImages(prev => [...prev, ...validFiles]);
    
    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (projectId: string) => {
    if (selectedImages.length === 0) return;

    const formData = new FormData();
    selectedImages.forEach(file => formData.append('images', file));

    const token = localStorage.getItem('rp_access_token');
    const response = await fetch(`/api/v1/projects/${projectId}/images`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload images');
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.location || !form.totalAreaSqft || !form.totalCost || !form.estimatedValue) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res: any = await api.post('/projects', {
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

      // Upload images if any selected
      if (selectedImages.length > 0 && res.data?.id) {
        try {
          await uploadImages(res.data.id);
          toast.success('Project created with images!');
        } catch {
          toast.success('Project created but image upload failed');
        }
      } else {
        toast.success('Project created successfully!');
      }

      setShowModal(false);
      setForm({ name: '', type: 'Residential', location: '', description: '', totalAreaSqft: '', totalCost: '', estimatedValue: '' });
      setSelectedImages([]);
      setImagePreviews([]);
      setLoading(true);
      await loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedImages([]);
    setImagePreviews([]);
  };

  const openEditModal = async (project: any) => {
    try {
      const res: any = await api.get(`/projects/${project.id}`);
      const p = res.data;
      setEditingProject(p);
      setEditForm({
        name: p.name || '',
        type: p.type || 'Residential',
        location: p.location || '',
        description: p.description || '',
        totalAreaSqft: String(p.totalAreaSqft || ''),
        totalCost: String(p.totalCost || ''),
        estimatedValue: String(p.estimatedValue || ''),
        status: p.status || 'PLANNED',
      });
      setSelectedImages([]);
      setImagePreviews([]);
      setShowEditModal(true);
    } catch {
      toast.error('Failed to load project details');
    }
  };

  const handleEditSubmit = async () => {
    if (!editingProject) return;
    setSubmitting(true);
    try {
      await api.put(`/projects/${editingProject.id}`, {
        data: {
          name: editForm.name,
          type: editForm.type,
          location: editForm.location,
          description: editForm.description || undefined,
          totalAreaSqft: parseInt(editForm.totalAreaSqft),
          totalCost: parseInt(editForm.totalCost),
          estimatedValue: parseInt(editForm.estimatedValue),
        },
      });

      // Upload new images if selected
      if (selectedImages.length > 0) {
        try {
          await uploadImages(editingProject.id);
        } catch {
          toast.error('Images failed to upload');
        }
      }

      // Update status if changed
      if (editForm.status !== editingProject.status) {
        await api.put(`/projects/${editingProject.id}/status`, {
          data: { status: editForm.status },
        });
      }

      toast.success('Project updated!');
      setShowEditModal(false);
      setEditingProject(null);
      setSelectedImages([]);
      setImagePreviews([]);
      setLoading(true);
      await loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelDownload = () => {
    const data = projects.map(p => ({
      'Project Name': p.name,
      'Location': p.location,
      'Status': p.status,
      'Total Plots': p.stats.total,
      'Available': p.stats.available,
      'Sold': p.stats.soldText.split(' ')[0],
      'Sold %': `${p.soldPercent}%`,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');

    // Auto-size columns
    ws['!cols'] = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String((r as any)[key]).length)) + 2,
    }));

    XLSX.writeFile(wb, `Projects_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel downloaded!');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error('Pop-up blocked. Please allow pop-ups.');

    const rows = projects.map(p => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd">${p.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd">${p.location}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd">${p.status.replace(/_/g, ' ')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:center">${p.stats.total}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:center">${p.stats.available}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:center">${p.stats.soldText.split(' ')[0]}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:center">${p.soldPercent}%</td>
      </tr>`).join('');

    printWindow.document.write(`
      <html><head><title>Projects Report - Infinity Reality</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2rem; color: #333; }
        h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
        p { color: #666; margin-bottom: 1.5rem; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 10px 12px; text-align: left; border-bottom: 2px solid #333; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
        td { font-size: 0.9rem; }
        .footer { margin-top: 2rem; font-size: 0.75rem; color: #999; text-align: center; }
      </style></head><body>
        <h1>Infinity Reality — Project Report</h1>
        <p>Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • ${projects.length} Projects</p>
        <table>
          <thead><tr>
            <th>Project</th><th>Location</th><th>Status</th>
            <th style="text-align:center">Plots</th><th style="text-align:center">Available</th>
            <th style="text-align:center">Sold</th><th style="text-align:center">Progress</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Infinity Reality • Confidential</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading projects...</div>;

  return (
    <div style={{ padding: '0 0.5rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Project Management</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{projects.length} Total Projects</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={handlePrint} style={{ fontSize: '0.85rem' }}>
            <Printer size={16} style={{ marginRight: '0.375rem' }} /> Print
          </Button>
          <Button variant="outline" onClick={handleExcelDownload} style={{ fontSize: '0.85rem' }}>
            <Download size={16} style={{ marginRight: '0.375rem' }} /> Excel
          </Button>
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? '📄 List View' : '🔲 Grid View'}
          </Button>
          <Button style={{ background: '#3b82f6', color: 'white', fontWeight: 600 }} onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add Project
          </Button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {projects.map(p => (
            <Card key={p.id} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
              {/* Project Image or Icon Header */}
              <div style={{
                height: '180px',
                position: 'relative',
                overflow: 'hidden',
                background: p.galleryUrls.length > 0 ? 'transparent' : p.bgHeader,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p.galleryUrls.length > 0 ? (
                  <>
                    <img
                      src={p.galleryUrls[0]}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
                    }} />
                    {p.galleryUrls.length > 1 && (
                      <div style={{
                        position: 'absolute', bottom: '0.5rem', right: '0.5rem',
                        background: 'rgba(0,0,0,0.6)', borderRadius: '0.375rem',
                        padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'white',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                      }}>
                        <ImageIcon size={12} /> +{p.galleryUrls.length - 1}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${p.statusColor}40` }}>
                    <Building size={32} color={p.statusColor} />
                  </div>
                )}
                <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', color: p.statusColor, fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '1rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                  {p.status}
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
                  <Button variant="outline" style={{ flex: 1, fontSize: '0.875rem' }} onClick={() => navigate(`/admin/plots?projectId=${p.id}`)}>View Plots</Button>
                  <Button variant="outline" style={{ flex: 1, fontSize: '0.875rem' }} onClick={() => openEditModal(p)}>
                    <Pencil size={14} style={{ marginRight: '0.25rem' }} /> Edit
                  </Button>
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
      ) : (
        /* ━━━━━━━━ LIST VIEW ━━━━━━━━ */
        <Card style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Plots</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Sold</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Progress</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0,
                          background: p.galleryUrls.length > 0 ? 'transparent' : 'rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {p.galleryUrls.length > 0 ? (
                            <img src={p.galleryUrls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Building size={18} color={p.statusColor} />
                          )}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={13} /> {p.location}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.625rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600,
                        color: p.statusColor, background: `${p.statusColor}15`,
                      }}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 600 }}>{p.stats.total}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 600 }}>{p.stats.soldText.split(' ')[0]}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', maxWidth: '80px' }}>
                          <div style={{ height: '100%', background: '#3b82f6', width: `${p.soldPercent}%`, borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '30px' }}>{p.soldPercent}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button variant="outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }} onClick={() => navigate(`/admin/plots?projectId=${p.id}`)}>Plots</Button>
                        <Button variant="outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }} onClick={() => openEditModal(p)}>
                          <Pencil size={12} style={{ marginRight: '0.25rem' }} /> Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={closeModal}>
          <div style={{
            background: 'var(--bg-secondary, #1e1e2e)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '560px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700 }}>Add New Project</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
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

              {/* Image Upload Section */}
              <div>
                <label style={labelStyle}>Project Images</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    if (files.length > 0) {
                      setSelectedImages(prev => [...prev, ...files]);
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string]);
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  style={{
                    border: '2px dashed rgba(255,255,255,0.15)',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Upload size={24} style={{ margin: '0 auto 0.5rem', color: 'var(--text-secondary)' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Click or drag & drop images here
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    PNG, JPG, WebP up to 10MB each
                  </p>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.5rem', marginTop: '0.75rem',
                  }}>
                    {imagePreviews.map((preview, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: '0.375rem', overflow: 'hidden', aspectRatio: '1' }}>
                        <img src={preview} alt={`Preview ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          style={{
                            position: 'absolute', top: '0.25rem', right: '0.25rem',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.7)', border: 'none',
                            color: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <Button variant="outline" style={{ flex: 1 }} onClick={closeModal}>Cancel</Button>
                <Button style={{ flex: 1, background: '#3b82f6', color: 'white', fontWeight: 600 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? '⏳ Creating...' : '✅ Create Project'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={() => { setShowEditModal(false); setEditingProject(null); }}>
          <div style={{
            background: 'var(--bg-secondary, #1e1e2e)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '560px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700 }}>Edit Project</h2>
              <button onClick={() => { setShowEditModal(false); setEditingProject(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Project Name *</label>
                <input style={inputStyle} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Type *</label>
                  <select style={inputStyle} value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Mixed">Mixed Use</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="PLANNED">Planned</option>
                    <option value="LAND_ACQUIRED">Land Acquired</option>
                    <option value="LEGAL_IN_PROGRESS">Legal In Progress</option>
                    <option value="APPROVED">Approved</option>
                    <option value="UNDER_DEVELOPMENT">Under Development</option>
                    <option value="READY_FOR_SALE">Ready For Sale</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Location *</label>
                <input style={inputStyle} value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Area (sqft)</label>
                  <input style={inputStyle} type="number" value={editForm.totalAreaSqft} onChange={e => setEditForm({ ...editForm, totalAreaSqft: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Cost (₹)</label>
                  <input style={inputStyle} type="number" value={editForm.totalCost} onChange={e => setEditForm({ ...editForm, totalCost: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Value (₹)</label>
                  <input style={inputStyle} type="number" value={editForm.estimatedValue} onChange={e => setEditForm({ ...editForm, estimatedValue: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>

              {/* Current Images */}
              {editingProject.galleryUrls?.length > 0 && (
                <div>
                  <label style={labelStyle}>Current Images</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {editingProject.galleryUrls.map((url: string, i: number) => (
                      <div key={i} style={{ borderRadius: '0.375rem', overflow: 'hidden', aspectRatio: '1' }}>
                        <img src={url} alt={`Project ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add More Images */}
              <div>
                <label style={labelStyle}>Add More Images</label>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                />
                <div
                  onClick={() => editFileInputRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(255,255,255,0.15)',
                    borderRadius: '0.5rem', padding: '1rem',
                    textAlign: 'center', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Upload size={20} style={{ margin: '0 auto 0.25rem', color: 'var(--text-secondary)' }} />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click to add images</p>
                </div>
                {imagePreviews.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {imagePreviews.map((preview, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: '0.375rem', overflow: 'hidden', aspectRatio: '1' }}>
                        <img src={preview} alt={`New ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.7rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <Button variant="outline" style={{ flex: 1 }} onClick={() => { setShowEditModal(false); setEditingProject(null); }}>Cancel</Button>
                <Button style={{ flex: 1, background: '#3b82f6', color: 'white', fontWeight: 600 }} onClick={handleEditSubmit} disabled={submitting}>
                  {submitting ? '⏳ Saving...' : '💾 Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
