import { Card, CardTitle } from '../../components/ui/Card';
import { Users, Home, IndianRupee, Building, Clock } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../lib/utils';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {
      totalUsers: { value: 0, trend: '' },
      totalPropertyValue: { value: '₹0Cr', trend: '' },
      totalRevenue: { value: '₹0Cr', trend: '' },
      activeProjects: { value: 0, trend: '' }
    },
    propertyValueData: [] as any[],
    userGrowthData: [] as any[],
    revenueVsCostData: [] as any[],
    recentActivity: [] as any[]
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get('/admin/dashboard');
        setData(response.data);
      } catch (err: any) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const { stats, propertyValueData, userGrowthData, revenueVsCostData, recentActivity } = data;

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading dashboard statistics...</div>;
  }

  return (
    <div style={{ padding: '0 0.5rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Welcome back, Admin. Here's what's happening today.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select style={{ padding: '0.625rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}>
            <option>Last 30 Days</option>
            <option>Last Quarter</option>
            <option>This Year</option>
          </select>
          <button style={{ padding: '0.625rem 1rem', borderRadius: '0.5rem', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⬇️</span> Export
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <StatCard title="TOTAL USERS" value={stats.totalUsers.value} trend={stats.totalUsers.trend} icon={<Users size={20} color="#3b82f6" />} iconBg="rgba(59, 130, 246, 0.1)" trendColor="#10b981" />
        <StatCard title="TOTAL PROPERTY VALUE" value={stats.totalPropertyValue.value} trend={stats.totalPropertyValue.trend} icon={<Home size={20} color="#10b981" />} iconBg="rgba(16, 185, 129, 0.1)" trendColor="#10b981" />
        <StatCard title="TOTAL REVENUE" value={stats.totalRevenue.value} trend={stats.totalRevenue.trend} icon={<IndianRupee size={20} color="#f59e0b" />} iconBg="rgba(245, 158, 11, 0.1)" trendColor="#10b981" />
        <StatCard title="ACTIVE PROJECTS" value={stats.activeProjects.value} trend={stats.activeProjects.trend} icon={<Building size={20} color="#8b5cf6" />} iconBg="rgba(139, 92, 246, 0.1)" trendColor="#10b981" />
      </div>

      {/* Middle Row: Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>Property Value Growth</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Monthly property value uptake (in Cr)</p>
            </div>
            <select style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', outline: 'none' }}>
              <option>2024</option>
              <option>2023</option>
            </select>
          </div>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={propertyValueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="none" fill="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis stroke="none" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dx={-10} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                  itemStyle={{ color: 'white' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>Revenue vs Cost</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Quarterly comparison (in Cr)</p>
          </div>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueVsCostData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="none" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis stroke="none" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dx={-10} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Row: Area Chart & Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>User Growth</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>New registrations over time</p>
          </div>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="none" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis stroke="none" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dx={-10} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                />
                <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>Recent Activity</h3>
            </div>
            <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
              View all
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {recentActivity.map(activity => (
              <div key={activity.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', background: activity.bg, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0
                }}>
                  {activity.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.125rem' }}>{activity.text}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}

function StatCard({ title, value, trend, icon, iconBg, trendColor }: any) {
  return (
    <Card style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          {title}
        </div>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '10px', background: iconBg, 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          {icon}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{value}</div>
        <div style={{ fontSize: '0.875rem', color: trendColor, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {trend.startsWith('+') ? '↑' : trend.startsWith('-') ? '↓' : ''} {trend}
        </div>
      </div>
    </Card>
  );
}
