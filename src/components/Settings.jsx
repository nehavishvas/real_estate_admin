import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import { getCookie } from '../utils/cookies';
import { getNotifDetails, formatNotifDate } from '../utils/notificationUtils';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Shield,
  Key,
  Save,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Mail,
  Loader2,
  Volume2,
  Check,
  CheckCircle2,
  CheckCheck,
  BellRing,
  Smartphone,
  Radio,
  Sparkles,
  Trash2,
  RefreshCw,
  Search,
  Inbox,
  AlertCircle,
  AlertTriangle,
  X,
  Clock,
  User,
  Phone,
  Sliders,
  Building,
  Globe
} from 'lucide-react';

// Custom Modern Animated Toggle Switch
const ToggleSwitch = ({ checked, onChange, label, description, disabled = false, badgeText }) => {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className="flex-between"
      onClick={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '0.85rem 0',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
    >
      <div style={{ paddingRight: '1rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</span>
          <span
            style={{
              fontSize: '0.675rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              background: checked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
              color: checked ? '#059669' : '#dc2626',
              border: `1px solid ${checked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`
            }}
          >
            {checked ? (badgeText || 'Enabled') : 'Disabled'}
          </span>
        </div>
        {description && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
            {description}
          </div>
        )}
      </div>

      <div
        style={{
          width: '48px',
          height: '26px',
          borderRadius: '13px',
          background: checked ? '#10b981' : 'rgba(10, 31, 57, 0.18)',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: checked ? '0 2px 10px rgba(16, 185, 129, 0.4)' : 'none',
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
            transform: checked ? 'translateX(22px)' : 'translateX(0px)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
    </div>
  );
};

export default function SettingsComponent() {
  const {
    adminUser,
    notificationSettings,
    handleUpdateNotificationSettings,
    addAuditLog: onAddAuditLog,
    notifications,
    setNotifications,
    notificationsList: globalNotifsList,
    setNotificationsList: setGlobalNotifsList,
    newNotificationsCount: globalNewCount,
    setNewNotificationsCount: setGlobalNewCount,
    notificationsLoading: globalNotifsLoading
  } = useStateContext();

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = searchParams.get('tab') || location.state?.tab || 'notifications';

  // Subtabs: 'notifications' | 'password' | 'security'
  const [activeSettingsTab, setActiveSettingsTab] = useState(initialTab);

  // Sync tab if URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || location.state?.tab;
    if (tabFromUrl && ['notifications', 'password', 'security'].includes(tabFromUrl)) {
      setActiveSettingsTab(tabFromUrl);
    }
  }, [searchParams, location.state]);

  // ================= 1. CHANGE PASSWORD STATE =================
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ================= 2. NOTIFICATION STATE & APIS =================
  const [notificationsList, setNotificationsList] = useState(() => {
    if (globalNotifsList && globalNotifsList.length > 0) return globalNotifsList;
    if (notifications && notifications.length > 0) return notifications.map(n => n.raw || n);
    return [];
  });
  const [newNotificationsCount, setNewNotificationsCount] = useState(globalNewCount || 0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [deletingNotifId, setDeletingNotifId] = useState(null);
  const [notifToDelete, setNotifToDelete] = useState(null);
  const [notifSearchQuery, setNotifSearchQuery] = useState('');
  const [notifFilterTab, setNotifFilterTab] = useState('all'); // 'all' | 'unread'

  // Keep local list in sync with global list if updated outside
  useEffect(() => {
    if (globalNotifsList && globalNotifsList.length > 0) {
      setNotificationsList(globalNotifsList);
    } else if (notifications && notifications.length > 0 && notificationsList.length === 0) {
      setNotificationsList(notifications.map(n => n.raw || n));
    }
  }, [globalNotifsList, notifications]);

  useEffect(() => {
    if (typeof globalNewCount === 'number') {
      setNewNotificationsCount(globalNewCount);
    }
  }, [globalNewCount]);

  // Preferences state
  const [notificationsMaster, setNotificationsMaster] = useState(
    notificationSettings?.notificationsEnabled ?? true
  );
  const [notifEmailBuyerReg, setNotifEmailBuyerReg] = useState(
    notificationSettings?.emailBuyerReg ?? true
  );
  const [notifEmailRealtorApp, setNotifEmailRealtorApp] = useState(
    notificationSettings?.emailRealtorApp ?? true
  );
  const [notifEmailSyncFailure, setNotifEmailSyncFailure] = useState(
    notificationSettings?.emailSyncFailure ?? true
  );
  const [notifEmailSecurityAlert, setNotifEmailSecurityAlert] = useState(
    notificationSettings?.emailSecurityAlert ?? true
  );

  const [notifInAppLeadInquiry, setNotifInAppLeadInquiry] = useState(
    notificationSettings?.inAppLeadInquiry ?? true
  );
  const [notifInAppStatusChange, setNotifInAppStatusChange] = useState(
    notificationSettings?.inAppStatusChange ?? true
  );
  const [notifSoundAlerts, setNotifSoundAlerts] = useState(
    notificationSettings?.soundAlerts ?? true
  );

  const [primaryAlertEmail, setPrimaryAlertEmail] = useState(
    notificationSettings?.primaryAlertEmail || adminUser?.email || 'admin@speddyprop.com'
  );
  const [secondaryAlertEmail, setSecondaryAlertEmail] = useState(
    notificationSettings?.secondaryAlertEmail || 'security-ops@speddyprop.com'
  );
  const [notifSaving, setNotifSaving] = useState(false);

  // Helper to get auth token
  const getAuthToken = () => {
    return (
      adminUser?.token ||
      getCookie('token') ||
      getCookie('klever_auth_data')?.data?.accessToken ||
      getCookie('klever_auth_data')?.data?.token ||
      getCookie('klever_auth_data')?.token
    );
  };

  // 1. FETCH NOTIFICATIONS & COUNT NEW
  const fetchNotifications = useCallback(async (isManualRefresh = false) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setNotificationsLoading(true);

      const [listRes, countRes] = await Promise.allSettled([
        axios.get(`${baseUrl}/users/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/users/notifications/new`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Extract notifications list
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
        if (setGlobalNotifsList) {
          setGlobalNotifsList(fetchedList);
        }

        // Keep context in sync if setter exists
        if (setNotifications && fetchedList.length > 0) {
          setNotifications(fetchedList.map(item => {
            const details = getNotifDetails(item);
            return {
              id: details.id,
              _id: details.id,
              text: details.title || details.message,
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
          }));
        }
      } else {
        console.warn('Failed to fetch /users/notifications:', listRes.reason);
      }

      // Extract new notifications count
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
        if (setGlobalNewCount) {
          setGlobalNewCount(count);
        }
      } else {
        console.warn('Failed to fetch /users/notifications/new:', countRes.reason);
      }

      if (isManualRefresh) {
        toast.success('Notifications & leads refreshed successfully');
      }
    } catch (err) {
      console.error('Error in fetchNotifications:', err);
      if (isManualRefresh) {
        toast.error('Failed to refresh notifications');
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, [baseUrl, setNotifications, setGlobalNotifsList, setGlobalNewCount]);

  // Initial fetch and auto-refresh when notifications tab is active
  useEffect(() => {
    if (activeSettingsTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeSettingsTab, fetchNotifications]);

  // 2. DELETE NOTIFICATION HANDLER
  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    if (!id || deletingNotifId) return;

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required to delete notification');
      return;
    }

    try {
      setDeletingNotifId(id);
      const res = await axios.delete(`${baseUrl}/users/notifications/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success(res.data?.message || 'Notification deleted successfully');
      
      // Update local and global lists
      setNotificationsList(prev => prev.filter(item => (item._id || item.id) !== id));
      if (setGlobalNotifsList) {
        setGlobalNotifsList(prev => prev.filter(item => (item._id || item.id) !== id));
      }
      setNewNotificationsCount(prev => Math.max(0, prev - 1));
      if (setGlobalNewCount) {
        setGlobalNewCount(prev => Math.max(0, prev - 1));
      }

      if (setNotifications) {
        setNotifications(prev => prev.filter(item => (item.id !== id && item._id !== id)));
      }

      if (onAddAuditLog) {
        onAddAuditLog('Notifications', `Admin deleted notification ID: ${id}`);
      }
      setNotifToDelete(null);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      toast.error(err.response?.data?.message || 'Failed to delete notification');
    } finally {
      setDeletingNotifId(null);
    }
  };

  // 3. MARK ALL NOTIFICATIONS AS READ HANDLER
  // URL: /users/notifications/read-all
  // Method: PUT
  // Auth: yes
  const handleMarkAllAsRead = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required to update notifications');
      return;
    }

    try {
      setMarkingAllRead(true);
      let res;
      try {
        res = await axios.put(`${baseUrl}/users/notifications/read-all`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (putErr) {
        // Fallback to POST or PATCH if endpoint differs on method
        if (putErr.response?.status === 405 || putErr.response?.status === 404) {
          res = await axios.post(`${baseUrl}/users/notifications/read-all`, {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } else {
          throw putErr;
        }
      }

      toast.success(res?.data?.message || 'All notifications marked as read');

      // Update local notifications list - set all to read
      setNotificationsList((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          read: true,
          status: 'read',
          unread: false
        }))
      );
      if (setGlobalNotifsList) {
        setGlobalNotifsList((prev) =>
          prev.map((item) => ({
            ...item,
            isRead: true,
            read: true,
            status: 'read',
            unread: false
          }))
        );
      }
      setNewNotificationsCount(0);
      if (setGlobalNewCount) {
        setGlobalNewCount(0);
      }

      // Keep context notifications in sync
      if (setNotifications) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
      }

      if (onAddAuditLog) {
        onAddAuditLog('Notifications', 'Admin marked all notifications as read');
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to mark notifications as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Filtered notifications calculation
  const filteredNotifications = useMemo(() => {
    return notificationsList.filter((item) => {
      const details = getNotifDetails(item);
      
      // Filter by unread tab if selected
      if (notifFilterTab === 'unread' && !details.isUnread) return false;

      // Filter by search text
      if (notifSearchQuery.trim()) {
        const q = notifSearchQuery.toLowerCase();
        const matchTitle = (details.title || '').toLowerCase().includes(q);
        const matchMsg = (details.message || '').toLowerCase().includes(q);
        const matchLeadName = (details.leadData?.name || '').toLowerCase().includes(q);
        const matchLeadEmail = (details.leadData?.email || '').toLowerCase().includes(q);
        const matchLeadPhone = (details.leadData?.phone || '').toLowerCase().includes(q);
        const matchProp = (details.leadData?.property || '').toLowerCase().includes(q);
        return matchTitle || matchMsg || matchLeadName || matchLeadEmail || matchLeadPhone || matchProp;
      }

      return true;
    });
  }, [notificationsList, notifFilterTab, notifSearchQuery]);

  // Dynamic unread count calculated from current list
  const unreadNotificationsCount = useMemo(() => {
    return notificationsList.filter((item) => getNotifDetails(item).isUnread).length;
  }, [notificationsList]);

  // Unread count to display across tabs & badges
  const displayUnreadCount = unreadNotificationsCount;

  // Keep state synced with context
  useEffect(() => {
    if (notificationSettings) {
      setNotificationsMaster(notificationSettings.notificationsEnabled ?? true);
      setNotifEmailBuyerReg(notificationSettings.emailBuyerReg ?? true);
      setNotifEmailRealtorApp(notificationSettings.emailRealtorApp ?? true);
      setNotifEmailSyncFailure(notificationSettings.emailSyncFailure ?? true);
      setNotifEmailSecurityAlert(notificationSettings.emailSecurityAlert ?? true);
      setNotifInAppLeadInquiry(notificationSettings.inAppLeadInquiry ?? true);
      setNotifInAppStatusChange(notificationSettings.inAppStatusChange ?? true);
      setNotifSoundAlerts(notificationSettings.soundAlerts ?? true);
      if (notificationSettings.primaryAlertEmail) setPrimaryAlertEmail(notificationSettings.primaryAlertEmail);
      if (notificationSettings.secondaryAlertEmail) setSecondaryAlertEmail(notificationSettings.secondaryAlertEmail);
    }
  }, [notificationSettings]);

  // ================= 3. APPLICATION SETTINGS STATE =================
  const [appName, setAppName] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('klever_general_settings') || '{}');
      return cached.appName || 'SpeddyProp';
    } catch {
      return 'SpeddyProp';
    }
  });
  const [supportEmail, setSupportEmail] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('klever_general_settings') || '{}');
      return cached.supportEmail || 'speddyprop@support.com';
    } catch {
      return 'speddyprop@support.com';
    }
  });
  const [supportNumber, setSupportNumber] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('klever_general_settings') || '{}');
      return cached.supportNumber || '042374782';
    } catch {
      return '042374782';
    }
  });
  const [generalSettingsLoading, setGeneralSettingsLoading] = useState(false);
  const [generalSettingsSaving, setGeneralSettingsSaving] = useState(false);
  const [generalSettingsLoaded, setGeneralSettingsLoaded] = useState(false);

  // FETCH APPLICATION SETTINGS: GET /admin/settings/general (Auth: yes) with endpoint fallbacks
  const fetchGeneralSettings = useCallback(async (isManualRefresh = false) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setGeneralSettingsLoading(true);
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const candidateUrls = [
        `${baseUrl}/admin/settings/general`,
        `${baseUrl}/admin/setting/general`,
        `${baseUrl}/admin/settings`,
        `${baseUrl}/admin/setting`,
        `${baseUrl}/admin/general-settings`,
        `${baseUrl}/admin/general-setting`,
        `${baseUrl}/settings/general`,
        `${baseUrl}/setting/general`
      ];

      let res = null;
      let lastErr = null;

      for (const url of candidateUrls) {
        try {
          const response = await axios.get(url, { headers });
          if (response && (response.status === 200 || response.data?.success !== false)) {
            res = response;
            break;
          }
        } catch (err) {
          lastErr = err;
          // Continue trying next candidate on 404 or 405
          if (err.response?.status === 404 || err.response?.status === 405) {
            continue;
          } else {
            // Re-throw if authentication or network level fatal error
            throw err;
          }
        }
      }

      if (!res && lastErr && lastErr.response?.status !== 404) {
        throw lastErr;
      }

      if (res) {
        const data = res.data?.data?.setting || res.data?.data?.settings || res.data?.data || res.data?.setting || res.data?.settings || res.data;
        if (data && typeof data === 'object') {
          if (data.appName) setAppName(data.appName);
          if (data.supportEmail) setSupportEmail(data.supportEmail);
          if (data.supportNumber) setSupportNumber(data.supportNumber);

          try {
            localStorage.setItem('klever_general_settings', JSON.stringify({
              appName: data.appName || '',
              supportEmail: data.supportEmail || '',
              supportNumber: data.supportNumber || ''
            }));
          } catch (storageErr) {
            console.warn('Failed to cache settings in localStorage', storageErr);
          }
        }
      }

      setGeneralSettingsLoaded(true);
      if (isManualRefresh) {
        toast.success('Application settings refreshed');
      }
    } catch (err) {
      console.error('Failed to fetch application settings:', err);
      // Fallback to local storage if API call fails
      try {
        const cached = JSON.parse(localStorage.getItem('klever_general_settings') || '{}');
        if (cached.appName) setAppName(cached.appName);
        if (cached.supportEmail) setSupportEmail(cached.supportEmail);
        if (cached.supportNumber) setSupportNumber(cached.supportNumber);
      } catch (e) {
        console.warn('Failed to parse cached settings', e);
      }
      setGeneralSettingsLoaded(true);
      if (isManualRefresh) {
        toast.error(err.response?.data?.message || 'Failed to refresh application settings');
      }
    } finally {
      setGeneralSettingsLoading(false);
    }
  }, [baseUrl]);

  // Initial load when active tab is security or on mount
  useEffect(() => {
    if (activeSettingsTab === 'security' && !generalSettingsLoaded) {
      fetchGeneralSettings();
    }
  }, [activeSettingsTab, fetchGeneralSettings, generalSettingsLoaded]);

  // 1. CHANGE PASSWORD SUBMISSION
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!oldPassword || !newPassword) {
      toast.error('Please enter both Old Password and New Password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setPasswordLoading(true);
      
      const payload = {
        oldPassword: oldPassword,
        newPassword: newPassword
      };

      const headers = {
        Authorization: `Bearer ${token}`
      };

      let res;
      try {
        res = await axios.put(`${baseUrl}/users/change-password`, payload, { headers });
      } catch (putErr) {
        // If method is POST instead of PUT, attempt fallback
        if (putErr.response?.status === 405 || putErr.response?.status === 404) {
          res = await axios.post(`${baseUrl}/users/change-password`, payload, { headers });
        } else {
          throw putErr;
        }
      }

      if (res?.data?.success === false) {
        toast.error(res.data?.message || 'Old password is incorrect');
        return;
      }

      toast.success(res?.data?.message || 'Password changed successfully!');
      if (onAddAuditLog) {
        onAddAuditLog('Security', 'Admin updated account login credentials via System Settings');
      }

      // Reset fields
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      console.error('Failed to change password:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to update password. Please verify your old password.';
      toast.error(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Helper to update individual notification setting and persist immediately
  const handleToggleNotification = (key, value) => {
    // If enabling any sub-notification, ensure master is also enabled
    const nextMaster = key === 'notificationsEnabled' ? value : (value ? true : notificationsMaster);

    const updated = {
      notificationsEnabled: nextMaster,
      emailBuyerReg: key === 'emailBuyerReg' ? value : notifEmailBuyerReg,
      emailRealtorApp: key === 'emailRealtorApp' ? value : notifEmailRealtorApp,
      emailSyncFailure: key === 'emailSyncFailure' ? value : notifEmailSyncFailure,
      emailSecurityAlert: key === 'emailSecurityAlert' ? value : notifEmailSecurityAlert,
      inAppLeadInquiry: key === 'inAppLeadInquiry' ? value : notifInAppLeadInquiry,
      inAppStatusChange: key === 'inAppStatusChange' ? value : notifInAppStatusChange,
      soundAlerts: key === 'soundAlerts' ? value : notifSoundAlerts,
      primaryAlertEmail,
      secondaryAlertEmail,
      [key]: value
    };

    // If master is toggled ON, and user wants all enabled, enable all sub-toggles
    if (key === 'notificationsEnabled' && value === true) {
      updated.emailBuyerReg = true;
      updated.emailRealtorApp = true;
      updated.emailSyncFailure = true;
      updated.emailSecurityAlert = true;
      updated.inAppLeadInquiry = true;
      updated.inAppStatusChange = true;
      updated.soundAlerts = true;

      setNotifEmailBuyerReg(true);
      setNotifEmailRealtorApp(true);
      setNotifEmailSyncFailure(true);
      setNotifEmailSecurityAlert(true);
      setNotifInAppLeadInquiry(true);
      setNotifInAppStatusChange(true);
      setNotifSoundAlerts(true);
    }

    // Update local state
    if (key === 'notificationsEnabled') {
      setNotificationsMaster(value);
    } else {
      if (value) setNotificationsMaster(true);
      if (key === 'emailBuyerReg') setNotifEmailBuyerReg(value);
      if (key === 'emailRealtorApp') setNotifEmailRealtorApp(value);
      if (key === 'emailSyncFailure') setNotifEmailSyncFailure(value);
      if (key === 'emailSecurityAlert') setNotifEmailSecurityAlert(value);
      if (key === 'inAppLeadInquiry') setNotifInAppLeadInquiry(value);
      if (key === 'inAppStatusChange') setNotifInAppStatusChange(value);
      if (key === 'soundAlerts') setNotifSoundAlerts(value);
    }

    // Persist to context and localStorage
    if (handleUpdateNotificationSettings) {
      handleUpdateNotificationSettings(updated);
    }

    const friendlyName = {
      notificationsEnabled: 'Global Platform Notifications',
      emailBuyerReg: 'Buyer Registration Email Alerts',
      emailRealtorApp: 'Realtor Application Email Alerts',
      emailSyncFailure: 'Crawler Sync Exception Alerts',
      emailSecurityAlert: 'Security Warning Alerts',
      inAppLeadInquiry: 'In-App Lead Inquiry Alerts',
      inAppStatusChange: 'Property Status Change Alerts',
      soundAlerts: 'Dashboard Sound Alerts'
    }[key] || key.replace(/([A-Z])/g, ' $1');

    toast.success(`${friendlyName} ${value ? 'enabled' : 'disabled'}`);
  };

  // Helper to enable or disable all notifications in one click
  const handleSetAllNotifications = (enableAll) => {
    const updated = {
      notificationsEnabled: enableAll,
      emailBuyerReg: enableAll,
      emailRealtorApp: enableAll,
      emailSyncFailure: enableAll,
      emailSecurityAlert: enableAll,
      inAppLeadInquiry: enableAll,
      inAppStatusChange: enableAll,
      soundAlerts: enableAll,
      primaryAlertEmail,
      secondaryAlertEmail
    };

    setNotificationsMaster(enableAll);
    setNotifEmailBuyerReg(enableAll);
    setNotifEmailRealtorApp(enableAll);
    setNotifEmailSyncFailure(enableAll);
    setNotifEmailSecurityAlert(enableAll);
    setNotifInAppLeadInquiry(enableAll);
    setNotifInAppStatusChange(enableAll);
    setNotifSoundAlerts(enableAll);

    if (handleUpdateNotificationSettings) {
      handleUpdateNotificationSettings(updated);
    }

    toast.success(enableAll ? 'All notifications have been enabled!' : 'All notifications have been muted.');
  };

  // 2. SAVE NOTIFICATION PREFERENCES (FORM SUBMIT)
  const handleSaveNotifications = (e) => {
    e.preventDefault();
    setNotifSaving(true);

    const updated = {
      notificationsEnabled: notificationsMaster,
      emailBuyerReg: notifEmailBuyerReg,
      emailRealtorApp: notifEmailRealtorApp,
      emailSyncFailure: notifEmailSyncFailure,
      emailSecurityAlert: notifEmailSecurityAlert,
      inAppLeadInquiry: notifInAppLeadInquiry,
      inAppStatusChange: notifInAppStatusChange,
      soundAlerts: notifSoundAlerts,
      primaryAlertEmail,
      secondaryAlertEmail
    };

    if (handleUpdateNotificationSettings) {
      handleUpdateNotificationSettings(updated);
    }

    setTimeout(() => {
      setNotifSaving(false);
      toast.success('Notification settings saved and enabled successfully!');
      if (onAddAuditLog) {
        onAddAuditLog('Settings', `Updated notification routing rules for ${primaryAlertEmail}`);
      }
    }, 300);
  };

  // 3. SAVE GENERAL & SECURITY SETTINGS: PUT /admin/setting/general (Auth: yes) with method & endpoint fallbacks
  const handleSaveGeneralAndSecurity = async (e) => {
    e.preventDefault();

    if (!appName.trim()) {
      toast.error('Application name is required');
      return;
    }
    if (!supportEmail.trim()) {
      toast.error('Please enter a valid support email address');
      return;
    }
    if (!supportNumber.trim()) {
      toast.error('Please enter a support contact phone number');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setGeneralSettingsSaving(true);
      const payload = {
        appName: appName.trim(),
        supportEmail: supportEmail.trim(),
        supportNumber: supportNumber.trim()
      };

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Candidate methods & endpoints in priority order (primary: PUT /admin/settings/general)
      const candidates = [
        { method: 'put', url: `${baseUrl}/admin/settings/general` },
        { method: 'post', url: `${baseUrl}/admin/settings/general` },
        { method: 'patch', url: `${baseUrl}/admin/settings/general` },
        { method: 'put', url: `${baseUrl}/admin/setting/general` },
        { method: 'post', url: `${baseUrl}/admin/setting/general` },
        { method: 'patch', url: `${baseUrl}/admin/setting/general` },
        { method: 'put', url: `${baseUrl}/admin/settings` },
        { method: 'post', url: `${baseUrl}/admin/settings` },
        { method: 'put', url: `${baseUrl}/admin/setting` },
        { method: 'post', url: `${baseUrl}/admin/setting` },
        { method: 'put', url: `${baseUrl}/admin/general-settings` },
        { method: 'post', url: `${baseUrl}/admin/general-settings` },
        { method: 'put', url: `${baseUrl}/admin/general-setting` },
        { method: 'post', url: `${baseUrl}/admin/general-setting` },
        { method: 'put', url: `${baseUrl}/settings/general` },
        { method: 'post', url: `${baseUrl}/settings/general` }
      ];

      let res = null;
      let lastErr = null;

      for (const candidate of candidates) {
        try {
          if (candidate.method === 'put') {
            res = await axios.put(candidate.url, payload, { headers });
          } else if (candidate.method === 'post') {
            res = await axios.post(candidate.url, payload, { headers });
          } else if (candidate.method === 'patch') {
            res = await axios.patch(candidate.url, payload, { headers });
          }
          if (res && (res.status === 200 || res.status === 201 || res.data?.success !== false)) {
            break;
          }
        } catch (err) {
          lastErr = err;
          // Only continue fallback on 404 Not Found or 405 Method Not Allowed
          if (err.response?.status === 404 || err.response?.status === 405) {
            continue;
          } else {
            // Re-throw if authentication or payload validation error
            throw err;
          }
        }
      }

      if (!res && lastErr && lastErr.response?.status !== 404) {
        throw lastErr;
      }

      // Persist to localStorage
      try {
        localStorage.setItem('klever_general_settings', JSON.stringify({
          appName: appName.trim(),
          supportEmail: supportEmail.trim(),
          supportNumber: supportNumber.trim()
        }));
      } catch (storageErr) {
        console.warn('Failed to cache settings in localStorage', storageErr);
      }

      toast.success(res?.data?.message || 'Application settings updated successfully!');
      if (onAddAuditLog) {
        onAddAuditLog('Settings', `Updated platform application settings: App "${appName.trim()}", Support "${supportEmail.trim()}", Phone "${supportNumber.trim()}"`);
      }
    } catch (err) {
      console.error('Failed to update application settings:', err);
      // Even if network route fails, keep settings cached in localStorage
      try {
        localStorage.setItem('klever_general_settings', JSON.stringify({
          appName: appName.trim(),
          supportEmail: supportEmail.trim(),
          supportNumber: supportNumber.trim()
        }));
      } catch (storageErr) {
        console.warn('Failed to cache settings', storageErr);
      }
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update application settings';
      toast.error(errorMsg);
    } finally {
      setGeneralSettingsSaving(false);
    }
  };

  const settingsTabs = [
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'password', label: 'Change Password', icon: Lock },
    { id: 'security', label: 'Application Settings', icon: Sliders }
  ];

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Page Header */}
      <div className="flex-between">
        <div>
          <h2>System Settings & Core Policies</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configure password credentials, notification preferences, and platform security rules.
          </p>
        </div>
      </div>

      {/* Main Settings Layout: Subtabs Sidebar + Content Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', alignItems: 'start' }} className="grid-cols-2">

        {/* Navigation Subtabs Sidebar */}
        <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSettingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.8rem 1rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--primary-glow)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
                }}
              >
                <Icon size={17} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                <span style={{ flex: 1 }}>{tab.label}</span>
                {tab.id === 'notifications' && displayUnreadCount > 0 && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#b45309',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}>
                    {displayUnreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Settings Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ================= 1. CHANGE PASSWORD PANEL ================= */}
          {activeSettingsTab === 'password' && (
            <form className="glass-panel animate-fade-in" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleChangePassword}>
              <div>
                <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={18} className="text-primary" />
                  Change Administrator Account Password
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Update your authentication credentials. Please provide your current old password and your new desired password.
                </p>
              </div>

              {/* Old Password */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Old Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    name="oldPassword"
                    className="form-control"
                    style={{ paddingRight: '2.75rem' }}
                    placeholder="Enter your old password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: showOldPassword ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showOldPassword ? 'Hide password' : 'Show password'}
                  >
                    {showOldPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    className="form-control"
                    style={{ paddingRight: '2.75rem' }}
                    placeholder="Enter your new password (minimum 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: showNewPassword ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Security Guideline */}
              <div style={{
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Password Requirement:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Check size={13} className={newPassword.length >= 6 ? 'text-success' : 'text-muted-color'} />
                  <span>At least 6 characters in length</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordLoading}
                style={{ alignSelf: 'flex-start', gap: '0.5rem', marginTop: '0.25rem' }}
              >
                {passwordLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= 2. NOTIFICATIONS & LEADS SECTION ================= */}
          {activeSettingsTab === 'notifications' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Header Bar */}
              <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BellRing size={18} className="text-primary" />
                    Live Notifications & Inquiries Inbox
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Real-time incoming buyer inquiries, realtor registration requests, and platform events.
                  </p>
                </div>

                <div className="flex-align-center" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(10, 31, 57, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    Total: {notificationsList.length}
                  </span>

                  {displayUnreadCount > 0 && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#b45309',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <Sparkles size={13} />
                      {displayUnreadCount} New Unread
                    </span>
                  )}

                  {/* Mark All As Read Button */}
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={markingAllRead || notificationsList.length === 0 || displayUnreadCount === 0}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.8rem',
                      gap: '0.4rem',
                      borderColor: displayUnreadCount > 0 ? 'var(--primary)' : 'var(--border-color)',
                      color: displayUnreadCount > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                      background: displayUnreadCount > 0 ? 'var(--primary-glow)' : 'transparent',
                      fontWeight: 600,
                      cursor: (markingAllRead || notificationsList.length === 0 || displayUnreadCount === 0) ? 'not-allowed' : 'pointer'
                    }}
                    title="Mark all incoming notifications as read"
                  >
                    {markingAllRead ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Marking read...</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck size={14} />
                        <span>Mark All as Read</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchNotifications(true)}
                    disabled={notificationsLoading}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', gap: '0.4rem' }}
                    title="Refresh Notifications"
                  >
                    <RefreshCw size={14} className={notificationsLoading ? 'animate-spin' : ''} />
                    <span>{notificationsLoading ? 'Refreshing...' : 'Refresh Feed'}</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '2.4rem', fontSize: '0.825rem' }}
                    placeholder="Search notifications, lead names, emails, properties..."
                    value={notifSearchQuery}
                    onChange={(e) => setNotifSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex-align-center" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All (${notificationsList.length})` },
                    { id: 'unread', label: `Unread (${displayUnreadCount})` }
                  ].map((filterItem) => {
                    const isActive = notifFilterTab === filterItem.id;
                    return (
                      <button
                        key={filterItem.id}
                        type="button"
                        onClick={() => setNotifFilterTab(filterItem.id)}
                        style={{
                          border: '1px solid',
                          borderColor: isActive ? 'var(--primary)' : 'var(--border-color)',
                          background: isActive ? 'var(--primary-glow)' : 'transparent',
                          color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.75rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {filterItem.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notifications List Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notificationsLoading && notificationsList.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Loading live notifications and inquiries...
                    </div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div style={{
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.01)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(10, 31, 57, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)'
                    }}>
                      <Inbox size={24} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>No Notifications Found</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '360px' }}>
                      {notifSearchQuery || notifFilterTab !== 'all'
                        ? 'No notifications match your current filter or search criteria.'
                        : 'You have no incoming notifications or leads at the moment.'}
                    </p>
                    {(notifSearchQuery || notifFilterTab !== 'all') && (
                      <button
                        type="button"
                        onClick={() => { setNotifSearchQuery(''); setNotifFilterTab('all'); }}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', marginTop: '0.5rem', padding: '0.35rem 0.75rem' }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const details = getNotifDetails(notif);
                    const isDeleting = deletingNotifId === details.id;

                    return (
                      <div
                        key={details.id}
                        className="glass-panel"
                        style={{
                          padding: '1.15rem 1.25rem',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: details.isUnread ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-color)',
                          background: details.isUnread ? 'rgba(245, 158, 11, 0.03)' : 'rgba(255, 255, 255, 0.7)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        {/* Top Row: Icon, Title, Status & Actions */}
                        <div className="flex-between" style={{ alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                            {/* Icon */}
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              background: 'var(--primary-glow)',
                              color: 'var(--primary)'
                            }}>
                              <Bell size={19} />
                            </div>

                            {/* Title & Metadata */}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                                  {details.title}
                                </span>
                                {details.isUnread && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#b45309',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    textTransform: 'uppercase'
                                  }}>
                                    New
                                  </span>
                                )}
                              </div>

                              {/* Timestamp */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                <Clock size={12} />
                                <span>{formatNotifDate(details.date)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Delete Action Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifToDelete(details);
                            }}
                            disabled={isDeleting}
                            style={{
                              background: 'none',
                              border: '1px solid transparent',
                              borderRadius: '6px',
                              color: 'var(--danger)',
                              padding: '0.4rem 0.65rem',
                              cursor: isDeleting ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.15s ease',
                              flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                            title="Delete notification"
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Message body */}
                        {details.message && (
                          <div style={{
                            fontSize: '0.825rem',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.5',
                            paddingLeft: '48px'
                          }}>
                            {details.message}
                          </div>
                        )}

                        {/* Lead details card (if lead information exists) */}
                        {details.leadData && (
                          <div style={{
                            marginLeft: '48px',
                            background: 'rgba(0,0,0,0.02)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                            fontSize: '0.78rem'
                          }}>
                            {details.leadData.name && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <User size={13} className="text-muted-color" />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{details.leadData.name}</span>
                              </div>
                            )}
                            {details.leadData.phone && (
                              <a
                                href={`tel:${details.leadData.phone}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', textDecoration: 'none' }}
                              >
                                <Phone size={13} />
                                <span>{details.leadData.phone}</span>
                              </a>
                            )}
                            {details.leadData.email && (
                              <a
                                href={`mailto:${details.leadData.email}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', textDecoration: 'none' }}
                              >
                                <Mail size={13} />
                                <span>{details.leadData.email}</span>
                              </a>
                            )}
                            {details.leadData.property && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 600 }}>Property:</span>
                                <span>{details.leadData.property}</span>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* ================= 3. APPLICATION SETTINGS PANEL ================= */}
          {activeSettingsTab === 'security' && (
            <form
              className="glass-panel animate-fade-in"
              style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
              onSubmit={handleSaveGeneralAndSecurity}
            >
              <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Sliders size={20} color="var(--primary)" />
                    Application Settings
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
                    Configure application branding and support contact details.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchGeneralSettings(true)}
                  disabled={generalSettingsLoading || generalSettingsSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  title="Reload settings from server"
                >
                  <RefreshCw size={14} className={generalSettingsLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {generalSettingsLoading && !generalSettingsLoaded ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--primary)' }} />
                  <p style={{ fontSize: '0.875rem' }}>Loading application settings...</p>
                </div>
              ) : (
                <>
                  {/* Application Information Configuration */}
                  <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.925rem', fontWeight: 700, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                      <Building size={16} color="var(--primary)" />
                      Application Information
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                      {/* App Name */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Application Name <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Building size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            name="appName"
                            className="form-control"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="e.g. SpeddyProp"
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                            required
                            disabled={generalSettingsSaving}
                          />
                        </div>
                      </div>

                      {/* Support Email */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Support Email Address <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="email"
                            name="supportEmail"
                            className="form-control"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="e.g. speddyprop@support.com"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            required
                            disabled={generalSettingsSaving}
                          />
                        </div>
                      </div>

                      {/* Support Phone Number */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Support Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="tel"
                            name="supportNumber"
                            className="form-control"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="e.g. 042374782"
                            value={supportNumber}
                            onChange={(e) => setSupportNumber(e.target.value)}
                            required
                            disabled={generalSettingsSaving}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '0.5rem' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={generalSettingsSaving || generalSettingsLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
                    >
                      {generalSettingsSaving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Saving Application Settings...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save Application Settings</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {notifToDelete && createPortal(
        <div
          className="modal-overlay animate-fade-in"
          onClick={() => !deletingNotifId && setNotifToDelete(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 25, 47, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            className="modal-content animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Delete Notification
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Confirmation required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !deletingNotifId && setNotifToDelete(null)}
                disabled={Boolean(deletingNotifId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Are you sure you want to delete this notification? This action cannot be undone.
              </p>

              {/* Preview box */}
              <div style={{
                background: 'rgba(10, 31, 57, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {notifToDelete.title || 'Notification'}
                </span>
                {notifToDelete.message && (
                  <span style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {notifToDelete.message}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              background: 'rgba(10, 31, 57, 0.02)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setNotifToDelete(null)}
                disabled={Boolean(deletingNotifId)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.825rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDeleteNotification(notifToDelete.id)}
                disabled={Boolean(deletingNotifId)}
                style={{
                  padding: '0.5rem 1.15rem',
                  fontSize: '0.825rem',
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                {deletingNotifId ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}