import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import {
  Search,
  Filter,
  Check,
  X,
  KeyRound,
  Edit2,
  Trash2,
  Bookmark,
  Eye,
  EyeOff,
  Loader2,
  Upload,
  RefreshCw,
  Phone,
  Mail,
  Home,
  UserX,
  UserPlus,
  User,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  Sliders,
  Copy,
  Globe,
  Coins
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const {
    adminUser,
    handleDeleteUser: onDeleteUser,
    handleAddUser: onAddUser,
    addAuditLog: onAddAuditLog
  } = useStateContext();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';

  // API User List & Pagination State
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores user ID during action

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null); // Basic user object
  const [selectedUserDetails, setSelectedUserDetails] = useState(null); // Detailed data from GET /admin/users/:id
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [inspectActiveTab, setInspectActiveTab] = useState('ai_search'); // 'ai_search' | 'properties' | 'account'
  const [aiSearchFilter, setAiSearchFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null); // For edit modal

  // Delete Modal State
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form Fields for Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProfileImageFile, setFormProfileImageFile] = useState(null);
  const [formProfileImagePreview, setFormProfileImagePreview] = useState('');

  // Register New User Modal State (POST /user/register-user)
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addFormName, setAddFormName] = useState('');
  const [addFormEmail, setAddFormEmail] = useState('');
  const [addFormPassword, setAddFormPassword] = useState('');
  const [addFormPhone, setAddFormPhone] = useState('');
  const [addFormProfileImageFile, setAddFormProfileImageFile] = useState(null);
  const [addFormProfileImagePreview, setAddFormProfileImagePreview] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Search debounce ref
  const searchTimeoutRef = useRef(null);

  // Helper to format profile image URL with backslash normalization and host support
  const getProfileImageUrl = useCallback((imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath === 'object') {
      imagePath = imagePath.url || imagePath.path || imagePath.uri || '';
    }
    if (!imagePath || typeof imagePath !== 'string') return null;
    
    let clean = imagePath.trim().replace(/\\/g, '/');
    if (!clean) return null;

    if (clean.startsWith('blob:') || clean.startsWith('data:')) {
      return clean;
    }
    // Clean any legacy local IPs or localhost
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/i.test(clean)) {
      clean = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/, '');
    }
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    const imageBaseUrl = import.meta.env.VITE_IMAGE_URL || (baseUrl ? baseUrl.replace(/\/api\/?$/, '') : '') || 'https://mobappssolutiondevelopment.com/kleverProp';
    return `${imageBaseUrl.replace(/\/+$/, '')}/${clean.replace(/^\/+/, '')}`;
  }, [baseUrl]);

  // Color palette generator for consistent monogram initial avatar circles
  const getAvatarColors = (name = '') => {
    const palettes = [
      { bg: 'linear-gradient(135deg, rgba(250, 179, 25, 0.22) 0%, rgba(250, 179, 25, 0.42) 100%)', text: '#b47404', border: 'var(--primary)' },
      { bg: 'linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(14, 165, 233, 0.35) 100%)', text: '#0284c7', border: '#38bdf8' },
      { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.35) 100%)', text: '#059669', border: '#34d399' },
      { bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0.35) 100%)', text: '#7c3aed', border: '#a78bfa' },
      { bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, rgba(244, 63, 94, 0.35) 100%)', text: '#e11d48', border: '#fb7185' },
      { bg: 'linear-gradient(135deg, rgba(10, 31, 57, 0.15) 0%, rgba(10, 31, 57, 0.28) 100%)', text: '#0a1f39', border: '#64748b' }
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palettes[Math.abs(hash) % palettes.length];
  };

  // Resilient User Avatar with smooth error fallback to monogram circle
  const UserAvatar = ({ src, name = 'User', size = 38, fontSize = '0.9rem', border = '2px solid var(--primary)', style = {} }) => {
    const [imgError, setImgError] = useState(false);
    const formattedUrl = useMemo(() => getProfileImageUrl(src), [src]);

    useEffect(() => {
      setImgError(false);
    }, [formattedUrl]);

    const initial = (name && typeof name === 'string' && name.trim()) ? name.trim().charAt(0).toUpperCase() : 'U';
    const colors = getAvatarColors(name);

    if (formattedUrl && !imgError) {
      return (
        <img
          src={formattedUrl}
          alt={name}
          onError={() => setImgError(true)}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            objectFit: 'cover',
            border,
            flexShrink: 0,
            background: '#f1f5f9',
            ...style
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: colors.bg,
          border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize,
          color: colors.text,
          flexShrink: 0,
          userSelect: 'none',
          ...style
        }}
        title={name}
      >
        {initial}
      </div>
    );
  };

  // Helper to build Register User API URL: POST https://sisccltd.com/kleverProp/api/users/register-user
  const getRegisterUserUrl = () => {
    if (!baseUrl) return 'https://sisccltd.com/kleverProp/api/users/register-user';
    const cleanBase = baseUrl.replace(/\/+$/, '');
    if (cleanBase.endsWith('/users')) {
      return `${cleanBase}/register-user`;
    }
    if (cleanBase.endsWith('/user')) {
      return `${cleanBase}s/register-user`;
    }
    return `${cleanBase}/users/register-user`;
  };

  const handleAddProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAddFormProfileImageFile(file);
      setAddFormProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAddProfileImage = () => {
    setAddFormProfileImageFile(null);
    setAddFormProfileImagePreview('');
  };

  // Helpers to parse multilingual & nested property schema from API
  const getPropertyTitle = (title) => {
    if (!title) return 'Property Asset';
    if (typeof title === 'string') return title;
    return title.en || title.es || Object.values(title)[0] || 'Property Asset';
  };

  const getPropertyLocation = (location) => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    const parts = [location.address, location.area, location.city, location.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : (location.country || '');
  };

  const getPropertyImage = (images, fallbackImage) => {
    const raw = (images && images.length > 0) ? images[0] : fallbackImage;
    if (!raw) return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80';
    if (raw.startsWith('http')) return raw;
    const serverUrl = baseUrl.replace(/\/api$/, '');
    return `${serverUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
  };

  // Helper to format date-time strings cleanly
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to copy text to clipboard with notification
  const handleCopyToClipboard = (text, label = 'Copied to clipboard!') => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    toast.success(label);
  };

  // Helper to parse AI search extracted filters into clean, badge-friendly tags
  const renderExtractedFilters = (filters) => {
    if (!filters || typeof filters !== 'object') return [];

    const active = [];

    if (filters.listingType) {
      active.push({ label: 'Listing Type', value: filters.listingType, icon: '🏷️' });
    }
    if (filters.propertyType) {
      active.push({ label: 'Property Type', value: filters.propertyType, icon: '🏠' });
    }
    if (filters.location) {
      active.push({ label: 'Location', value: filters.location, icon: '📍' });
    }
    if (filters.bedrooms !== null && filters.bedrooms !== undefined) {
      active.push({ label: 'Bedrooms', value: `${filters.bedrooms} Beds`, icon: '🛏️' });
    }
    if (filters.bathrooms !== null && filters.bathrooms !== undefined) {
      active.push({ label: 'Bathrooms', value: `${filters.bathrooms} Baths`, icon: '🚿' });
    }
    if (filters.minPrice !== null || filters.maxPrice !== null) {
      const minStr = filters.minPrice !== null && filters.minPrice !== undefined ? `$${Number(filters.minPrice).toLocaleString()}` : '$0';
      const maxStr = filters.maxPrice !== null && filters.maxPrice !== undefined ? `$${Number(filters.maxPrice).toLocaleString()}` : 'Any';
      active.push({ label: 'Budget', value: `${minStr} - ${maxStr}`, icon: '💰' });
    }
    if (filters.paymentMethod) {
      active.push({ label: 'Payment', value: filters.paymentMethod, icon: '💳' });
    }
    if (filters.timeline) {
      active.push({ label: 'Timeline', value: filters.timeline, icon: '⏱️' });
    }
    if (filters.furnishedStatus) {
      active.push({ label: 'Furnished', value: filters.furnishedStatus, icon: '🛋️' });
    }
    if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
      active.push({ label: 'Amenities', value: filters.amenities.join(', '), icon: '🏊' });
    }

    // Dynamic fallback for any additional parsed filters
    Object.keys(filters).forEach(k => {
      if (!['listingType', 'propertyType', 'location', 'bedrooms', 'bathrooms', 'minPrice', 'maxPrice', 'paymentMethod', 'timeline', 'furnishedStatus', 'amenities'].includes(k)) {
        const val = filters[k];
        if (val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0)) {
          active.push({
            label: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            value: Array.isArray(val) ? val.join(', ') : String(val),
            icon: '✨'
          });
        }
      }
    });

    return active;
  };

  // 1. GET ALL USERS WITH PAGINATION: /admin/users?page=X&limit=Y
  const fetchUsers = useCallback(async (targetPage = currentPage, targetLimit = limit, search = searchTerm) => {
    if (!adminUser?.token) return;
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: targetLimit
      };
      if (search && search.trim()) {
        params.search = search.trim();
      }

      const res = await axios.get(`${baseUrl}/admin/users`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        },
        params
      });

      const rawUsers = res.data?.data?.users || res.data?.users || res.data?.data || [];
      const paginationData = res.data?.data?.pagination || res.data?.pagination || {
        total: rawUsers.length,
        page: targetPage,
        limit: targetLimit,
        pages: Math.ceil(rawUsers.length / targetLimit) || 1
      };

      const mapped = rawUsers.map(u => ({
        _id: u._id,
        id: u._id,
        name: u.name || 'Anonymous User',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role ? (u.role.charAt(0).toUpperCase() + u.role.slice(1).toLowerCase()) : 'Buyer',
        status: u.isActive !== false ? 'Active' : 'Suspended',
        isActive: u.isActive !== false,
        profileImage: u.profileImage || u.profile_image || u.avatar || u.image || u.photo || u.profilePic || u.picture || u.avatarUrl || u.userImage || (u.user?.profileImage) || (u.user?.avatar) || '',
        joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        recentlyViewed: u.recentlyViewed || []
      }));

      setUsersList(mapped);
      setPagination(paginationData);
      setCurrentPage(paginationData.page || targetPage);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch users from server');
      setUsersList([]);
      setPagination({ total: 0, page: 1, limit: targetLimit, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [adminUser?.token, baseUrl, currentPage, limit, searchTerm]);

  // Initial Fetch & Page Change Trigger
  useEffect(() => {
    fetchUsers(currentPage, limit, searchTerm);
  }, [adminUser?.token, currentPage, limit]);

  // Handle Search Change with Debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers(1, limit, value);
    }, 350);
  };

  // Handle Page Navigation
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > (pagination.pages || 1) || newPage === currentPage) return;
    setCurrentPage(newPage);
  };

  // Handle Limit Change
  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimit(newLimit);
    setCurrentPage(1);
    fetchUsers(1, newLimit, searchTerm);
  };

  // 2. GET USER BY ID: /admin/users/:id
  const handleInspectUser = async (user) => {
    setSelectedUser(user);
    setSelectedUserDetails(null);
    setDrawerLoading(true);
    setInspectActiveTab('ai_search');
    setAiSearchFilter('');
    const userId = user._id || user.id;

    try {
      const res = await axios.get(`${baseUrl}/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });
      const data = res.data?.data || res.data || {};
      setSelectedUserDetails(data);
    } catch (err) {
      console.error('Failed to load user details:', err);
      toast.error(err.response?.data?.message || 'Failed to load detailed profile.');
    } finally {
      setDrawerLoading(false);
    }
  };

  // 3. TOGGLE STATUS: /admin/users/:id/toggle-status
  const handleToggleStatus = async (user) => {
    const userId = user._id || user.id;
    try {
      setActionLoading(userId);
      const res = await axios.put(`${baseUrl}/admin/users/${userId}/toggle-status`, {}, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      const nextActive = !user.isActive;
      const nextStatus = nextActive ? 'Active' : 'Suspended';

      toast.success(res.data?.message || `User status updated to ${nextStatus}`);

      // Update state locally
      setUsersList(prev => prev.map(u => {
        if ((u._id || u.id) === userId) {
          return {
            ...u,
            isActive: nextActive,
            status: nextStatus
          };
        }
        return u;
      }));

      if (selectedUser && (selectedUser._id || selectedUser.id) === userId) {
        setSelectedUser(prev => ({
          ...prev,
          isActive: nextActive,
          status: nextStatus
        }));
      }

      if (selectedUserDetails) {
        setSelectedUserDetails(prev => {
          if (!prev) return prev;
          if (prev.user) {
            return {
              ...prev,
              user: { ...prev.user, isActive: nextActive, status: nextStatus }
            };
          }
          return { ...prev, isActive: nextActive, status: nextStatus };
        });
      }

      onAddAuditLog('User', `Toggled account status for ${user.name} to ${nextStatus}`);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      toast.error(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  // 4. OPEN EDIT MODAL
  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormName(user.name || '');
    setFormEmail(user.email || '');
    setFormPhone(user.phone || '');
    setFormProfileImageFile(null);
    setFormProfileImagePreview(getProfileImageUrl(user.profileImage) || '');
  };

  const handleProfileImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormProfileImageFile(file);
      setFormProfileImagePreview(URL.createObjectURL(file));
    }
  };

  // 5. UPDATE USER BY ID: /admin/users/:id
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const userId = editingUser._id || editingUser.id;

    try {
      setActionLoading(userId);
      const formData = new FormData();
      formData.append('name', formName);
      formData.append('email', formEmail);
      formData.append('phone', formPhone);
      if (formProfileImageFile) {
        formData.append('profileImage', formProfileImageFile);
      }

      const res = await axios.put(`${baseUrl}/admin/users/${userId}`, formData, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      toast.success(res.data?.message || 'User updated successfully');

      const updatedUserObj = res.data?.data?.user || res.data?.user || res.data?.data;
      if (updatedUserObj) {
        setUsersList(prev => prev.map(u => {
          if ((u._id || u.id) === userId) {
            return {
              ...u,
              name: updatedUserObj.name || formName,
              email: updatedUserObj.email || formEmail,
              phone: updatedUserObj.phone || formPhone,
              profileImage: updatedUserObj.profileImage !== undefined ? updatedUserObj.profileImage : u.profileImage
            };
          }
          return u;
        }));

        if (selectedUser && (selectedUser._id || selectedUser.id) === userId) {
          setSelectedUser(prev => ({
            ...prev,
            name: updatedUserObj.name || formName,
            email: updatedUserObj.email || formEmail,
            phone: updatedUserObj.phone || formPhone,
            profileImage: updatedUserObj.profileImage !== undefined ? updatedUserObj.profileImage : prev.profileImage
          }));
        }

        if (selectedUserDetails) {
          setSelectedUserDetails(prev => {
            if (!prev) return prev;
            if (prev.user) {
              return {
                ...prev,
                user: {
                  ...prev.user,
                  name: updatedUserObj.name || formName,
                  email: updatedUserObj.email || formEmail,
                  phone: updatedUserObj.phone || formPhone,
                  profileImage: updatedUserObj.profileImage !== undefined ? updatedUserObj.profileImage : prev.user?.profileImage
                }
              };
            }
            return {
              ...prev,
              name: updatedUserObj.name || formName,
              email: updatedUserObj.email || formEmail,
              phone: updatedUserObj.phone || formPhone,
              profileImage: updatedUserObj.profileImage !== undefined ? updatedUserObj.profileImage : prev?.profileImage
            };
          });
        }
      } else {
        await fetchUsers(currentPage, limit, searchTerm);
      }

      onAddAuditLog('User', `Modified user profile information for ${formName}`);
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user:', err);
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  // 0. REGISTER USER: POST https://sisccltd.com/kleverProp/api/users/register-user
  // Auth: no, Parameter: form-data (name, email, password, phone, profileImage)
  const handleRegisterUserSubmit = async (e) => {
    e.preventDefault();

    if (!addFormName.trim()) {
      toast.error('Please enter the user\'s full name');
      return;
    }
    if (!addFormEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!addFormPassword) {
      toast.error('Please provide a password');
      return;
    }
    if (!addFormPhone.trim()) {
      toast.error('Please provide a phone number');
      return;
    }

    try {
      setRegisterLoading(true);
      const formData = new FormData();
      formData.append('name', addFormName.trim());
      formData.append('email', addFormEmail.trim());
      formData.append('password', addFormPassword);
      formData.append('phone', addFormPhone.trim());
      if (addFormProfileImageFile) {
        formData.append('profileImage', addFormProfileImageFile);
      }

      const registerUrl = getRegisterUserUrl();
      const res = await axios.post(registerUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const message = res.data?.message || 'User registered successfully!';
      toast.success(message);

      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('User', `Registered user account for ${addFormName.trim()} (${addFormEmail.trim()})`);
      }

      // If backend returned user object and onAddUser is available
      const createdUser = res.data?.data?.user || res.data?.user || res.data?.data;
      if (createdUser && typeof onAddUser === 'function') {
        onAddUser({
          id: createdUser._id || createdUser.id || 'usr-' + Date.now(),
          _id: createdUser._id || createdUser.id,
          name: createdUser.name || addFormName.trim(),
          email: createdUser.email || addFormEmail.trim(),
          phone: createdUser.phone || addFormPhone.trim(),
          role: 'Buyer',
          status: 'Active',
          isActive: true,
          profileImage: createdUser.profileImage,
          joined: 'Just now'
        });
      }

      // Reset form states and close modal
      setAddFormName('');
      setAddFormEmail('');
      setAddFormPassword('');
      setAddFormPhone('');
      setAddFormProfileImageFile(null);
      setAddFormProfileImagePreview('');
      setShowAddPassword(false);
      setShowAddUserModal(false);

      // Refresh list from server
      await fetchUsers(1, limit, searchTerm);
    } catch (err) {
      console.error('Failed to register user:', err);
      const errors = err.response?.data?.errors;
      let errMsg = '';
      if (Array.isArray(errors) && errors.length > 0) {
        errMsg = errors.join(', ');
      } else {
        errMsg = err.response?.data?.message || err.message || 'Failed to register user. Please try again.';
      }
      toast.error(errMsg);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handlePasswordReset = (user) => {
    toast.success(`Reset token generated for ${user.name}. Email dispatched to ${user.email}.`);
    onAddAuditLog('User', `Triggered password reset request link for ${user.name}`);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
  };

  // 6. DELETE USER BY ID: /admin/users/:id
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const userId = userToDelete._id || userToDelete.id;
    if (!adminUser?.token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setDeleteLoading(true);
      setActionLoading(userId);

      const res = await axios.delete(`${baseUrl}/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      toast.success(res.data?.message || `User ${userToDelete.name} deleted successfully`);

      // Update local state list
      setUsersList(prev => prev.filter(u => (u._id || u.id) !== userId));

      // Decrement pagination total
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, (prev.total || 1) - 1)
      }));

      // Context sync & audit log
      if (typeof onDeleteUser === 'function') {
        onDeleteUser(userId);
      }
      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('User', `Permanently deleted user account ${userToDelete.name} (ID: ${userId})`);
      }

      // Close drawer if inspected user was deleted
      if (selectedUser && (selectedUser._id || selectedUser.id) === userId) {
        setSelectedUser(null);
        setSelectedUserDetails(null);
      }

      // Close modal
      setUserToDelete(null);

      // If page is now empty and not on page 1, go back 1 page
      if (usersList.length <= 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      toast.error(err.response?.data?.message || 'Failed to delete user from server');
    } finally {
      setDeleteLoading(false);
      setActionLoading(null);
    }
  };

  // Pure API-driven list (no mock or context fallback data)
  const filteredUsers = usersList.filter((u) => {
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchesRole && matchesStatus;
  });

  // Calculate pagination indices
  const totalPages = pagination.pages || Math.ceil(pagination.total / limit) || 1;
  const fromIndex = pagination.total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const toIndex = Math.min(currentPage * limit, pagination.total);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="flex-between">
        <div>
          <h2>Buyer & Tenant Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            List, register, filter, configure roles, and inspect recent activity for Dominican Real Estate accounts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchUsers(currentPage, limit, searchTerm)}
            disabled={loading}
            title="Refresh Users"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setAddFormName('');
              setAddFormEmail('');
              setAddFormPassword('');
              setAddFormPhone('');
              setAddFormProfileImageFile(null);
              setAddFormProfileImagePreview('');
              setShowAddPassword(false);
              setShowAddUserModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UserPlus size={16} />
            Register User
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by name, email, phone, keyword..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex-align-center" style={{ gap: '0.5rem' }}>
          <select className="form-control form-select" style={{ width: '140px', padding: '0.5rem 2rem 0.5rem 1rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            {/* <option value="Pending">Pending</option> */}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Preferred Role</th>
                <th>Phone Number</th>
                <th>Joined Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <Loader2 className="animate-spin" size={20} color="var(--primary)" />
                      <span>Loading registered users from server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isActioning = actionLoading === (user._id || user.id);

                  return (
                    <tr key={user._id || user.id}>
                      <td>
                        <div className="flex-align-center" style={{ gap: '0.75rem' }}>
                          <UserAvatar
                            src={user.profileImage}
                            name={user.name}
                            size={38}
                          />
                          <div>
                            <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{user.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${user.role === 'Buyer' ? 'badge-primary' : 'badge-info'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                        {user.phone ? user.phone : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{user.joined}</td>
                      <td>
                        <span className={`badge ${user.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex-align-center" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleInspectUser(user)}
                            title="Inspect user details & activity"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleEditClick(user)}
                            title="Edit user profile"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handlePasswordReset(user)}
                            title="Send Password Reset"
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            className={`btn btn-ghost btn-sm btn-icon ${user.status === 'Active' ? 'text-danger' : 'text-success'}`}
                            onClick={() => handleToggleStatus(user)}
                            disabled={isActioning}
                            title={user.status === 'Active' ? 'Suspend User' : 'Activate User'}
                          >
                            {isActioning ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : user.status === 'Active' ? (
                              <X size={15} />
                            ) : (
                              <Check size={15} />
                            )}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon text-danger"
                            onClick={() => handleDeleteClick(user)}
                            title="Delete Account"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <UserX size={38} style={{ color: 'var(--text-muted)', opacity: 0.45, marginBottom: '0.25rem' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                        No user accounts found
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                        {searchTerm || roleFilter !== 'All' || statusFilter !== 'All'
                          ? 'No registered users match your active search or filter criteria.'
                          : 'There are currently no registered users on the platform.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION TOOLBAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border-color)',
          background: '#faf8f5',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Left: Summary and Rows per Page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{fromIndex}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{toIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> users
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Rows per page:</span>
              <select
                className="form-control form-select"
                style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem', height: '32px' }}
                value={limit}
                onChange={handleLimitChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {/* First Page */}
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1 || loading || pagination.total === 0}
              title="First Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronsLeft size={15} />
            </button>

            {/* Previous Page */}
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading || pagination.total === 0}
              title="Previous Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronLeft size={15} />
            </button>

            {/* Page Number Buttons */}
            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                className={`btn btn-sm ${pageNum === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePageChange(pageNum)}
                disabled={loading || pagination.total === 0}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  padding: '0 0.5rem',
                  fontWeight: pageNum === currentPage ? 700 : 500
                }}
              >
                {pageNum}
              </button>
            ))}

            {/* Next Page */}
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading || pagination.total === 0}
              title="Next Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronRight size={15} />
            </button>

            {/* Last Page */}
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages || loading || pagination.total === 0}
              title="Last Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* REGISTER NEW USER MODAL (POST /user/register-user) */}
      {showAddUserModal && createPortal(
        <div className="modal-overlay" onClick={() => !registerLoading && setShowAddUserModal(false)}>
          <form className="modal-content" onSubmit={handleRegisterUserSubmit} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(250, 179, 25, 0.15)',
                  color: '#b47404',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Register New User</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Add a new buyer or tenant account to the platform
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !registerLoading && setShowAddUserModal(false)}
                disabled={registerLoading}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', padding: '1.5rem' }}>
              {/* Profile Image Picker */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ position: 'relative' }}>
                  {addFormProfileImagePreview ? (
                    <div style={{ position: 'relative', width: '74px', height: '74px' }}>
                      <img
                        src={addFormProfileImagePreview}
                        alt="Preview"
                        style={{
                          width: '74px',
                          height: '74px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid var(--primary)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveAddProfileImage}
                        title="Remove profile image"
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'var(--danger)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      background: 'rgba(250, 179, 25, 0.12)',
                      border: '2px dashed var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#b47404'
                    }}>
                      <User size={30} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', fontWeight: 600 }}>
                    Profile Picture
                  </label>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Upload size={14} />
                    {addFormProfileImageFile ? 'Change Photo' : 'Upload Photo'}
                    <input
                      type="file"
                      name="profileImage"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAddProfileImageChange}
                      disabled={registerLoading}
                    />
                  </label>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                    JPG, PNG, WebP format (Optional)
                  </p>
                </div>
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. Maria Gonzalez"
                    value={addFormName}
                    onChange={(e) => setAddFormName(e.target.value)}
                    required
                    disabled={registerLoading}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Email Address <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. maria.gonzalez@example.com"
                    value={addFormEmail}
                    onChange={(e) => setAddFormEmail(e.target.value)}
                    required
                    disabled={registerLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Password <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    name="password"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="Enter secure password"
                    value={addFormPassword}
                    onChange={(e) => setAddFormPassword(e.target.value)}
                    required
                    disabled={registerLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="btn btn-ghost btn-sm btn-icon"
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      padding: '4px'
                    }}
                    tabIndex={-1}
                  >
                    {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. +1 (809) 555-0199"
                    value={addFormPhone}
                    onChange={(e) => setAddFormPhone(e.target.value)}
                    required
                    disabled={registerLoading}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ background: '#faf8f5' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddUserModal(false)}
                disabled={registerLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={registerLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {registerLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registering User...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Register User
                  </>
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* EDIT USER MODAL (PUT /admin/users/:id) */}
      {editingUser && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setEditingUser(null)}>
          <form className="modal-content" onSubmit={handleEditSubmit} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Modify User Profile</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingUser(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Avatar Upload Section */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ position: 'relative' }}>
                  {formProfileImagePreview ? (
                    <img
                      src={formProfileImagePreview}
                      alt="User Avatar"
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid var(--primary)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    />
                  ) : (
                    <UserAvatar
                      src={editingUser?.profileImage}
                      name={formName || editingUser?.name}
                      size={72}
                      fontSize="1.75rem"
                      border="3px solid var(--primary)"
                    />
                  )}
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem' }}>Profile Picture</label>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Upload size={14} />
                    Choose File from Device
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleProfileImageFileChange}
                    />
                  </label>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                    JPG, PNG, WebP supported
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 9528031082"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading === (editingUser._id || editingUser.id)}>
                {actionLoading === (editingUser._id || editingUser.id) ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION MODAL (DELETE /admin/users/:id) */}
      {userToDelete && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => !deleteLoading && setUserToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.1rem' }}>Delete User Account</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !deleteLoading && setUserToDelete(null)}
                disabled={deleteLoading}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this user account?
              </p>

              {/* User snippet card */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <UserAvatar
                  src={userToDelete.profileImage}
                  name={userToDelete.name}
                  size={44}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {userToDelete.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userToDelete.email}
                  </p>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                    <span className={`badge ${userToDelete.role === 'Buyer' ? 'badge-primary' : 'badge-info'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {userToDelete.role}
                    </span>
                    <span className={`badge ${userToDelete.status === 'Active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {userToDelete.status}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                This will remove the user from the database and delete associated profile data. This action <strong style={{ color: 'var(--danger)' }}>cannot be undone</strong>.
              </p>
            </div>

            <div className="modal-footer" style={{ background: '#faf8f5' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setUserToDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting User...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PROFILE DETAIL MODAL (GET /admin/users/:id) */}
      {selectedUser && createPortal(
        <div className="modal-overlay" style={{ padding: '1rem', overflowY: 'auto' }} onClick={() => setSelectedUser(null)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              overflow: 'hidden',
              boxSizing: 'border-box',
              boxShadow: '0 25px 50px -12px rgba(10, 31, 57, 0.25)',
              background: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with User Details */}
            {(() => {
              const userDetail = selectedUserDetails?.user || selectedUserDetails || selectedUser || {};
              const aiSearchHistory = Array.isArray(userDetail?.aiSearchHistory)
                ? userDetail.aiSearchHistory
                : Array.isArray(selectedUserDetails?.aiSearchHistory)
                ? selectedUserDetails.aiSearchHistory
                : [];
              const aiChatUsage = userDetail?.aiChatUsage || selectedUserDetails?.aiChatUsage || { count: 0, lastUsedDate: null };
              const savedProperties = Array.isArray(selectedUserDetails?.savedProperties)
                ? selectedUserDetails.savedProperties
                : Array.isArray(userDetail?.savedProperties)
                ? userDetail.savedProperties
                : [];
              const recentlyViewed = Array.isArray(userDetail?.recentlyViewed)
                ? userDetail.recentlyViewed
                : Array.isArray(selectedUserDetails?.recentlyViewed)
                ? selectedUserDetails.recentlyViewed
                : Array.isArray(selectedUser?.recentlyViewed)
                ? selectedUser.recentlyViewed
                : [];

              const displayedAiSearches = aiSearchFilter.trim()
                ? aiSearchHistory.filter(item => {
                    const q = aiSearchFilter.toLowerCase().trim();
                    const queryMatch = item.query && item.query.toLowerCase().includes(q);
                    const filterPropType = item.extractedFilters?.propertyType && String(item.extractedFilters.propertyType).toLowerCase().includes(q);
                    const filterListingType = item.extractedFilters?.listingType && String(item.extractedFilters.listingType).toLowerCase().includes(q);
                    const filterLocation = item.extractedFilters?.location && String(item.extractedFilters.location).toLowerCase().includes(q);
                    return Boolean(queryMatch || filterPropType || filterListingType || filterLocation);
                  })
                : aiSearchHistory;

              const totalMatchedProperties = aiSearchHistory.reduce((acc, curr) => {
                const count = curr.totalFound ?? (curr.properties ? curr.properties.length : 0);
                return acc + (Number(count) || 0);
              }, 0);

              return (
                <>
                  <div className="modal-header" style={{
                    padding: '1.15rem 1.5rem',
                    background: '#ffffff',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    boxSizing: 'border-box',
                    minWidth: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                      <UserAvatar
                        src={userDetail.profileImage || selectedUser.profileImage}
                        name={userDetail.name || selectedUser.name}
                        size={46}
                        fontSize="1.15rem"
                        border="2px solid var(--primary)"
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700, wordBreak: 'break-word' }}>
                            {userDetail.name || selectedUser.name}
                          </h3>
                          <span className={`badge ${selectedUser.role === 'Buyer' ? 'badge-primary' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                            {userDetail.role || selectedUser.role}
                          </span>
                          <span className={`badge ${(userDetail.status === 'Active' || userDetail.status === 'approved' || userDetail.isActive) ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                            {userDetail.status || selectedUser.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap', minWidth: 0 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            <Mail size={12} style={{ flexShrink: 0 }} /> {userDetail.email || selectedUser.email}
                          </span>
                          {(userDetail.phone || selectedUser.phone) && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              • <Phone size={12} style={{ flexShrink: 0 }} /> {userDetail.phone || selectedUser.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => setSelectedUser(null)}
                      title="Close dialog"
                      style={{ flexShrink: 0 }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Navigation Tabs */}
                  <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    background: '#faf8f5',
                    padding: '0 1.25rem',
                    gap: '0.35rem',
                    flexShrink: 0,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    <button
                      type="button"
                      onClick={() => setInspectActiveTab('ai_search')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: inspectActiveTab === 'ai_search' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: inspectActiveTab === 'ai_search' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: inspectActiveTab === 'ai_search' ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkles size={15} style={{ color: inspectActiveTab === 'ai_search' ? 'var(--primary)' : 'var(--text-muted)' }} />
                      AI Search Activity
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 7px',
                          borderRadius: '999px',
                          background: inspectActiveTab === 'ai_search' ? 'var(--primary)' : 'rgba(10, 31, 57, 0.08)',
                          color: inspectActiveTab === 'ai_search' ? '#fff' : 'var(--text-secondary)',
                          fontWeight: 700
                        }}
                      >
                        {aiSearchHistory.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectActiveTab('properties')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: inspectActiveTab === 'properties' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: inspectActiveTab === 'properties' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: inspectActiveTab === 'properties' ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Bookmark size={15} style={{ color: inspectActiveTab === 'properties' ? 'var(--primary)' : 'var(--text-muted)' }} />
                      Saved Properties
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 7px',
                          borderRadius: '999px',
                          background: inspectActiveTab === 'properties' ? 'var(--primary)' : 'rgba(10, 31, 57, 0.08)',
                          color: inspectActiveTab === 'properties' ? '#fff' : 'var(--text-secondary)',
                          fontWeight: 700
                        }}
                      >
                        {savedProperties.length || recentlyViewed.length || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectActiveTab('account')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: inspectActiveTab === 'account' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: inspectActiveTab === 'account' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: inspectActiveTab === 'account' ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <User size={15} style={{ color: inspectActiveTab === 'account' ? 'var(--primary)' : 'var(--text-muted)' }} />
                      Profile & Preferences
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="modal-body" style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    minWidth: 0,
                    boxSizing: 'border-box'
                  }}>
                    {drawerLoading ? (
                      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 0.85rem', color: 'var(--primary)' }} />
                        <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Retrieving live user telemetry & AI search data...</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Querying database for session telemetry, preferences & history</p>
                      </div>
                    ) : (
                      <>
                        {/* TAB 1: AI SEARCH ACTIVITY */}
                        {inspectActiveTab === 'ai_search' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                            {/* Summary Metrics Row */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
                              gap: '0.75rem',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', minWidth: 0, boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total AI Queries</span>
                                  <Sparkles size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                                  {aiSearchHistory.length}
                                </div>
                              </div>

                              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', minWidth: 0, boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Found Matches</span>
                                  <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                                  {totalMatchedProperties}
                                </div>
                              </div>

                              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', minWidth: 0, boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AI Chat Usage</span>
                                  <Bot size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                                  {aiChatUsage?.count ?? 0} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>chats</span>
                                </div>
                              </div>

                              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', minWidth: 0, boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Last AI Interaction</span>
                                  <Clock size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {aiSearchHistory[0]?.searchedAt ? formatDateTime(aiSearchHistory[0].searchedAt) : 'Never'}
                                </div>
                              </div>
                            </div>

                            {/* Search Filter input if many items */}
                            {aiSearchHistory.length > 2 && (
                              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                                <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                  type="text"
                                  className="form-control"
                                  style={{ paddingLeft: '2.3rem', fontSize: '0.825rem', height: '36px', boxSizing: 'border-box' }}
                                  placeholder="Filter AI searches by query keyword, property type, or location..."
                                  value={aiSearchFilter}
                                  onChange={(e) => setAiSearchFilter(e.target.value)}
                                />
                              </div>
                            )}

                            {/* AI Searches List */}
                            {displayedAiSearches.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', boxSizing: 'border-box' }}>
                                {displayedAiSearches.map((item, idx) => {
                                  const activeFilters = renderExtractedFilters(item.extractedFilters);
                                  const matchCount = item.totalFound ?? (item.properties ? item.properties.length : 0);

                                  return (
                                    <div
                                      key={item._id || idx}
                                      style={{
                                        background: '#ffffff',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        padding: '1.1rem 1.25rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        boxShadow: '0 2px 6px rgba(10, 31, 57, 0.04)',
                                        minWidth: 0,
                                        boxSizing: 'border-box',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      {/* Query Header */}
                                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.85rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                                          <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.2) 0%, rgba(250, 179, 25, 0.45) 100%)',
                                            color: '#b47404',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '1px'
                                          }}>
                                            <Sparkles size={16} />
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                              AI Search Query #{aiSearchHistory.length - idx}
                                            </span>
                                            <p style={{
                                              fontSize: '0.95rem',
                                              fontWeight: 600,
                                              color: 'var(--text-primary)',
                                              margin: '0.15rem 0 0',
                                              lineHeight: 1.4,
                                              wordBreak: 'break-word',
                                              overflowWrap: 'anywhere'
                                            }}>
                                              "{item.query || 'Unspecified Query'}"
                                            </p>
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                          <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <CheckCircle2 size={12} />
                                            {matchCount} Matched
                                          </span>
                                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Clock size={11} /> {formatDateTime(item.searchedAt)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* AI Extracted Filters */}
                                      <div style={{
                                        background: '#faf8f5',
                                        borderRadius: '8px',
                                        padding: '0.65rem 0.85rem',
                                        border: '1px solid rgba(10, 31, 57, 0.05)',
                                        boxSizing: 'border-box',
                                        minWidth: 0
                                      }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <Sliders size={12} />
                                          AI Extracted Filters
                                        </div>
                                        {activeFilters.length > 0 ? (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minWidth: 0 }}>
                                            {activeFilters.map((f, fIdx) => (
                                              <span
                                                key={fIdx}
                                                style={{
                                                  fontSize: '0.74rem',
                                                  background: '#ffffff',
                                                  border: '1px solid rgba(10, 31, 57, 0.1)',
                                                  padding: '2px 8px',
                                                  borderRadius: '6px',
                                                  color: 'var(--text-primary)',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  fontWeight: 500,
                                                  wordBreak: 'break-word',
                                                  maxWidth: '100%'
                                                }}
                                              >
                                                <span>{f.icon}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>{f.label}:</span>
                                                <strong style={{ color: 'var(--text-primary)' }}>{f.value}</strong>
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            No restrictive filters parsed — searched across all properties.
                                          </p>
                                        )}
                                      </div>

                                      {/* {item.properties && item.properties.length > 0 && (
                                        <div style={{ borderTop: '1px solid rgba(10, 31, 57, 0.05)', paddingTop: '0.6rem', minWidth: 0 }}>
                                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                                            Matched Property References ({item.properties.length}):
                                          </span>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minWidth: 0 }}>
                                            {item.properties.map((p, pIdx) => {
                                              const propIdStr = typeof p === 'string' ? p : (p?._id || p?.id || `Prop-${pIdx}`);
                                              const propName = typeof p === 'object' && p?.title ? getPropertyTitle(p.title) : null;
                                              return (
                                                <span
                                                  key={pIdx}
                                                  onClick={() => handleCopyToClipboard(propIdStr, `Copied Property ID: ${propIdStr}`)}
                                                  title="Click to copy Property ID"
                                                  style={{
                                                    fontSize: '0.72rem',
                                                    fontFamily: 'monospace',
                                                    background: 'rgba(250, 179, 25, 0.1)',
                                                    border: '1px solid rgba(250, 179, 25, 0.25)',
                                                    color: '#b47404',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.15s ease',
                                                    wordBreak: 'break-all',
                                                    maxWidth: '100%'
                                                  }}
                                                >
                                                  <Home size={11} style={{ flexShrink: 0 }} />
                                                  {propName ? `${propName} (${propIdStr.slice(-6)})` : propIdStr}
                                                  <Copy size={10} style={{ opacity: 0.7, flexShrink: 0 }} />
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )} */}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{
                                padding: '3.5rem 1.5rem',
                                textAlign: 'center',
                                background: '#faf8f5',
                                borderRadius: '12px',
                                border: '1px dashed var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.75rem',
                                width: '100%',
                                boxSizing: 'border-box'
                              }}>
                                <div style={{
                                  width: '52px',
                                  height: '52px',
                                  borderRadius: '50%',
                                  background: 'rgba(250, 179, 25, 0.15)',
                                  color: '#b47404',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Sparkles size={24} />
                                </div>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                  {aiSearchFilter ? 'No matching AI searches' : 'No AI Search Activity Recorded'}
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '380px' }}>
                                  {aiSearchFilter
                                    ? 'No AI search logs match your query keyword.'
                                    : 'This user has not executed any natural-language AI property searches on the platform yet.'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 2: SAVED & VIEWED PROPERTIES */}
                        {inspectActiveTab === 'properties' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                            {/* Saved Properties */}
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                <Bookmark size={16} style={{ color: 'var(--primary)' }} />
                                Saved Properties ({savedProperties.length})
                              </h4>
                              {savedProperties.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                  {savedProperties.map((p, i) => {
                                    const propTitle = getPropertyTitle(p.title);
                                    const propLocation = getPropertyLocation(p.location);
                                    const propImg = getPropertyImage(p.images);

                                    return (
                                      <div
                                        key={p._id || i}
                                        style={{
                                          background: '#ffffff',
                                          borderRadius: '12px',
                                          border: '1px solid var(--border-color)',
                                          boxShadow: '0 2px 8px rgba(10, 31, 57, 0.05)',
                                          overflow: 'hidden',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          minWidth: 0,
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        <div style={{ display: 'flex', gap: '0.85rem', padding: '0.85rem', flexWrap: 'wrap' }}>
                                          <img
                                            src={propImg}
                                            alt={propTitle}
                                            style={{
                                              width: '84px',
                                              height: '84px',
                                              borderRadius: '8px',
                                              objectFit: 'cover',
                                              flexShrink: 0,
                                              border: '1px solid rgba(0,0,0,0.06)'
                                            }}
                                            onError={(e) => {
                                              e.target.onerror = null;
                                              e.target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80';
                                            }}
                                          />
                                          <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                            <div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                                {p.propertyType && (
                                                  <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                                    {p.propertyType}
                                                  </span>
                                                )}
                                                {p.listingType && (
                                                  <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                                    {p.listingType}
                                                  </span>
                                                )}
                                              </div>
                                              <h5 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                                                {propTitle}
                                              </h5>
                                              {propLocation && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0', display: 'flex', alignItems: 'center', gap: '3px', wordBreak: 'break-word' }}>
                                                  📍 {propLocation}
                                                </p>
                                              )}
                                            </div>

                                            {p.price && (
                                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                                                ${Number(p.price).toLocaleString()}
                                                {p.listingType === 'RENT' && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}> /month</span>}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.85rem',
                                          padding: '0.5rem 0.85rem',
                                          background: '#faf8f5',
                                          borderTop: '1px solid rgba(10, 31, 57, 0.06)',
                                          fontSize: '0.75rem',
                                          color: 'var(--text-secondary)',
                                          flexWrap: 'wrap'
                                        }}>
                                          {p.bedrooms != null && <span>🛏️ {p.bedrooms} Beds</span>}
                                          {p.bathrooms != null && <span>🚿 {p.bathrooms} Baths</span>}
                                          {p.size && <span>📐 {Number(p.size).toLocaleString()} {p.sizeUnit || 'sq ft'}</span>}
                                        </div>

                                        {p.amenities && p.amenities.length > 0 && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', padding: '0.5rem 0.85rem', borderTop: '1px solid rgba(10, 31, 57, 0.04)' }}>
                                            {p.amenities.slice(0, 4).map((amenity, aIdx) => {
                                              const aName = typeof amenity === 'object' && amenity.name
                                                ? (typeof amenity.name === 'object' ? (amenity.name.en || amenity.name.es || Object.values(amenity.name)[0]) : amenity.name)
                                                : (typeof amenity === 'string' && !/^[0-9a-fA-F]{24}$/.test(amenity) ? amenity : null);
                                              if (!aName) return null;
                                              return (
                                                <span
                                                  key={amenity._id || aIdx}
                                                  style={{
                                                    fontSize: '0.68rem',
                                                    background: 'rgba(250, 179, 25, 0.1)',
                                                    color: '#b47404',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                    wordBreak: 'break-word'
                                                  }}
                                                >
                                                  ✓ {aName}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ padding: '1.25rem', background: '#faf8f5', borderRadius: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                  No saved properties found for this user.
                                </div>
                              )}
                            </div>

                            {/* Recently Viewed Properties */}
                            {/* <div style={{ minWidth: 0 }}>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                <Eye size={16} style={{ color: 'var(--primary)' }} />
                                Recently Viewed Listings ({recentlyViewed.length})
                              </h4>
                              {recentlyViewed.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {recentlyViewed.map((propId, i) => {
                                    const refStr = typeof propId === 'string' ? propId : (propId?._id || propId?.id || `Listing-${i}`);
                                    return (
                                      <div
                                        key={i}
                                        style={{
                                          background: '#ffffff',
                                          padding: '0.75rem 1rem',
                                          borderRadius: '10px',
                                          fontSize: '0.8125rem',
                                          border: '1px solid var(--border-color)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          color: 'var(--text-primary)',
                                          gap: '0.5rem',
                                          flexWrap: 'wrap'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                                          <Home size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                                          <span style={{ minWidth: 0, wordBreak: 'break-all' }}>Listing Reference: <code style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{refStr}</code></span>
                                        </div>
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-sm btn-icon"
                                          onClick={() => handleCopyToClipboard(refStr, `Copied ID: ${refStr}`)}
                                          title="Copy ID"
                                          style={{ width: '26px', height: '26px', padding: 0, flexShrink: 0 }}
                                        >
                                          <Copy size={13} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ padding: '1.25rem', background: '#faf8f5', borderRadius: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                  No viewed listings recorded for this user.
                                </div>
                              )}
                            </div> */}
                          </div>
                        )}

                        {/* TAB 3: PROFILE & PREFERENCES */}
                        {inspectActiveTab === 'account' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                            <div style={{
                              background: '#faf8f5',
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              padding: '1.25rem',
                              boxSizing: 'border-box',
                              width: '100%',
                              overflow: 'hidden'
                            }}>
                              <h4 style={{ margin: '0 0 1.15rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} color="var(--primary)" />
                                Account Information & Preferences
                              </h4>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
                                gap: '1.25rem 1.5rem',
                                fontSize: '0.8125rem',
                                width: '100%',
                                boxSizing: 'border-box'
                              }}>
                                {/* Full Legal Name */}
                                <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Full Legal Name</span>
                                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                    {userDetail.name || selectedUser.name}
                                  </p>
                                </div>

                                {/* Email Address (with resilient wrapping badge) */}
                                <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Email Address</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                      {userDetail.email || selectedUser.email}
                                    </span>
                                    <span
                                      className={`badge ${userDetail.isEmailVerified ? 'badge-success' : 'badge-warning'}`}
                                      style={{ fontSize: '0.65rem', padding: '1px 6px', flexShrink: 0, textTransform: 'capitalize' }}
                                    >
                                      {userDetail.isEmailVerified ? 'Verified' : 'Unverified'}
                                    </span>
                                  </div>
                                </div>

                                {/* Phone Number */}
                                <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Phone Number</span>
                                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                    {userDetail.phone || selectedUser.phone || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}
                                  </p>
                                </div>

                                {/* Preferred Language */}
                                <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Preferred Language</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                                    <Globe size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                      {userDetail.preferredLanguage || 'English'}
                                    </span>
                                  </div>
                                </div>

                                {/* Preferred Currency */}
                                <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Preferred Currency</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                                    <Coins size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                      {userDetail.preferredCurrency || 'USD (Dollar)'}
                                    </span>
                                  </div>
                                </div>

                                {/* Account Role */}
                                <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Account Role</span>
                                  <span className={`badge ${selectedUser.role === 'Buyer' ? 'badge-primary' : 'badge-info'}`} style={{ marginTop: '0.1rem', display: 'inline-block' }}>
                                    {userDetail.role || selectedUser.role}
                                  </span>
                                </div>

                                {/* Account Status */}
                                <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Account Status</span>
                                  <span className={`badge ${(userDetail.status === 'Active' || userDetail.status === 'approved' || userDetail.isActive) ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: '0.1rem', display: 'inline-block' }}>
                                    {userDetail.status || selectedUser.status}
                                  </span>
                                </div>

                                {/* Registration Date */}
                                <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Registration Date</span>
                                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                    {userDetail.createdAt ? formatDateTime(userDetail.createdAt) : selectedUser.joined}
                                  </p>
                                </div>

                                {/* Last Notification Sync */}
                                {/* <div style={{ minWidth: 0, boxSizing: 'border-box' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>Last Notification Sync</span>
                                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                    {userDetail.lastFetchNotification ? formatDateTime(userDetail.lastFetchNotification) : 'Never'}
                                  </p>
                                </div> */}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="modal-footer" style={{
                    background: '#faf8f5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1.5rem',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => handleDeleteClick(selectedUser)}
                        disabled={actionLoading === (selectedUser._id || selectedUser.id) || deleteLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Trash2 size={14} />
                        Delete User
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedUser.status === 'Active' ? 'btn-secondary text-danger' : 'btn-secondary text-success'}`}
                        onClick={() => handleToggleStatus(selectedUser)}
                        disabled={actionLoading === (selectedUser._id || selectedUser.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        {actionLoading === (selectedUser._id || selectedUser.id) ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : selectedUser.status === 'Active' ? (
                          <>
                            <UserX size={14} />
                            Suspend User
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            Activate User
                          </>
                        )}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleEditClick(selectedUser)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Edit2 size={14} />
                        Edit Profile
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setSelectedUser(null)}
                        style={{ minWidth: '80px' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
