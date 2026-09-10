import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStateContext } from '../context/StateContext';
import logoImg from '../assets/sidebar-logo.png';
import {
  LayoutDashboard,
  Users,
  Building,
  Home,
  CloudLightning,
  BrainCircuit,
  BarChart3,
  Settings,
  History,
  LogOut,
  RefreshCw,
  Clock,
  X
} from 'lucide-react';

export default function Sidebar({
  isMobileMenuOpen,
  setIsMobileMenuOpen
}) {
  const {
    adminUser,
    handleLogout: onLogout,
    handleSessionRefresh: onSessionRefresh
  } = useStateContext();
  const calculateInitialTime = () => {
    if (adminUser?.expiresAt) {
      const remainingSec = Math.max(0, Math.floor((adminUser.expiresAt - Date.now()) / 1000));
      return remainingSec;
    }
    return 1800; // 30 minutes session
  };

  const [timeLeft, setTimeLeft] = useState(calculateInitialTime);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (adminUser?.expiresAt) {
      const remainingSec = Math.max(0, Math.floor((adminUser.expiresAt - Date.now()) / 1000));
      setTimeLeft(remainingSec);
    } else {
      setTimeLeft(1800);
    }
  }, [adminUser?.expiresAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-refresh when timer reaches expiration
          if (onSessionRefresh) {
            onSessionRefresh(false);
          }
          return 0;
        }
        // Proactive silent background refresh when 90 seconds remain
        if (prev === 90 && onSessionRefresh) {
          onSessionRefresh(false);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onLogout, adminUser, onSessionRefresh]);

  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onSessionRefresh) {
        const success = await onSessionRefresh(true);
        if (success) {
          setTimeLeft(1800);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['Admin'] },
    { id: 'realtors', label: 'Realtor Management', icon: Building, roles: ['Admin'] },
    { id: 'properties', label: 'Property Assets', icon: Home, roles: ['Admin'] },
    { id: 'portals', label: 'Portal & API Sync', icon: CloudLightning, roles: ['Admin'] },
    // { id: 'ai', label: 'AI Configurations', icon: BrainCircuit, roles: ['Admin'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['Admin'] },
    { id: 'settings', label: 'System Settings', icon: Settings, roles: ['Admin'] },
    { id: 'logs', label: 'Audit & System Logs', icon: History, roles: ['Admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    item.roles.some(r => r.toLowerCase() === adminUser?.role?.toLowerCase())
  );

  const handleTabSelect = (tabId) => {
    navigate(`/${tabId}`);
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false); // Auto close sidebar on mobile tap
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'mobile-open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside className={`sidebar-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header with SpeddyProp Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', paddingLeft: '0.25rem', position: 'relative' }}>
          
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(250, 179, 25, 0.45)',
            padding: '4px 6px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            flexShrink: 0
          }}>
            <img 
              src={logoImg} 
              alt="SpeddyProp" 
              style={{ 
                width: '42px', 
                height: '32px', 
                objectFit: 'contain'
              }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
              Speddy<span style={{ color: 'var(--primary)' }}>Prop</span>
            </span>
            <span style={{ fontSize: '0.58rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.65)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '0.2rem' }}>
              Find | Match | Move
            </span>
          </div>

          {/* Close button for Mobile screen */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'none'
            }}
            className="btn-mobile-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Menu */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabSelect(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'rgba(250, 179, 25, 0.12)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'inherit' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Session Watchdog */}
        <div className="glass-card" style={{ padding: '0.85rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex-align-center" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Clock size={14} className="text-warning animate-pulse" />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>Token Session Timeout</span>
          </div>
          <div className="flex-between">
            <span style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace', color: timeLeft < 60 ? 'var(--text-danger)' : '#ffffff' }}>
              {formatTime(timeLeft)}
            </span>
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff',
                padding: '0.25rem',
                borderRadius: '4px',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Refresh session token"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Footer Profile */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <img
            src={adminUser.avatar}
            alt={adminUser.name}
            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {adminUser.name}
            </h4>
            <span className="badge badge-primary" style={{ fontSize: '0.625rem', padding: '0.05rem 0.35rem', marginTop: '0.15rem' }}>
              {adminUser.role}
            </span>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Copyright Notice */}
        <div style={{
          marginTop: '0.75rem',
          textAlign: 'center',
          fontSize: '0.65rem',
          color: 'rgba(255, 255, 255, 0.3)',
          borderTop: '1px solid rgba(255,255,255,0.03)',
          paddingTop: '0.5rem'
        }}>
          © 2026 SpeddyProp Technologies
        </div>
      </aside>

      {/* CSS injection specifically for responsive sidebar close */}
      <style>{`
        @media (max-width: 768px) {
          .btn-mobile-close {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
