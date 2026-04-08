import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { 
  LayoutDashboard, 
  Wallet, 
  Briefcase, 
  Map, 
  Building, 
  Users, 
  LogOut, 
  Menu,
  X,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  PieChart,
  TrendingUp,
  Settings
} from 'lucide-react';
import './AppLayout.css';

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isAdminPath = location.pathname.startsWith('/admin');

  const menuItems = [
    { section: 'MAIN MENU', items: [
      { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/wallet', label: 'Wallet', icon: <Wallet size={20} /> },
      { path: '/investments', label: 'My Investments', icon: <Briefcase size={20} /> },
      { path: '/plots', label: 'Browse Plots', icon: <Map size={20} /> },
      { path: '/projects', label: 'Projects', icon: <Building size={20} /> },
      { path: '/team', label: 'My Team', icon: <Users size={20} /> },
    ]}
  ];

  const adminMenuSections = [
    { section: 'OVERVIEW', items: [
      { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    ]},
    { section: 'MANAGEMENT', items: [
      { path: '/admin/users', label: 'Users', icon: <Users size={20} /> },
      { path: '/admin/kyc', label: 'KYC Verification', icon: <ShieldCheck size={20} /> },
      { path: '/admin/wallet', label: 'Wallet & Transactions', icon: <Wallet size={20} /> },
    ]},
    { section: 'PROPERTY', items: [
      { path: '/admin/projects', label: 'Projects', icon: <Building size={20} /> },
      { path: '/admin/plots', label: 'Plot Management', icon: <Map size={20} /> },
      { path: '/admin/ledger', label: 'Ownership Ledger', icon: <BookOpen size={20} /> },
    ]},
    { section: 'FINANCE', items: [
      { path: '/admin/sales', label: 'Sales & Revenue', icon: <TrendingUp size={20} /> },
      { path: '/admin/reports', label: 'Reports', icon: <PieChart size={20} /> },
    ]},
    { section: 'SYSTEM', items: [
      { path: '/admin/config', label: 'Settings', icon: <Settings size={20} /> },
    ]}
  ];

  const adminToggleItem = { path: '/admin', label: 'Admin Console', icon: <ShieldAlert size={20} /> };
  const userToggleItem = { path: '/dashboard', label: 'User Portal', icon: <LayoutDashboard size={20} /> };

  const currentMenu = isAdminPath ? adminMenuSections : menuItems;

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">RP</div>
          <h2 className="sidebar-brand">Investments</h2>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {currentMenu.map((group, i) => (
            <React.Fragment key={i}>
              <div className="nav-section" style={{ marginTop: i === 0 ? '0' : '1.5rem' }}>{group.section}</div>
              {group.items.map((item) => {
                const isActive = item.path === '/admin' || item.path === '/dashboard'
                  ? location.pathname === item.path 
                  : location.pathname.startsWith(item.path);
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </React.Fragment>
          ))}

          {isAdmin && (
            <>
              <div className="nav-section" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>SWITCH PORTAL</div>
              <Link 
                to={isAdminPath ? userToggleItem.path : adminToggleItem.path} 
                className="nav-item"
                onClick={() => setSidebarOpen(false)}
              >
                {isAdminPath ? userToggleItem.icon : adminToggleItem.icon}
                <span>{isAdminPath ? userToggleItem.label : adminToggleItem.label}</span>
              </Link>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.fullName || 'User'}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-button" onClick={logout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="mobile-header">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="mobile-brand">RP Investments</div>
        </header>
        
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
