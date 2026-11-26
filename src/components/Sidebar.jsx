import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStateContext } from '../context/StateContext';
import logoImg from '../assets/sidebar-logo.png';
import {
  LayoutDashboard,
  Users,
  Building,
  Building2,
  Layers,
  Home,
  CloudLightning,
  BrainCircuit,
  BarChart3,
  Settings,
  History,
  FileText,
  Shield,
  Eye,
  Globe,
  Edit3,
  ChevronDown,
  ChevronRight,
  LogOut,
  RefreshCw,
  Clock,
  X,
  HelpCircle
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
    return 7 * 24 * 60 * 60; // 7 days default
  };

  const [timeLeft, setTimeLeft] = useState(calculateInitialTime);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState({});

  const toggleSubmenu = (groupId, isGroupActive = false) => {
    setOpenSubmenus(prev => {
      const currentlyOpen = prev[groupId] !== undefined ? prev[groupId] : isGroupActive;
      return { ...prev, [groupId]: !currentlyOpen };
    });
  };

  useEffect(() => {
    if (adminUser?.expiresAt) {
      const remainingSec = Math.max(0, Math.floor((adminUser.expiresAt - Date.now()) / 1000));
      setTimeLeft(remainingSec);
    } else {
      setTimeLeft(7 * 24 * 60 * 60);
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
          setTimeLeft(adminUser?.expiresAt ? Math.max(0, Math.floor((adminUser.expiresAt - Date.now()) / 1000)) : 7 * 24 * 60 * 60);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format into 6d 23h 59m (or Xh Xm Xs when < 1 day)
  const formatTime = (seconds) => {
    if (seconds <= 0) return '0m';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (d > 0) {
      return `${d}d ${h}h ${m}m`;
    }
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  const getTimeColor = (seconds) => {
    if (seconds <= 3600) return 'var(--text-danger, #ef4444)';
    if (seconds <= 86400) return 'var(--warning, #f59e0b)';
    return '#22c55e'; // Green as in user design
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['Admin'] },
    { id: 'realtors', label: 'Realtor Management', icon: Building, roles: ['Admin'] },
    { id: 'agencies', label: 'Agency Management', icon: Building2, roles: ['Admin'] },
    { id: 'tiers', label: 'Tier Management', icon: Layers, roles: ['Admin'] },
    { id: 'properties', label: 'Property Management', icon: Home, roles: ['Admin'] },
    // { id: 'portals', label: 'Portal & API Sync', icon: CloudLightning, roles: ['Admin'] },
    // { id: 'ai', label: 'AI Management', icon: BrainCircuit, roles: ['Admin'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['Admin'] },
    {
      id: 'terms-group',
      label: 'Terms & Conditions',
      icon: FileText,
      roles: ['Admin'],
      subItems: [
        // { id: 'terms-en', label: 'View Terms (English)', path: '/terms?language=english', icon: Eye },
        // { id: 'terms-es', label: 'View Terms (Spanish)', path: '/terms?language=spanish', icon: Globe },
        { id: 'terms-edit', label: 'Edit Content', path: '/terms-edit', icon: Edit3 }
      ]
    },
    {
      id: 'privacy-group',
      label: 'Privacy Policy',
      icon: Shield,
      roles: ['Admin'],
      subItems: [
        // { id: 'privacy-en', label: 'View Privacy (English)', path: '/privacy-policy?language=english', icon: Eye },
        // { id: 'privacy-es', label: 'View Privacy (Spanish)', path: '/privacy-policy?language=spanish', icon: Globe },
        { id: 'privacy-edit', label: 'Edit Content', path: '/privacy-policy-edit', icon: Edit3 }
      ]
    },
    {
      id: 'help-support-group',
      label: 'Help & Support',
      icon: HelpCircle,
      roles: ['Admin'],
      subItems: [
        { id: 'help-support-edit', label: 'Edit Content', path: '/help-support-edit', icon: Edit3 }
      ]
    },
    { id: 'settings', label: 'System Settings', icon: Settings, roles: ['Admin'] },
    { id: 'logs', label: 'Audit & System Logs', icon: History, roles: ['Admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item =>
    item.roles.some(r => r.toLowerCase() === adminUser?.role?.toLowerCase())
  );

  const handleTabSelect = (tabId, path) => {
    navigate(path || `/${tabId}`);
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

            // Handle submenu items (e.g. Terms & Conditions -> View Terms / Edit Content)
            if (item.subItems) {
              const isGroupActive = activeTab === item.id || item.subItems.some(sub => {
                if (sub.path) {
                  const fullCurrent = location.pathname + location.search;
                  return fullCurrent === sub.path || location.pathname === sub.path.split('?')[0];
                }
                return activeTab === sub.id;
              });
              const isOpen = openSubmenus[item.id] !== undefined ? openSubmenus[item.id] : isGroupActive;

              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <button
                    onClick={() => toggleSubmenu(item.id, isGroupActive)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: isGroupActive ? 'rgba(250, 179, 25, 0.12)' : 'transparent',
                      color: isGroupActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.875rem',
                      fontWeight: isGroupActive ? 600 : 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Icon size={18} style={{ color: isGroupActive ? 'var(--primary)' : 'inherit' }} />
                      <span>{item.label}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown size={15} style={{ color: isGroupActive ? 'var(--primary)' : 'inherit' }} />
                    ) : (
                      <ChevronRight size={15} style={{ color: 'inherit' }} />
                    )}
                  </button>

                  {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '1.25rem', marginTop: '0.1rem' }}>
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const fullCurrent = location.pathname + location.search;
                        const isSubActive = sub.path
                          ? (fullCurrent === sub.path ||
                            (sub.id === 'terms-en' && location.pathname === '/terms' && !location.search) ||
                            (sub.id === 'privacy-en' && (location.pathname === '/privacy-policy' || location.pathname === '/privacy') && !location.search))
                          : activeTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleTabSelect(sub.id, sub.path)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.65rem',
                              padding: '0.55rem 0.85rem',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              background: isSubActive ? 'var(--primary)' : 'transparent',
                              color: isSubActive ? '#0a1f39' : 'rgba(255, 255, 255, 0.7)',
                              fontFamily: 'var(--font-sans)',
                              fontSize: '0.8125rem',
                              fontWeight: isSubActive ? 700 : 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              width: '100%'
                            }}
                          >
                            <SubIcon size={14} style={{ color: isSubActive ? '#0a1f39' : 'rgba(255, 255, 255, 0.5)' }} />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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
            <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: getTimeColor(timeLeft), letterSpacing: '0.02em' }}>
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
