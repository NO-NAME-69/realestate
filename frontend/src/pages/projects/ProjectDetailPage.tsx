import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, MapPin, Building, IndianRupee, Square, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Plot {
  id: string;
  plotNumber: string;
  type: string;
  status: string;
  sizeSqft: number;
  price: number;
  facing: string | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  location: string;
  status: string;
  type: string | null;
  totalAreaSqft: number | null;
  totalCost: number;
  estimatedValue: number;
  galleryUrls: string[];
  createdAt: string;
  plots: Plot[];
  _count: { investments: number };
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [holdingPlotId, setHoldingPlotId] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await api.get<{ data: ProjectDetail }>(`/projects/${id}`);
        setProject(res.data);
      } catch {
        toast.error('Failed to load project details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) void fetchProject();
  }, [id]);

  const handleHoldPlot = async (plotId: string) => {
    if (holdingPlotId) return;
    setHoldingPlotId(plotId);
    try {
      await api.post(`/plots/${plotId}/hold`, {
        idempotencyKey: `hold-${plotId}-${Date.now()}`,
      });
      toast.success('Plot held successfully for 30 days');
      // Refresh project to update plot statuses
      const res = await api.get<{ data: ProjectDetail }>(`/projects/${id}`);
      setProject(res.data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to hold plot');
    } finally {
      setHoldingPlotId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="loader" style={{ position: 'relative', width: '40px', height: '40px', color: 'var(--accent-gold)' }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' }}>
        <Building size={48} color="var(--text-tertiary)" />
        <h3>Project Not Found</h3>
        <Link to="/projects"><Button variant="outline">← Back to Projects</Button></Link>
      </div>
    );
  }

  const availablePlots = project.plots.filter(p => p.status === 'AVAILABLE');
  const heldPlots = project.plots.filter(p => p.status === 'HELD');
  const soldPlots = project.plots.filter(p => p.status === 'SOLD');
  const gallery = project.galleryUrls || [];

  const statusColor: Record<string, { bg: string; color: string }> = {
    AVAILABLE: { bg: 'var(--success-bg)', color: 'var(--success)' },
    HELD: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    SOLD: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Back Button */}
      <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', width: 'fit-content' }}>
        <ArrowLeft size={16} /> Back to Projects
      </Link>

      {/* Image Gallery */}
      {gallery.length > 0 && (
        <div style={{ position: 'relative', height: '320px', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
          <img
            src={gallery[currentImage]}
            alt={`${project.name} - Image ${currentImage + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)',
          }} />

          {gallery.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImage(prev => (prev - 1 + gallery.length) % gallery.length)}
                style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                  width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white', backdropFilter: 'blur(4px)',
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentImage(prev => (prev + 1) % gallery.length)}
                style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                  width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white', backdropFilter: 'blur(4px)',
                }}
              >
                <ChevronRight size={20} />
              </button>
              <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem' }}>
                {gallery.map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    style={{
                      width: idx === currentImage ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: idx === currentImage ? 'var(--accent-gold)' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Project Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 style={{ margin: 0 }}>{project.name}</h1>
            <span style={{
              fontSize: '0.8rem',
              padding: '0.3rem 0.75rem',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              fontWeight: 600,
            }}>
              {project.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <MapPin size={16} /> {project.location}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card glass>
          <CardBody style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Estimated Value</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              {formatCurrency(project.estimatedValue)}
            </div>
          </CardBody>
        </Card>
        <Card glass>
          <CardBody style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Total Area</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {project.totalAreaSqft?.toLocaleString('en-IN') || 'N/A'} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>Sq.Ft</span>
            </div>
          </CardBody>
        </Card>
        <Card glass>
          <CardBody style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Total Plots</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {project.plots.length}
            </div>
          </CardBody>
        </Card>
        <Card glass>
          <CardBody style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Available</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
              {availablePlots.length}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Description */}
      <Card glass>
        <CardHeader>
          <CardTitle>About This Project</CardTitle>
        </CardHeader>
        <CardBody>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {project.description}
          </p>
        </CardBody>
      </Card>

      {/* Plots Table */}
      <Card glass>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Plots ({project.plots.length})</span>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 400 }}>
              <span style={{ color: 'var(--success)' }}>● {availablePlots.length} Available</span>
              <span style={{ color: 'var(--warning)' }}>● {heldPlots.length} Held</span>
              <span style={{ color: 'var(--danger)' }}>● {soldPlots.length} Sold</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {project.plots.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '3rem' }}>
              No plots have been added to this project yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Plot No.</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Type</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Size</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Facing</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Price</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {project.plots.map(plot => {
                    const sc = statusColor[plot.status] || { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
                    return (
                      <tr key={plot.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{plot.plotNumber}</td>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {plot.type}
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Square size={14} color="var(--text-tertiary)" /> {plot.sizeSqft} Sq.Ft
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {plot.facing || '—'}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <IndianRupee size={14} /> {(plot.price / 100).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--border-radius-sm)',
                            backgroundColor: sc.bg,
                            color: sc.color,
                            fontWeight: 600,
                          }}>
                            {plot.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          {plot.status === 'AVAILABLE' ? (
                            <Button
                              size="sm"
                              onClick={() => void handleHoldPlot(plot.id)}
                              disabled={holdingPlotId === plot.id}
                            >
                              {holdingPlotId === plot.id ? 'Holding…' : 'Hold'}
                            </Button>
                          ) : plot.status === 'HELD' ? (
                            <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--warning)' }}>
                              <Clock size={14} /> Held
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Sold</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
