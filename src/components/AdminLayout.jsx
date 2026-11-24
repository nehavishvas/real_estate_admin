import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStateContext } from '../context/StateContext';
import { getCookie } from '../utils/cookies';
import axios from 'axios';
import Sidebar from './Sidebar';
import { Bell, Search, Info, ShieldAlert, Sparkles, UserCheck, Menu, X, User, Lock, CheckCheck, Clock, ChevronDown, ChevronRight, LogOut, ShieldCheck } from 'lucide-react';

export default function AdminLayout() {
  const {
    adminUser,
    handleLogout: onLogout,
    pendingVerificationsCount,
    handleSessionRefresh: onSessionRefresh,
    notifications,
    setNotifications,
    notificationsLoading,
    handleMarkAllAsRead,
    handleMarkNotificationAsRead
  } = useStateContext();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const unreadCount = (notifications || []).filter(n => !n.read && !n.isRead).length;

  // Layout UI states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Refs for closing dropdowns when clicking outside
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        adminUser={adminUser}
        onLogout={onLogout}
        pendingVerificationsCount={pendingVerificationsCount}
        onSessionRefresh={onSessionRefresh}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Framework body */}
      <div className="main-content">

        {/* Top Header bar */}
        <header style={{
          height: 'var(--header-height)',
          background: 'rgba(250, 248, 245, 0.5)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          {/* Mobile hamburger menu toggle & breadcrumb title */}
          <div className="flex-align-center" style={{ gap: '1rem' }}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
                display: 'none', padding: '0.25rem'
              }}
              className="btn-mobile-hamburger"
            >
              <Menu size={22} />
            </button>

            <div className="flex-align-center" style={{ gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Speddy Control</span>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {activeTab === 'ai' ? 'AI configuration' : activeTab === 'agencies' ? 'Agency Management' : activeTab === 'tiers' ? 'Tier Management' : activeTab === 'terms' ? 'Terms & Conditions' : activeTab === 'terms-edit' ? 'Edit Terms & Conditions' : activeTab === 'privacy-policy' ? 'Privacy Policy' : activeTab === 'privacy-policy-edit' || activeTab === 'privacy-edit' ? 'Edit Privacy Policy' : activeTab}
              </span>
            </div>
          </div>

          {/* Right utility items */}
          <div className="flex-align-center" style={{ gap: '1.25rem' }}>

            {/* Search mock bar */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="header-search-bar">
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search global dashboard..."
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '0.35rem 1rem 0.35rem 2.2rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  width: '200px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Notifications Hub */}
            <div style={{ position: 'relative' }} ref={notificationDropdownRef}>
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                  padding: '0.5rem', display: 'flex', alignItems: 'center', position: 'relative'
                }}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px',
                    background: 'var(--danger)', borderRadius: '50%'
                  }} />
                )}
              </button>

              {/* Notification dropdown popover */}
              {showNotificationDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '360px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid rgba(10, 31, 57, 0.08)',
                  boxShadow: '0 20px 40px -10px rgba(10, 31, 57, 0.18), 0 2px 10px -2px rgba(10, 31, 57, 0.08)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.15rem',
                    background: '#faf8f5',
                    borderBottom: '1px solid rgba(10, 31, 57, 0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: 'rgba(250, 179, 25, 0.18)',
                          color: '#b47404',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        <CheckCheck size={14} />
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notification items list */}
                  <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {notificationsLoading && (!notifications || notifications.length === 0) ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Bell size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} className="animate-pulse" />
                        <p style={{ fontSize: '0.8125rem', margin: 0, fontWeight: 500 }}>Loading notifications...</p>
                      </div>
                    ) : (!notifications || notifications.length === 0) ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Bell size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                        <p style={{ fontSize: '0.8125rem', margin: 0, fontWeight: 500 }}>No notifications</p>
                        <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', opacity: 0.7 }}>You are all caught up!</p>
                      </div>
                    ) : (
                      notifications.map(n => {
                        const isWarning = n.type === 'warning' || (n.text || n.title || '').toLowerCase().includes('warning') || (n.text || n.title || '').toLowerCase().includes('timeout');
                        const isUser = n.type === 'user' || n.type === 'lead' || (n.text || n.title || '').toLowerCase().includes('realtor') || (n.text || n.title || '').toLowerCase().includes('verification') || (n.text || n.title || '').toLowerCase().includes('lead');
                        const isRead = Boolean(n.read || n.isRead);

                        return (
                          <div
                            key={n.id || n._id || Math.random()}
                            onClick={() => handleMarkNotificationAsRead(n.id || n._id)}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.85rem',
                              padding: '0.85rem 1.15rem',
                              borderBottom: '1px solid rgba(10, 31, 57, 0.05)',
                              background: isRead ? '#ffffff' : 'rgba(250, 179, 25, 0.04)',
                              borderLeft: isRead ? '3px solid transparent' : '3px solid var(--primary)',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isRead ? '#ffffff' : 'rgba(250, 179, 25, 0.04)'; }}
                          >
                            {/* Icon badge */}
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              background: isWarning
                                ? 'rgba(239, 68, 68, 0.1)'
                                : isUser
                                  ? 'rgba(250, 179, 25, 0.12)'
                                  : 'rgba(10, 31, 57, 0.06)',
                              color: isWarning
                                ? 'var(--danger)'
                                : isUser
                                  ? '#b47404'
                                  : 'var(--text-secondary)'
                            }}>
                              {isWarning ? (
                                <ShieldAlert size={16} />
                              ) : isUser ? (
                                <UserCheck size={16} />
                              ) : (
                                <Bell size={16} />
                              )}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontSize: '0.8125rem',
                                color: 'var(--text-primary)',
                                fontWeight: isRead ? 500 : 700,
                                margin: '0 0 0.25rem 0',
                                lineHeight: '1.4',
                                wordBreak: 'normal'
                              }}>
                                {n.title || n.text || n.message || 'Notification'}
                              </p>
                              {n.message && n.title && n.title !== n.message && (
                                <p style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)',
                                  margin: '0 0 0.25rem 0',
                                  lineHeight: '1.3',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {n.message}
                                </p>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={11} />
                                  {n.time || 'Recent'}
                                </span>
                                {!isRead && (
                                  <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>
                                    • Unread
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Unread indicator dot */}
                            {!isRead && (
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                flexShrink: 0,
                                marginTop: '6px'
                              }} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '0.65rem 1rem',
                    background: '#faf8f5',
                    borderTop: '1px solid rgba(10, 31, 57, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <button
                      onClick={() => {
                        navigate('/settings?tab=notifications', { state: { tab: 'notifications' } });
                        setShowNotificationDropdown(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View all Notification →
                    </button>
                    <button
                      onClick={() => {
                        setNotifications([]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    >
                      Clear list
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Dropdown Hub */}
            <div style={{ position: 'relative' }} ref={profileDropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="header-profile-btn"
                style={{
                  background: showProfileDropdown ? 'rgba(250, 179, 25, 0.08)' : 'transparent',
                  border: '1px solid',
                  borderColor: showProfileDropdown ? 'rgba(250, 179, 25, 0.35)' : 'transparent',
                  borderRadius: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.65rem 0.2rem 0.25rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={adminUser.avatar}
                    alt={adminUser.name}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--primary)',
                      display: 'block'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid #ffffff'
                  }} />
                </div>
                <span className="header-admin-name" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {adminUser.name}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--text-muted)',
                    transform: showProfileDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </button>

              {/* Profile dropdown panel */}
              {showProfileDropdown && (
                <div
                  className="profile-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '245px',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid rgba(10, 31, 57, 0.08)',
                    boxShadow: '0 16px 40px -6px rgba(10, 31, 57, 0.16), 0 6px 16px -2px rgba(0, 0, 0, 0.06)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {/* User Profile Header */}
                  <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.08) 0%, rgba(10, 31, 57, 0.02) 100%)',
                    borderBottom: '1px solid rgba(10, 31, 57, 0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={adminUser.avatar}
                          alt={adminUser.name}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--primary)',
                            boxShadow: '0 2px 8px rgba(250, 179, 25, 0.25)',
                            display: 'block'
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '11px',
                          height: '11px',
                          borderRadius: '50%',
                          background: '#10b981',
                          border: '2px solid #ffffff'
                        }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {adminUser.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background: 'rgba(250, 179, 25, 0.15)',
                            color: '#b47404',
                            padding: '1px 7px',
                            borderRadius: '5px'
                          }}>
                            {adminUser.role || 'Admin'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 500 }}>Active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: '0.45rem' }}>
                    <button
                      className="profile-menu-item"
                      onClick={() => {
                        navigate('/profile');
                        setShowProfileDropdown(false);
                      }}
                    >
                      <div className="profile-menu-icon" style={{ background: 'rgba(10, 31, 57, 0.05)', color: 'var(--text-primary)' }}>
                        <User size={15} />
                      </div>
                      <span style={{ flex: 1, fontWeight: 500, fontSize: '0.84rem' }}>Profile Details</span>
                      <ChevronRight size={14} className="profile-menu-arrow" />
                    </button>

                    <button
                      className="profile-menu-item"
                      onClick={() => {
                        navigate('/change-password');
                        setShowProfileDropdown(false);
                      }}
                    >
                      <div className="profile-menu-icon" style={{ background: 'rgba(10, 31, 57, 0.05)', color: 'var(--text-primary)' }}>
                        <Lock size={15} />
                      </div>
                      <span style={{ flex: 1, fontWeight: 500, fontSize: '0.84rem' }}>Change Password</span>
                      <ChevronRight size={14} className="profile-menu-arrow" />
                    </button>
                  </div>

                  {/* Soft Divider */}
                  <div style={{ height: '1px', background: 'rgba(10, 31, 57, 0.06)', margin: '0 0.5rem' }} />

                  {/* Sign Out Action */}
                  <div style={{ padding: '0.45rem' }}>
                    <button
                      className="profile-menu-item logout"
                      onClick={() => {
                        onLogout();
                        setShowProfileDropdown(false);
                      }}
                    >
                      <div className="profile-menu-icon logout">
                        <LogOut size={15} />
                      </div>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '0.84rem' }}>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Child views are rendered here by React Router */}
        <main className="content-body">
          <Outlet />
        </main>
      </div>



      {/* Inline styles for responsive layout header elements & dropdown styling */}
      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .header-profile-btn:hover {
          background: rgba(250, 179, 25, 0.08) !important;
          border-color: rgba(250, 179, 25, 0.25) !important;
        }

        .profile-menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.55rem 0.65rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-primary);
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }

        .profile-menu-item:hover {
          background: rgba(10, 31, 57, 0.04);
          color: var(--primary);
        }

        .profile-menu-item:hover .profile-menu-arrow {
          transform: translateX(2px);
          color: var(--primary);
        }

        .profile-menu-arrow {
          color: var(--text-muted);
          transition: transform 0.15s ease, color 0.15s ease;
        }

        .profile-menu-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justifyContent: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .profile-menu-item:hover .profile-menu-icon {
          background: rgba(250, 179, 25, 0.15) !important;
          color: var(--primary) !important;
        }

        .profile-menu-item.logout {
          color: #ef4444;
        }

        .profile-menu-item.logout:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #dc2626;
        }

        .profile-menu-icon.logout {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .profile-menu-item.logout:hover .profile-menu-icon.logout {
          background: rgba(239, 68, 68, 0.2) !important;
          color: #dc2626 !important;
        }

        @media (max-width: 992px) {
          .btn-mobile-hamburger {
            display: block !important;
          }
          .header-search-bar {
            display: none !important;
          }
          .header-admin-name {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
