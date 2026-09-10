import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCookie, setCookie, deleteCookie, setCookieMinutes, clearAllAuthCookies } from '../utils/cookies';
import { getNotifDetails, formatNotifDate } from '../utils/notificationUtils';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  initialUsers,
  initialRealtors,
  initialProperties,
  initialPortals,
  initialLogs,
  initialSyncLogs,
  initialBackups,
  initialAiSettings
} from '../dummyData';

const StateContext = createContext();

export function StateContextProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminUser, setAdminUser] = useState(() => {
    const cookieData = getCookie('klever_auth_data');
    if (!cookieData) {
      localStorage.removeItem('klever_admin_session');
      return null;
    }

    const userObj = cookieData.data?.user || cookieData.user;
    const tokenVal = cookieData.data?.accessToken || cookieData.data?.token || cookieData.accessToken || cookieData.token;
    const refreshTokenVal = cookieData.data?.refreshToken || cookieData.refreshToken || '';
    const expiresAtVal = cookieData.data?.expiresAt || cookieData.expiresAt || null;

    // Check if session has expired or token is missing (30-minute validity)
    if (!tokenVal || (expiresAtVal && Date.now() > expiresAtVal)) {
      deleteCookie('klever_auth_data');
      deleteCookie('token');
      localStorage.removeItem('klever_admin_session');
      return null;
    }

    const rawAvatar = userObj?.profileImage || userObj?.avatar || '';
    const serverUrl = (import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.98:5000/api').replace(/\/api$/, '');
    const avatarUrl = rawAvatar 
      ? (rawAvatar.startsWith('http') ? rawAvatar : `${serverUrl}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`)
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

    return {
      id: userObj?.id || userObj?._id || '',
      username: userObj?.email || '',
      email: userObj?.email || '',
      role: userObj?.role ? (userObj.role.charAt(0).toUpperCase() + userObj.role.slice(1).toLowerCase()) : 'Admin',
      name: userObj?.name || '',
      avatar: avatarUrl,
      rawAvatar: rawAvatar,
      token: tokenVal,
      accessToken: tokenVal,
      refreshToken: refreshTokenVal,
      expiresAt: expiresAtVal,
      tokenExpiresAt: expiresAtVal,
      phone: userObj?.phone || ''
    };
  });

  const [users, setUsers] = useState(initialUsers);
  const [realtors, setRealtors] = useState(initialRealtors);
  const [properties, setProperties] = useState(initialProperties);
  const [portals, setPortals] = useState(initialPortals);
  const [logs, setLogs] = useState(initialLogs);
  const [syncLogs, setSyncLogs] = useState(initialSyncLogs);
  const [backups, setBackups] = useState(initialBackups);
  const [aiSettings, setAiSettings] = useState(initialAiSettings);

  const [portalSyncState, setPortalSyncState] = useState({
    isSyncing: false,
    lastSyncTime: '2026-08-25 15:31',
    successRate: 98
  });

  const [notifications, setNotifications] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Helper to get auth token
  const getAuthToken = useCallback(() => {
    const cookieAuth = getCookie('klever_auth_data');
    return (
      adminUser?.token ||
      adminUser?.accessToken ||
      cookieAuth?.data?.accessToken ||
      cookieAuth?.data?.token ||
      cookieAuth?.accessToken ||
      cookieAuth?.token ||
      getCookie('token')
    );
  }, [adminUser]);

  // Dynamic Notification Fetcher
  const fetchNotifications = useCallback(async (isManual = false) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setNotificationsLoading(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.98:5000/api';

      const [listRes, countRes] = await Promise.allSettled([
        axios.get(`${baseUrl}/users/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/users/notifications/new`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (listRes.status === 'fulfilled') {
        const resData = listRes.value.data;
        let fetchedList = [];
        if (Array.isArray(resData?.data?.notifications)) {
          fetchedList = resData.data.notifications;
        } else if (Array.isArray(resData?.notifications)) {
          fetchedList = resData.notifications;
        } else if (Array.isArray(resData?.data)) {
          fetchedList = resData.data;
        } else if (Array.isArray(resData?.leads)) {
          fetchedList = resData.leads;
        } else if (Array.isArray(resData)) {
          fetchedList = resData;
        }

        setNotificationsList(fetchedList);

        const mapped = fetchedList.map(item => {
          const details = getNotifDetails(item);
          return {
            id: details.id,
            _id: details.id,
            text: details.title || details.message || 'Notification',
            title: details.title,
            message: details.message,
            read: details.isRead,
            isRead: details.isRead,
            time: formatNotifDate(details.date),
            date: details.date,
            type: details.type,
            leadData: details.leadData,
            raw: item
          };
        });

        setNotifications(mapped);
      }

      if (countRes.status === 'fulfilled') {
        const cData = countRes.value.data;
        let count = 0;
        if (typeof cData?.count === 'number') {
          count = cData.count;
        } else if (typeof cData?.data?.count === 'number') {
          count = cData.data.count;
        } else if (typeof cData?.data === 'number') {
          count = cData.data;
        } else if (typeof cData?.newNotifications === 'number') {
          count = cData.newNotifications;
        } else if (typeof cData?.newCount === 'number') {
          count = cData.newCount;
        } else if (typeof cData?.total === 'number') {
          count = cData.total;
        } else if (Array.isArray(cData?.data)) {
          count = cData.data.length;
        } else if (Array.isArray(cData)) {
          count = cData.length;
        }
        setNewNotificationsCount(count);
      }

      if (isManual) {
        toast.success('Notifications & leads refreshed successfully');
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
      if (isManual) {
        toast.error('Failed to refresh notifications');
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, [getAuthToken]);

  // Auto-fetch notifications when authenticated
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchNotifications();
    }
  }, [adminUser?.token, getAuthToken, fetchNotifications]);

  // Periodic polling for notifications (every 30 seconds)
  useEffect(() => {
    if (!adminUser) return;
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [adminUser, fetchNotifications]);

  // Mark all notifications as read handler
  const handleMarkAllAsRead = useCallback(async () => {
    const token = getAuthToken();

    // Optimistically mark all as read in UI
    setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    setNotificationsList(prev => prev.map(item => ({ ...item, isRead: true, read: true, status: 'read', unread: false })));
    setNewNotificationsCount(0);

    if (token) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.98:5000/api';
        try {
          await axios.put(`${baseUrl}/users/notifications/read-all`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (putErr) {
          if (putErr.response?.status === 405 || putErr.response?.status === 404) {
            await axios.post(`${baseUrl}/users/notifications/read-all`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        }
      } catch (e) {
        console.warn('Failed to mark all notifications as read on server:', e);
      }
    }
  }, [getAuthToken]);

  // Mark single notification as read
  const handleMarkNotificationAsRead = useCallback((id) => {
    if (!id) return;
    setNotifications(prev => prev.map(item => (item.id === id || item._id === id) ? { ...item, read: true, isRead: true } : item));
    setNotificationsList(prev => prev.map(item => (item.id === id || item._id === id) ? { ...item, isRead: true, read: true, status: 'read', unread: false } : item));
  }, []);

  // Delete notification handler
  const handleDeleteNotification = useCallback(async (id) => {
    if (!id) return;
    setNotifications(prev => prev.filter(item => item.id !== id && item._id !== id));
    setNotificationsList(prev => prev.filter(item => (item._id || item.id) !== id));
    setNewNotificationsCount(prev => Math.max(0, prev - 1));

    const token = getAuthToken();
    if (token) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.98:5000/api';
        await axios.delete(`${baseUrl}/users/notifications/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.warn('Failed to delete notification on server:', e);
      }
    }
  }, [getAuthToken]);

  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('klever_notification_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved notification settings', e);
    }
    return {
      notificationsEnabled: true,
      emailBuyerReg: true,
      emailRealtorApp: true,
      emailSyncFailure: true,
      emailSecurityAlert: true,
      emailWeeklyDigest: false,
      inAppLeadInquiry: true,
      inAppStatusChange: true,
      soundAlerts: true,
      primaryAlertEmail: 'admin@speddyprop.com',
      secondaryAlertEmail: 'security-ops@speddyprop.com'
    };
  });

  const handleUpdateNotificationSettings = useCallback((newSettings) => {
    setNotificationSettings(prev => {
      const updated = typeof newSettings === 'function' ? newSettings(prev) : { ...prev, ...newSettings };
      try {
        localStorage.setItem('klever_notification_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save notification settings to localStorage', e);
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    if (adminUser) {
      localStorage.setItem('klever_admin_session', JSON.stringify(adminUser));
      // Keep the cookies in sync with updated profile details
      const existingCookie = getCookie('klever_auth_data');
      if (existingCookie) {
        const updatedCookie = {
          ...existingCookie,
          data: existingCookie.data ? {
            ...existingCookie.data,
            user: {
              ...existingCookie.data.user,
              name: adminUser.name,
              email: adminUser.username,
              phone: adminUser.phone,
              avatar: adminUser.avatar,
              role: adminUser.role
            }
          } : undefined,
          user: {
            ...existingCookie.user,
            name: adminUser.name,
            email: adminUser.username,
            phone: adminUser.phone,
            avatar: adminUser.avatar,
            role: adminUser.role
          },
          // Fallbacks for flat structures
          name: adminUser.name,
          email: adminUser.username,
          phone: adminUser.phone,
          avatar: adminUser.avatar,
          role: adminUser.role
        };
        const remainingDays = adminUser.expiresAt 
          ? Math.max(0, (adminUser.expiresAt - Date.now()) / 864e5)
          : (30 / 1440);
        setCookie('klever_auth_data', updatedCookie, remainingDays || (30 / 1440));
      }
    } else {
      localStorage.removeItem('klever_admin_session');
      deleteCookie('klever_auth_data');
    }
  }, [adminUser]);

  const addAuditLog = useCallback((category, details) => {
    const newLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString(),
      user: adminUser ? adminUser.name : 'System Scheduler',
      category,
      details,
      ip: '192.168.1.45'
    };
    setLogs(prev => [newLog, ...prev]);
  }, [adminUser]);

  const handleLogin = (user) => {
    setAdminUser(user);
    const target = (location.pathname === '/' || location.pathname === '/login') ? '/dashboard' : location.pathname;
    navigate(target, { replace: true });
  };

  const handleLogout = useCallback(() => {
    // Clear all user details and tokens from cookies
    clearAllAuthCookies();

    // Clear local storage and session storage
    localStorage.removeItem('klever_admin_session');
    localStorage.clear();
    sessionStorage.clear();

    // Reset in-memory admin user state
    setAdminUser(null);

    // Redirect to login
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleSessionRefresh = useCallback(async (showToast = true) => {
    const cookieAuth = getCookie('klever_auth_data');
    const currentRefreshToken =
      adminUser?.refreshToken ||
      cookieAuth?.data?.refreshToken ||
      cookieAuth?.refreshToken ||
      getCookie('klever_refresh_token');

    if (!currentRefreshToken) {
      if (showToast) toast.error('No refresh token found. Please log in again.');
      return false;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.98:5000/api';
      const payload = { refreshToken: currentRefreshToken };
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(adminUser?.token ? { Authorization: `Bearer ${adminUser.token}` } : {})
        }
      };

      let response;
      try {
        response = await axios.post(`${baseUrl}/users/refresh-token`, payload, config);
      } catch (err) {
        if (err.response?.status === 404) {
          response = await axios.post(`${baseUrl}/refresh-token`, payload, config);
        } else {
          throw err;
        }
      }

      const resData = response.data;
      const newAccessToken = resData?.data?.accessToken || resData?.accessToken || resData?.data?.token || resData?.token;
      const newRefreshToken = resData?.data?.refreshToken || resData?.refreshToken || currentRefreshToken;

      if (!newAccessToken) {
        throw new Error('New access token was not returned');
      }

      // Helper to parse JWT expiration timestamp
      const parseJwtExp = (token) => {
        try {
          if (!token || typeof token !== 'string') return null;
          const parts = token.split('.');
          if (parts.length < 2) return null;
          const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          return decoded.exp ? decoded.exp * 1000 : null;
        } catch {
          return null;
        }
      };

      const newExpiresAt = parseJwtExp(newAccessToken) || (Date.now() + 30 * 60 * 1000);
      const validityMinutes = Math.max(1, Math.round((newExpiresAt - Date.now()) / (60 * 1000)));

      // Update in-memory user state
      setAdminUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          token: newAccessToken,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt: newExpiresAt,
          tokenExpiresAt: newExpiresAt
        };
      });

      // Update cookies
      const existingCookie = getCookie('klever_auth_data') || {};
      const updatedCookie = {
        ...existingCookie,
        data: {
          ...(existingCookie.data || {}),
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          token: newAccessToken,
          expiresAt: newExpiresAt,
          expiresIn: 1800
        },
        token: newAccessToken,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt
      };

      setCookieMinutes('klever_auth_data', updatedCookie, validityMinutes || 30);
      setCookieMinutes('token', newAccessToken, validityMinutes || 30);
      if (newRefreshToken) {
        setCookie('klever_refresh_token', newRefreshToken, 7);
      }

      addAuditLog('Security', 'Auto-refreshed administrative session token via API');
      if (showToast) {
        toast.success(resData?.message || 'Session token refreshed successfully');
      }
      return true;
    } catch (err) {
      console.error('Refresh token error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to refresh session token';
      if (showToast) {
        toast.error(errMsg);
      }
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
      return false;
    }
  }, [adminUser, addAuditLog, handleLogout]);

  // Proactive Auto-Refresh Watchdog: Checks every 10 seconds.
  // When 30-min token is nearing expiry (<= 2 minutes remaining) or expired, auto-refreshes silently.
  useEffect(() => {
    if (!adminUser) return;

    const checkAndRefreshToken = async () => {
      const expiresAt = adminUser.expiresAt || adminUser.tokenExpiresAt;
      if (!expiresAt) return;

      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 2 * 60 * 1000) {
        console.log('Session token nearing expiry, auto-refreshing via refresh-token API...');
        await handleSessionRefresh(false);
      }
    };

    const interval = setInterval(checkAndRefreshToken, 10000);
    return () => clearInterval(interval);
  }, [adminUser, handleSessionRefresh]);

  // Reactive Axios 401 Interceptor: Auto-refreshes on 401 Unauthorized and retries request
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/users/login') &&
          !originalRequest.url?.includes('/refresh-token')
        ) {
          originalRequest._retry = true;
          console.warn('API returned 401 Unauthorized. Auto-refreshing session token...');
          const success = await handleSessionRefresh(false);
          if (success) {
            const currentCookie = getCookie('klever_auth_data');
            const newToken = currentCookie?.data?.accessToken || currentCookie?.token;
            if (newToken) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          } else {
            handleLogout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [handleSessionRefresh, handleLogout]);

  const handleAddUser = (user) => setUsers(prev => [user, ...prev]);
  const handleUpdateUser = (updated) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  const handleDeleteUser = (id) => setUsers(prev => prev.filter(u => u.id !== id));

  const handleUpdateRealtor = (updated) => setRealtors(prev => prev.map(r => r.id === updated.id ? updated : r));

  const handleAddProperty = (prop) => setProperties(prev => [prop, ...prev]);
  const handleUpdateProperty = (updated) => setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
  const handleDeleteProperty = (id) => setProperties(prev => prev.filter(p => p.id !== id));

  const handleMergeProperties = (masterId, deleteId) => {
    setProperties(prev => prev
      .filter(p => p.id !== deleteId)
      .map(p => p.id === masterId ? { ...p, isDuplicate: false } : p)
    );
  };

  const handleUpdatePortal = (updated) => setPortals(prev => prev.map(p => p.id === updated.id ? updated : p));

  const handleTriggerSyncStart = () => {
    setPortalSyncState(prev => ({ ...prev, isSyncing: true }));

    setTimeout(() => {
      setPortalSyncState({
        isSyncing: false,
        lastSyncTime: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString(),
        successRate: 100
      });
      const nextId = 'slog-' + Date.now();
      setSyncLogs(prev => [
        { id: nextId, timestamp: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString(), sources: 'SuperCasas feed, Corotos scraper', imported: 85, failed: 0, duration: '6.6s', status: 'Success' },
        ...prev
      ]);
    }, 7000);
  };

  const handleAddBackup = (backup) => setBackups(prev => [backup, ...prev]);
  const handleRestoreBackup = () => {
    setProperties(initialProperties);
    setRealtors(initialRealtors);
  };

  const handleUpdateAiSettings = (settings) => setAiSettings(settings);

  const pendingVerificationsCount = realtors.filter(r => r.status === 'Pending').length;

  return (
    <StateContext.Provider value={{
      adminUser,
      setAdminUser,
      users,
      realtors,
      properties,
      portals,
      logs,
      syncLogs,
      backups,
      aiSettings,
      portalSyncState,
      notifications,
      setNotifications,
      notificationsList,
      setNotificationsList,
      newNotificationsCount,
      setNewNotificationsCount,
      notificationsLoading,
      fetchNotifications,
      handleMarkAllAsRead,
      handleMarkNotificationAsRead,
      handleDeleteNotification,
      notificationSettings,
      handleUpdateNotificationSettings,
      addAuditLog,
      handleLogin,
      handleLogout,
      handleSessionRefresh,
      handleAddUser,
      handleUpdateUser,
      handleDeleteUser,
      handleUpdateRealtor,
      handleAddProperty,
      handleUpdateProperty,
      handleDeleteProperty,
      handleMergeProperties,
      handleUpdatePortal,
      handleTriggerSyncStart,
      handleAddBackup,
      handleRestoreBackup,
      handleUpdateAiSettings,
      pendingVerificationsCount
    }}>
      {children}
    </StateContext.Provider>
  );
}

export function useStateContext() {
  return useContext(StateContext);
}
