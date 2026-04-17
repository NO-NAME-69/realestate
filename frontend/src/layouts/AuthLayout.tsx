import React from 'react';
import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

export function AuthLayout() {
  return (
    <div className="auth-layout">
      {/* Animated background elements */}
      <div className="bg-shape shape-1" />
      <div className="bg-shape shape-2" />
      <div className="bg-shape shape-3" />

      <div className="auth-container">
        <div className="auth-logo-container">
          <div className="auth-logo">∞</div>
          <h1 className="auth-title">Infinity Investments</h1>
          <p className="auth-subtitle">Premium Property Investment Platform</p>
        </div>
        
        <div className="auth-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
