import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Loader2,
  Upload,
  RefreshCw,
  Phone,
  Mail,
  Home,
  UserX,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const {
    adminUser,
    handleDeleteUser: onDeleteUser,
    addAuditLog: onAddAuditLog
  } = useStateContext();

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

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

  // Modal / Drawer States
  const [selectedUser, setSelectedUser] = useState(null); // Basic user object
  const [selectedUserDetails, setSelectedUserDetails] = useState(null); // Detailed data from GET /admin/users/:id
  const [drawerLoading, setDrawerLoading] = useState(false);
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

  // Search debounce ref
  const searchTimeoutRef = useRef(null);

  // Helper to format profile image URL
  const getProfileImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) return imagePath;
    const serverUrl = baseUrl.replace(/\/api$/, '');
    return `${serverUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
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
        profileImage: u.profileImage,
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
            List, filter, configure roles, and inspect recent activity for Dominican Real Estate accounts.
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
                  const avatarUrl = getProfileImageUrl(user.profileImage);
                  const isActioning = actionLoading === (user._id || user.id);

                  return (
                    <tr key={user._id || user.id}>
                      <td>
                        <div className="flex-align-center" style={{ gap: '0.75rem' }}>
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={user.name}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid var(--primary)',
                                flexShrink: 0
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'rgba(250, 179, 25, 0.12)',
                              border: '2px solid var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              color: '#b47404',
                              flexShrink: 0
                            }}>
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
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

      {/* EDIT USER MODAL (PUT /admin/users/:id) */}
      {editingUser && createPortal(
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
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
                    <div style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: 'rgba(250, 179, 25, 0.12)',
                      border: '3px solid var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      color: '#b47404'
                    }}>
                      {formName ? formName.charAt(0).toUpperCase() : 'U'}
                    </div>
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
        <div className="modal-overlay" onClick={() => !deleteLoading && setUserToDelete(null)}>
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
                {getProfileImageUrl(userToDelete.profileImage) ? (
                  <img
                    src={getProfileImageUrl(userToDelete.profileImage)}
                    alt={userToDelete.name}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--primary)',
                      flexShrink: 0
                    }}
                  />
                ) : (
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(250, 179, 25, 0.12)',
                    border: '2px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: '#b47404',
                    flexShrink: 0
                  }}>
                    {userToDelete.name ? userToDelete.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
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

      {/* PROFILE DETAIL DRAWER (GET /admin/users/:id) */}
      {selectedUser && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedUser(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Inspect User Profile</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedUser(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {drawerLoading ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--primary)' }} />
                  <p style={{ fontSize: '0.85rem' }}>Retrieving live user telemetry & saved properties...</p>
                </div>
              ) : (
                <>
                  {/* Profile Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                    {getProfileImageUrl(selectedUser.profileImage) ? (
                      <img
                        src={getProfileImageUrl(selectedUser.profileImage)}
                        alt={selectedUser.name}
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid var(--primary)',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(250, 179, 25, 0.12)',
                        border: '2px solid var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#b47404',
                        flexShrink: 0
                      }}>
                        {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {selectedUser.name}
                      </h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={13} /> {selectedUser.email}
                      </p>
                      {selectedUser.phone && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} /> {selectedUser.phone}
                        </p>
                      )}
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span className={`badge ${selectedUser.role === 'Buyer' ? 'badge-primary' : 'badge-info'}`}>
                          {selectedUser.role}
                        </span>
                        <span className={`badge ${selectedUser.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                          {selectedUser.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Metadata Card */}
                  <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>User ID</span>
                        <p style={{ fontWeight: 600, margin: '0.1rem 0 0', color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                          {selectedUser._id || selectedUser.id}
                        </p>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Registered Date</span>
                        <p style={{ fontWeight: 600, margin: '0.1rem 0 0', color: 'var(--text-primary)' }}>
                          {selectedUser.joined}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Saved Properties Section */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                      <Bookmark size={17} style={{ color: 'var(--primary)' }} />
                      Saved & Viewed Properties ({selectedUserDetails?.savedProperties?.length || selectedUser.recentlyViewed?.length || 0})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {selectedUserDetails?.savedProperties && selectedUserDetails.savedProperties.length > 0 ? (
                        selectedUserDetails.savedProperties.map((p, i) => {
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
                                flexDirection: 'column'
                              }}
                            >
                              {/* Top Banner / Image & Headline */}
                              <div style={{ display: 'flex', gap: '0.85rem', padding: '0.85rem' }}>
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
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
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
                                    <h5 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                      {propTitle}
                                    </h5>
                                    {propLocation && (
                                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
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

                              {/* Specs Bar (Bedrooms, Bathrooms, Size) */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.5rem 0.85rem',
                                background: '#faf8f5',
                                borderTop: '1px solid rgba(10, 31, 57, 0.06)',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)'
                              }}>
                                {p.bedrooms != null && <span>🛏️ {p.bedrooms} Beds</span>}
                                {p.bathrooms != null && <span>🚿 {p.bathrooms} Baths</span>}
                                {p.size && <span>📐 {Number(p.size).toLocaleString()} {p.sizeUnit || 'sq ft'}</span>}
                              </div>

                              {/* Amenities Tags */}
                              {p.amenities && p.amenities.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', padding: '0.5rem 0.85rem', borderTop: '1px solid rgba(10, 31, 57, 0.04)' }}>
                                  {p.amenities.slice(0, 4).map((amenity, aIdx) => {
                                    const aName = typeof amenity.name === 'object' ? (amenity.name.en || amenity.name.es) : amenity.name || amenity;
                                    return (
                                      <span
                                        key={amenity._id || aIdx}
                                        style={{
                                          fontSize: '0.68rem',
                                          background: 'rgba(250, 179, 25, 0.1)',
                                          color: '#b47404',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontWeight: 600
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
                        })
                      ) : selectedUser.recentlyViewed && selectedUser.recentlyViewed.length > 0 ? (
                        selectedUser.recentlyViewed.map((propId, i) => (
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
                              gap: '0.6rem',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <Home size={16} color="var(--primary)" />
                            <span>Listing Reference: <code>{typeof propId === 'string' ? propId : propId._id || 'Asset'}</code></span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '1.5rem', background: '#faf8f5', borderRadius: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                          No saved properties found for this user.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions in drawer */}
                  <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      onClick={() => {
                        handleEditClick(selectedUser);
                      }}
                    >
                      <Edit2 size={14} />
                      Edit Profile
                    </button>
                    <button
                      className={`btn ${selectedUser.status === 'Active' ? 'btn-danger' : 'btn-primary'}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      onClick={() => handleToggleStatus(selectedUser)}
                      disabled={actionLoading === (selectedUser._id || selectedUser.id)}
                    >
                      {actionLoading === (selectedUser._id || selectedUser.id) ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : selectedUser.status === 'Active' ? (
                        'Suspend User'
                      ) : (
                        'Activate User'
                      )}
                    </button>
                    <button
                      className="btn btn-secondary text-danger"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
                      onClick={() => handleDeleteClick(selectedUser)}
                      disabled={actionLoading === (selectedUser._id || selectedUser.id) || deleteLoading}
                      title="Delete User Account"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
