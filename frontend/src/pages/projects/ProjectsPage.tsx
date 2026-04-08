import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Building, MapPin, IndianRupee, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  status: string;
  totalAreaSqft: number | null;
  estimatedValue: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get<{ data: Project[] }>('/projects');
        setProjects(res.data);
      } catch (error) {
        toast.error('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProjects();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="loader" style={{ position: 'relative', width: '40px', height: '40px', color: 'var(--accent-gold)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>Active Projects</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Browse premium property investments currently available</p>
      </div>

      {projects.length === 0 ? (
        <Card glass>
          <CardBody style={{ textAlign: 'center', padding: '3rem' }}>
            <Building size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem' }} />
            <h3>No Active Projects</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              We are currently preparing new investment opportunities. Check back soon.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {projects.map((project) => (
            <Card key={project.id} glass hover style={{ display: 'flex', flexDirection: 'column' }}>
              <div 
                style={{ 
                  height: '180px', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, rgba(201, 168, 76, 0.1) 100%)'
                }}
              >
                <Building size={48} color="var(--accent-gold)" opacity={0.5} />
              </div>
              
              <CardBody style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{project.name}</h3>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: 'var(--border-radius-sm)', 
                    backgroundColor: 'var(--success-bg)',
                    color: 'var(--success)',
                    fontWeight: 600
                  }}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  <MapPin size={16} /> {project.location}
                </div>
                
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1 }}>
                  {project.description.substring(0, 100)}{project.description.length > 100 ? '...' : ''}
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Estimated Value</div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <IndianRupee size={14} /> {(project.estimatedValue / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Area</div>
                    <div style={{ fontWeight: 600 }}>{project.totalAreaSqft || 'N/A'} Sq.Ft</div>
                  </div>
                </div>
                
                <Link to={`/projects/${project.id}`} style={{ width: '100%' }}>
                  <Button fullWidth variant="outline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    View Details <ArrowRight size={18} />
                  </Button>
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
