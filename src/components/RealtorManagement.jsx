import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import {
  Building,
  CheckCircle,
  Clock,
  XCircle,
  FileCheck,
  Download,
  Search,
  Filter,
  FileText,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Loader2,
  Upload,
  RefreshCw,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Eye,
  ExternalLink,
  X,
  MessageSquare,
  Users
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function RealtorManagement() {
  const {
    adminUser,
    handleUpdateRealtor: onUpdateRealtor,
    addAuditLog: onAddAuditLog
  } = useStateContext();

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.98:5000/api';

  // API Agent List & State
  const [agentsList, setAgentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores agent ID during row action

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  });

  // Filter States (status=pending, approved, rejected, suspended)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'pending' | 'approved' | 'rejected' | 'suspended'

  // Modals State
  const [selectedAgent, setSelectedAgent] = useState(null); // Basic agent object from row
  const [agentDetails, setAgentDetails] = useState(null); // Full { agent, leads, stats } from GET /admin/agents/:id
  const [activeViewTab, setActiveViewTab] = useState('leads'); // 'leads' | 'credentials'
  const [leadStatusFilter, setLeadStatusFilter] = useState('All'); // 'All' | 'pending' | 'contacted' | 'won'
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null); // For Edit Agent Modal
  const [agentToDelete, setAgentToDelete] = useState(null); // For Delete Agent Modal
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Status Change Modal State (Opened by clicking the status action button in the row)
  const [statusModalAgent, setStatusModalAgent] = useState(null);
  const [statusModalValue, setStatusModalValue] = useState('approved');
  const [statusModalReason, setStatusModalReason] = useState('');
  const [statusModalLoading, setStatusModalLoading] = useState(false);

  // Rejection State in Document Review
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Edit Form Fields (PUT /admin/agents/edit/:id or DELETE /admin/agents/edit/:id)
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAgencyName, setFormAgencyName] = useState('');
  const [formLicenseNumber, setFormLicenseNumber] = useState('');
  const [formStatus, setFormStatus] = useState('approved'); // 'pending' | 'approved' | 'rejected' | 'suspended'
  const [formProfileImageFile, setFormProfileImageFile] = useState(null);
  const [formProfileImagePreview, setFormProfileImagePreview] = useState('');
  const [formDocumentFile, setFormDocumentFile] = useState(null);
  const [formDocumentName, setFormDocumentName] = useState('');

  // Search debounce ref
  const searchTimeoutRef = useRef(null);

  // Helper to format profile image & document URLs
  const getMediaUrl = (mediaPath) => {
    if (!mediaPath) return null;
    if (mediaPath.startsWith('http') || mediaPath.startsWith('blob:')) return mediaPath;
    const serverUrl = baseUrl.replace(/\/api$/, '');
    return `${serverUrl}${mediaPath.startsWith('/') ? '' : '/'}${mediaPath}`;
  };

  // Normalize status string to lowercase ('approved', 'pending', 'rejected', 'suspended')
  const normalizeStatus = (status) => {
    if (!status) return 'pending';
    const s = String(status).toLowerCase().trim();
    if (s === 'verified' || s === 'approved') return 'approved';
    if (s === 'suspended') return 'suspended';
    if (s === 'rejected') return 'rejected';
    return 'pending';
  };

  // Status Badge UI (View-Only Badge for Verification Status)
  const renderStatusBadge = (status) => {
    const norm = normalizeStatus(status);
    if (norm === 'approved') {
      return (
        <span
          className="badge badge-success"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            fontWeight: 600,
            fontSize: '0.8rem'
          }}
        >
          <CheckCircle size={13} /> Approved
        </span>
      );
    }
    if (norm === 'pending') {
      return (
        <span
          className="badge badge-warning"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            fontWeight: 600,
            fontSize: '0.8rem'
          }}
        >
          <Clock size={13} /> Pending
        </span>
      );
    }
    if (norm === 'suspended') {
      return (
        <span
          className="badge badge-danger"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            fontWeight: 600,
            fontSize: '0.8rem'
          }}
        >
          <UserX size={13} /> Suspended
        </span>
      );
    }
    return (
      <span
        className="badge badge-danger"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '20px',
          fontWeight: 600,
          fontSize: '0.8rem'
        }}
      >
        <XCircle size={13} /> Rejected
      </span>
    );
  };

  // Lead Status Badge UI
  const renderLeadStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'contacted') {
      return <span className="badge badge-info" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>Contacted</span>;
    }
    if (s === 'won') {
      return <span className="badge badge-success" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>Won</span>;
    }
    if (s === 'pending') {
      return <span className="badge badge-warning" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>Pending</span>;
    }
    return <span className="badge badge-secondary" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>{status || 'Inquiry'}</span>;
  };

  // 1. GET ALL AGENTS WITH PAGINATION & STATUS FILTER: /admin/agents?status=pending,approved,rejected,suspended
  const fetchAgents = useCallback(async (
    targetPage = currentPage,
    targetLimit = limit,
    targetStatus = statusFilter,
    search = searchTerm
  ) => {
    if (!adminUser?.token) return;
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: targetLimit
      };

      if (targetStatus && targetStatus !== 'All') {
        params.status = targetStatus.toLowerCase();
      }

      if (search && search.trim()) {
        params.search = search.trim();
      }

      const res = await axios.get(`${baseUrl}/admin/agents`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        },
        params
      });

      const rawAgents = res.data?.data?.agents || res.data?.agents || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const paginationData = res.data?.data?.pagination || res.data?.pagination || {
        total: rawAgents.length,
        page: targetPage,
        limit: targetLimit,
        pages: Math.ceil(rawAgents.length / targetLimit) || 1
      };

      const mapped = rawAgents.map(a => {
        const idVal = a._id || a.id;
        const normStatus = normalizeStatus(a.status);
        return {
          _id: idVal,
          id: idVal,
          name: a.name || '—',
          email: a.email || '—',
          phone: a.phone || '',
          agency: a.agencyName || a.agency || '—',
          agencyName: a.agencyName || a.agency || '—',
          license: a.licenseNumber || a.liceneseNumber || a.license || '—',
          licenseNumber: a.licenseNumber || a.liceneseNumber || a.license || '—',
          status: normStatus,
          rawStatus: a.status,
          profileImage: a.profileImage || '',
          document: a.document || '',
          verificationDate: a.verificationDate || a.updatedAt || null,
          createdAt: a.createdAt || null,
          rejectionReason: a.rejectionReason || '',
          raw: a
        };
      });

      setAgentsList(mapped);
      setPagination(paginationData);
      setCurrentPage(paginationData.page || targetPage);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch realtors from server');
      setAgentsList([]);
      setPagination({ total: 0, page: 1, limit: targetLimit, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [adminUser?.token, baseUrl, currentPage, limit, statusFilter, searchTerm]);

  // Initial Fetch & Dependency Triggers
  useEffect(() => {
    fetchAgents(currentPage, limit, statusFilter, searchTerm);
  }, [adminUser?.token, currentPage, limit, statusFilter]);

  // Search input change with debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchAgents(1, limit, statusFilter, value);
    }, 350);
  };

  // Status Filter change: status=pending, approved, rejected, suspended
  const handleStatusFilterChange = (e) => {
    const newStatus = e.target.value;
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchAgents(1, limit, newStatus, searchTerm);
  };

  // Page Navigation Handlers
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > (pagination.pages || 1) || newPage === currentPage) return;
    setCurrentPage(newPage);
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimit(newLimit);
    setCurrentPage(1);
    fetchAgents(1, newLimit, statusFilter, searchTerm);
  };

  // 2. GET AGENT BY ID: /admin/agents/:id (Loads detailed Agent + Leads + Stats)
  const handleInspectAgent = async (agent, defaultTab = 'leads') => {
    setSelectedAgent(agent);
    setAgentDetails(null);
    setShowRejectForm(false);
    setRejectReason('');
    setLeadStatusFilter('All');
    setActiveViewTab(normalizeStatus(agent.status) === 'pending' ? 'credentials' : defaultTab);
    setDrawerLoading(true);

    const agentId = agent._id || agent.id;
    try {
      const res = await axios.get(`${baseUrl}/admin/agents/${agentId}`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });
      const resData = res.data?.data || res.data || {};
      setAgentDetails(resData);
    } catch (err) {
      console.error('Failed to load detailed agent profile:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch full agent details');
    } finally {
      setDrawerLoading(false);
    }
  };

  // 3. CHANGE STATUS OF AGENTS: PUT /admin/agents/:id/status (Parameter: status)
  const handleChangeStatus = async (agent, nextStatus, customReason = '') => {
    const agentId = agent._id || agent.id;
    if (!adminUser?.token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setActionLoading(agentId);
      const payload = {
        status: nextStatus
      };
      if (customReason) {
        payload.rejectionReason = customReason;
        payload.reason = customReason;
      }

      const res = await axios.put(`${baseUrl}/admin/agents/${agentId}/status`, payload, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      const displayStatus = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
      toast.success(res.data?.message || `Agent status updated to ${displayStatus}`);

      // Update state locally
      setAgentsList(prev => prev.map(a => {
        if ((a._id || a.id) === agentId) {
          return {
            ...a,
            status: nextStatus,
            rejectionReason: customReason || a.rejectionReason,
            verificationDate: nextStatus === 'approved' ? new Date().toISOString().split('T')[0] : a.verificationDate
          };
        }
        return a;
      }));

      // If view modal is open for this agent, update it
      if (selectedAgent && (selectedAgent._id || selectedAgent.id) === agentId) {
        setSelectedAgent(prev => ({
          ...prev,
          status: nextStatus,
          rejectionReason: customReason || prev.rejectionReason
        }));
        if (agentDetails?.agent) {
          setAgentDetails(prev => ({
            ...prev,
            agent: {
              ...prev.agent,
              status: nextStatus
            }
          }));
        }
      }

      // Context sync & audit log
      if (typeof onUpdateRealtor === 'function') {
        onUpdateRealtor({
          ...agent,
          status: displayStatus,
          rejectionReason: customReason
        });
      }
      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Realtor', `Updated agent status for ${agent.name} (${agent.agency || agent.agencyName}) to ${displayStatus}`);
      }

      setShowRejectForm(false);
      setRejectReason('');
      if (nextStatus === 'approved' || nextStatus === 'rejected') {
        setSelectedAgent(null);
      }
    } catch (err) {
      console.error('Failed to update agent status:', err);
      toast.error(err.response?.data?.message || 'Failed to update agent status on server');
    } finally {
      setActionLoading(null);
    }
  };

  // Open the dedicated Status Change Modal (called by the action button in the row)
  const handleOpenStatusModal = (agent) => {
    setStatusModalAgent(agent);
    setStatusModalValue(normalizeStatus(agent.status));
    setStatusModalReason(agent.rejectionReason || '');
  };

  // Save status from dedicated Status Change Modal
  const handleSaveStatusModal = async (e) => {
    e.preventDefault();
    if (!statusModalAgent) return;
    if (statusModalValue === 'rejected' && !statusModalReason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }
    try {
      setStatusModalLoading(true);
      await handleChangeStatus(statusModalAgent, statusModalValue, statusModalReason.trim());
      setStatusModalAgent(null);
    } finally {
      setStatusModalLoading(false);
    }
  };

  // 4. DELETE AGENT: DELETE /admin/agents/:id
  const handleDeleteClick = (agent) => {
    setAgentToDelete(agent);
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    const agentId = agentToDelete._id || agentToDelete.id;
    if (!adminUser?.token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setDeleteLoading(true);
      setActionLoading(agentId);

      const res = await axios.delete(`${baseUrl}/admin/agents/${agentId}`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      toast.success(res.data?.message || `Agent ${agentToDelete.name} deleted successfully`);

      setAgentsList(prev => prev.filter(a => (a._id || a.id) !== agentId));
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, (prev.total || 1) - 1)
      }));

      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Realtor', `Permanently deleted agent account ${agentToDelete.name} (ID: ${agentId})`);
      }

      if (selectedAgent && (selectedAgent._id || selectedAgent.id) === agentId) {
        setSelectedAgent(null);
        setAgentDetails(null);
      }

      setAgentToDelete(null);

      if (agentsList.length <= 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      console.error('Failed to delete agent:', err);
      toast.error(err.response?.data?.message || 'Failed to delete agent from server');
    } finally {
      setDeleteLoading(false);
      setActionLoading(null);
    }
  };

  // 5. UPDATE AGENT: /admin/agents/edit/:id
  const handleEditClick = (agent) => {
    setEditingAgent(agent);
    setFormName(agent.name !== '—' ? (agent.name || '') : '');
    setFormEmail(agent.email !== '—' ? (agent.email || '') : '');
    setFormPhone(agent.phone || '');
    setFormAgencyName(agent.agencyName !== '—' ? (agent.agencyName || agent.agency || '') : '');
    setFormLicenseNumber(agent.licenseNumber !== '—' ? (agent.licenseNumber || agent.license || '') : '');
    setFormStatus(normalizeStatus(agent.status));
    setFormProfileImageFile(null);
    setFormProfileImagePreview(getMediaUrl(agent.profileImage) || '');
    setFormDocumentFile(null);
    setFormDocumentName(agent.document ? 'Current document on file' : '');
  };

  const handleProfileImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormProfileImageFile(file);
      setFormProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormDocumentFile(file);
      setFormDocumentName(file.name);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAgent) return;
    const agentId = editingAgent._id || editingAgent.id;

    try {
      setEditLoading(true);
      setActionLoading(agentId);

      const formData = new FormData();
      formData.append('name', formName);
      formData.append('email', formEmail);
      formData.append('phone', formPhone);
      formData.append('agencyName', formAgencyName);
      formData.append('licenseNumber', formLicenseNumber);

      if (formProfileImageFile) {
        formData.append('profileImage', formProfileImageFile);
      }
      if (formDocumentFile) {
        formData.append('document', formDocumentFile);
      }

      let res;
      try {
        res = await axios.put(`${baseUrl}/admin/agents/edit/${agentId}`, formData, {
          headers: {
            Authorization: `Bearer ${adminUser.token}`
          }
        });
      } catch (firstErr) {
        if (firstErr.response && (firstErr.response.status === 404 || firstErr.response.status === 405)) {
          try {
            res = await axios.delete(`${baseUrl}/admin/agents/edit/${agentId}`, {
              headers: {
                Authorization: `Bearer ${adminUser.token}`
              },
              data: formData
            });
          } catch (secondErr) {
            if (secondErr.response && (secondErr.response.status === 404 || secondErr.response.status === 405)) {
              res = await axios.put(`${baseUrl}/admin/agents/${agentId}`, formData, {
                headers: {
                  Authorization: `Bearer ${adminUser.token}`
                }
              });
            } else {
              throw secondErr;
            }
          }
        } else {
          throw firstErr;
        }
      }

      // If status was changed in the edit form, update status via PUT /admin/agents/:id/status
      if (formStatus && formStatus !== normalizeStatus(editingAgent.status)) {
        try {
          await axios.put(`${baseUrl}/admin/agents/${agentId}/status`, {
            status: formStatus
          }, {
            headers: {
              Authorization: `Bearer ${adminUser.token}`
            }
          });
        } catch (statusErr) {
          console.warn('Status update alongside profile edit failed:', statusErr);
        }
      }

      toast.success(res.data?.message || 'Realtor profile updated successfully');

      const updatedObj = res.data?.data?.agent || res.data?.agent || res.data?.data;

      setAgentsList(prev => prev.map(a => {
        if ((a._id || a.id) === agentId) {
          return {
            ...a,
            name: formName,
            email: formEmail,
            phone: formPhone,
            agency: formAgencyName,
            agencyName: formAgencyName,
            license: formLicenseNumber,
            licenseNumber: formLicenseNumber,
            status: formStatus || a.status,
            profileImage: updatedObj?.profileImage || (formProfileImageFile ? formProfileImagePreview : a.profileImage),
            document: updatedObj?.document || a.document
          };
        }
        return a;
      }));

      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Realtor', `Modified agent profile details for ${formName} (${formAgencyName})`);
      }

      setEditingAgent(null);
    } catch (err) {
      console.error('Failed to update agent profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update agent profile');
    } finally {
      setEditLoading(false);
      setActionLoading(null);
    }
  };

  // Export CSV Handler
  const handleExportRealtors = () => {
    if (agentsList.length === 0) {
      toast.error('No agent data available to export');
      return;
    }
    const csvRows = [
      ['Name', 'Email', 'Phone', 'Agency', 'License', 'Status'],
      ...agentsList.map(a => [
        `"${a.name || ''}"`,
        `"${a.email || ''}"`,
        `"${a.phone || ''}"`,
        `"${a.agency || a.agencyName || ''}"`,
        `"${a.license || a.licenseNumber || ''}"`,
        `"${a.status || ''}"`
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `realtors_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof onAddAuditLog === 'function') {
      onAddAuditLog('Reports', 'Exported Realtor Directory report as CSV');
    }
    toast.success('Realtor directory report downloaded successfully');
  };

  // Pagination Indices
  const totalPages = pagination.pages || Math.ceil((pagination.total || 0) / limit) || 1;
  const fromIndex = pagination.total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const toIndex = Math.min(currentPage * limit, pagination.total);

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

  const detailedAgent = agentDetails?.agent || agentDetails || selectedAgent || {};
  const leadsList = Array.isArray(agentDetails?.leads) ? agentDetails.leads : [];
  const statsData = agentDetails?.stats || {
    totalLeads: leadsList.length,
    pendingLeads: leadsList.filter(l => (l.status || '').toLowerCase() === 'pending').length,
    contactedLeads: leadsList.filter(l => (l.status || '').toLowerCase() === 'contacted').length,
    wonLeads: leadsList.filter(l => (l.status || '').toLowerCase() === 'won').length
  };

  const filteredLeads = leadsList.filter(l => {
    if (leadStatusFilter === 'All') return true;
    return (l.status || '').toLowerCase() === leadStatusFilter.toLowerCase();
  });

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Tablet & Mobile Responsiveness Stylesheet */}
      <style>{`
        .realtor-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .realtor-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .realtor-filter-bar {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
          padding: 1rem;
        }
        .realtor-search-box {
          position: relative;
          flex: 1;
          min-width: 240px;
        }
        .realtor-table-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .realtor-custom-table {
          min-width: 650px;
          width: 100%;
        }
        .realtor-actions-cell {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          justify-content: flex-end;
          white-space: nowrap;
        }
        .realtor-pagination-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--border-color);
          background: #faf8f5;
          flex-wrap: wrap;
          gap: 1rem;
        }

        /* Desktop Table vs Mobile Cards */
        .realtor-desktop-table {
          display: block;
        }
        .realtor-mobile-list {
          display: none;
        }

        @media (max-width: 768px) {
          .realtor-desktop-table {
            display: none !important;
          }
          .realtor-mobile-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.85rem !important;
            padding: 0.85rem !important;
          }
        }

        /* View Modal: Rock-Solid Consistent Width & Padding */
        .realtor-view-modal {
          width: 100% !important;
          max-width: 780px !important;
          max-height: 90vh !important;
          display: flex !important;
          flex-direction: column !important;
          background: #ffffff !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: var(--shadow-lg) !important;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .realtor-modal-body {
          padding: 1.25rem !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 1.25rem !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          flex: 1 !important;
        }

        /* Navigation Tabs with fixed alignment & permanent underline on active */
        .realtor-tabs-header {
          display: flex;
          align-items: stretch;
          border-bottom: 1px solid var(--border-color);
          background: #faf8f5;
          padding: 0 1.25rem;
          gap: 0.5rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .realtor-tab-btn {
          position: relative;
          padding: 0.85rem 1rem;
          border: none;
          background: none;
          font-size: 0.875rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          white-space: nowrap;
          transition: all 0.15s ease;
          color: var(--text-secondary);
          font-weight: 500;
          border-bottom: 3px solid transparent;
          margin-bottom: -1px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .realtor-tab-btn:hover {
          color: var(--text-primary);
        }

        .realtor-tab-btn.active {
          color: var(--primary) !important;
          font-weight: 700 !important;
          border-bottom: 3px solid var(--primary) !important;
          box-shadow: inset 0 -3px 0 var(--primary) !important;
        }

        .realtor-tab-badge {
          background: rgba(10, 31, 57, 0.08);
          color: var(--text-primary);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
          transition: all 0.15s ease;
        }

        .realtor-tab-btn.active .realtor-tab-badge {
          background: var(--primary);
          color: #ffffff;
        }

        .realtor-tab-text-mobile {
          display: none;
        }

        .realtor-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        .realtor-identity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        /* Tablet Breakpoint (<= 992px) */
        @media (max-width: 992px) {
          .realtor-header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.85rem;
          }
          .realtor-header-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .realtor-filter-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .realtor-search-box {
            width: 100%;
            min-width: 100%;
          }
          .realtor-filter-select-wrapper {
            width: 100%;
            display: flex;
            justify-content: flex-start;
          }
          .realtor-filter-select {
            width: 100% !important;
          }
          .custom-table th, .custom-table td {
            padding: 0.75rem 0.85rem !important;
            font-size: 0.8125rem !important;
          }
          .realtor-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .realtor-view-modal {
            width: 95vw !important;
            max-width: 95vw !important;
          }
        }

        /* Mobile / Smartphone Breakpoint (<= 600px) */
        @media (max-width: 600px) {
          .modal-overlay {
            padding: 0.5rem !important;
          }
          .realtor-view-modal {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 94vh !important;
            border-radius: 12px !important;
          }
          .realtor-modal-body {
            padding: 0.85rem !important;
            gap: 0.85rem !important;
          }
          .realtor-tabs-header {
            padding: 0 0.5rem;
            gap: 0.25rem;
          }
          .realtor-tab-btn {
            flex: 1;
            justify-content: center;
            padding: 0.7rem 0.35rem;
            font-size: 0.8rem;
            gap: 0.35rem;
          }
          .realtor-tab-text-full {
            display: none;
          }
          .realtor-tab-text-mobile {
            display: inline;
          }
          .realtor-identity-grid {
            grid-template-columns: 1fr !important;
            gap: 0.5rem !important;
          }
          .realtor-header-row h2 {
            font-size: 1.25rem;
          }
          .realtor-header-actions {
            display: flex;
            width: 100%;
            gap: 0.5rem;
          }
          .realtor-header-actions button {
            flex: 1;
            justify-content: center;
            font-size: 0.78rem;
            padding: 0.5rem 0.6rem;
          }
          .realtor-custom-table {
            min-width: 560px;
          }
          .realtor-pagination-toolbar {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.75rem;
            padding: 0.85rem 1rem;
          }
          .realtor-pagination-left {
            flex-direction: column;
            gap: 0.4rem;
            align-items: center;
          }
          .realtor-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="realtor-header-row">
        <div>
          <h2>Realtor & Broker Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Verify real estate licenses, inspect assigned client leads, suspend policy violations, and manage registered agencies.
          </p>
        </div>
        <div className="realtor-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => fetchAgents(currentPage, limit, statusFilter, searchTerm)}
            disabled={loading}
            title="Refresh Directory"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={handleExportRealtors} style={{ gap: '0.5rem' }}>
            <Download size={16} />
            Export Directory CSV
          </button>
        </div>
      </div>

      {/* Search & Filter Bar (Status: pending, approved, rejected, suspended) */}
      <div className="glass-panel realtor-filter-bar">
        <div className="realtor-search-box">
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by agent name, brokerage firm, license code, phone..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex-align-center realtor-filter-select-wrapper" style={{ gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <select
            className="form-control form-select realtor-filter-select"
            style={{ width: '180px', padding: '0.5rem 2rem 0.5rem 1rem' }}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Realtor List Table & Mobile Card View */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* 1. DESKTOP & TABLET TABLE VIEW (Screens > 768px) */}
        <div className="realtor-desktop-table table-container realtor-table-wrapper">
          <table className="custom-table realtor-custom-table">
            <thead>
              <tr>
                <th>Agent Profile</th>
                <th>Brokerage Firm</th>
                <th>License ID</th>
                <th>Verification Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <Loader2 className="animate-spin" size={20} color="var(--primary)" />
                      <span>Loading registered realtors from server...</span>
                    </div>
                  </td>
                </tr>
              ) : agentsList.length > 0 ? (
                agentsList.map((agent) => {
                  const avatarUrl = getMediaUrl(agent.profileImage);
                  const isRowActioning = actionLoading === (agent._id || agent.id);
                  const normStatus = normalizeStatus(agent.status);

                  return (
                    <tr key={agent._id || agent.id}>
                      <td>
                        <div className="flex-align-center" style={{ gap: '0.75rem' }}>
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={agent.name}
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
                              {agent.name && agent.name !== '—' ? agent.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                          )}
                          <div>
                            <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{agent.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{agent.email}</p>
                            {agent.phone && (
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{agent.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Building size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>{agent.agency || agent.agencyName}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{agent.license || agent.licenseNumber}</td>
                      <td>
                        {/* Verification Status: View-Only Badge */}
                        {renderStatusBadge(agent.status)}
                      </td>
                      <td>
                        <div className="realtor-actions-cell">
                          {normStatus === 'pending' ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleInspectAgent(agent, 'credentials')}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="Review License & Credentials"
                            >
                              <FileCheck size={13} />
                              Review Docs
                            </button>
                          ) : (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleInspectAgent(agent, 'leads')}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="View Leads & Profile"
                            >
                              <Eye size={13} />
                              View
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleEditClick(agent)}
                            title="Edit Realtor Profile"
                          >
                            <Edit2 size={14} />
                          </button>
                          {/* Status Action Button: Opens the Change Agent Status Modal */}
                          <button
                            className={`btn btn-ghost btn-sm btn-icon ${normStatus === 'approved' ? 'text-success' : normStatus === 'pending' ? 'text-warning' : 'text-danger'}`}
                            onClick={() => handleOpenStatusModal(agent)}
                            disabled={isRowActioning}
                            title={`Change Status (Current: ${normStatus})`}
                          >
                            {isRowActioning ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : normStatus === 'approved' ? (
                              <UserCheck size={14} />
                            ) : (
                              <UserX size={14} />
                            )}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon text-danger"
                            onClick={() => handleDeleteClick(agent)}
                            title="Delete Realtor Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Building size={38} style={{ color: 'var(--text-muted)', opacity: 0.45, marginBottom: '0.25rem' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                        No realtors found
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                        {searchTerm || statusFilter !== 'All'
                          ? 'No registered realtors match your active search or status criteria.'
                          : 'There are currently no realtors registered on the platform.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 2. MOBILE CARD VIEW (Screens <= 768px - Complete Mobile Responsiveness) */}
        <div className="realtor-mobile-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Loader2 className="animate-spin" size={24} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
              <span>Loading registered realtors from server...</span>
            </div>
          ) : agentsList.length > 0 ? (
            agentsList.map((agent) => {
              const avatarUrl = getMediaUrl(agent.profileImage);
              const isRowActioning = actionLoading === (agent._id || agent.id);
              const normStatus = normalizeStatus(agent.status);

              return (
                <div
                  key={agent._id || agent.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Card Header: Avatar, Name, Email, Status View Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={agent.name}
                          style={{
                            width: '42px',
                            height: '42px',
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
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'rgba(250, 179, 25, 0.12)',
                          border: '2px solid var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#b47404',
                          fontSize: '1rem',
                          flexShrink: 0
                        }}>
                          {agent.name && agent.name !== '—' ? agent.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {agent.name}
                        </h4>
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {agent.email}
                        </p>
                        {agent.phone && (
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {agent.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      {/* View-Only Status Badge */}
                      {renderStatusBadge(agent.status)}
                    </div>
                  </div>

                  {/* Agency & License Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    background: '#faf8f5',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Brokerage Firm</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{agent.agency || agent.agencyName || '—'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>License ID</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{agent.license || agent.licenseNumber || '—'}</span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    {normStatus === 'pending' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleInspectAgent(agent, 'credentials')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      >
                        <FileCheck size={14} />
                        Review Docs
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleInspectAgent(agent, 'leads')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm btn-icon"
                      onClick={() => handleEditClick(agent)}
                      title="Edit Realtor Profile"
                      style={{ width: '36px', height: '36px', padding: 0 }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className={`btn btn-secondary btn-sm btn-icon ${normStatus === 'approved' ? 'text-success' : normStatus === 'pending' ? 'text-warning' : 'text-danger'}`}
                      onClick={() => handleOpenStatusModal(agent)}
                      disabled={isRowActioning}
                      title={`Change Status (Current: ${normStatus})`}
                      style={{ width: '36px', height: '36px', padding: 0 }}
                    >
                      {isRowActioning ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : normStatus === 'approved' ? (
                        <UserCheck size={15} />
                      ) : (
                        <UserX size={15} />
                      )}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm btn-icon text-danger"
                      onClick={() => handleDeleteClick(agent)}
                      title="Delete Realtor Account"
                      style={{ width: '36px', height: '36px', padding: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <Building size={34} style={{ color: 'var(--text-muted)', opacity: 0.45, margin: '0 auto 0.5rem' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>No realtors found</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                {searchTerm || statusFilter !== 'All' ? 'No realtors match your active filters.' : 'There are currently no realtors registered.'}
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION TOOLBAR */}
        <div className="realtor-pagination-toolbar">
          <div className="flex-align-center realtor-pagination-left" style={{ gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{fromIndex}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{toIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> realtors
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1 || loading || pagination.total === 0}
              title="First Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading || pagination.total === 0}
              title="Previous Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronLeft size={15} />
            </button>

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

            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading || pagination.total === 0}
              title="Next Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronRight size={15} />
            </button>
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

      {/* 1. AGENT VIEW MODAL: Leads, Stats & Credentials (GET /admin/agents/:id) */}
      {selectedAgent && createPortal(
        <div className="modal-overlay" onClick={() => { setSelectedAgent(null); setShowRejectForm(false); }}>
          <div
            className="modal-content realtor-view-modal"
            style={{
              width: '100%',
              maxWidth: '780px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(250, 179, 25, 0.12)',
                  border: '2px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#b47404',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {getMediaUrl(detailedAgent.profileImage || selectedAgent.profileImage) ? (
                    <img
                      src={getMediaUrl(detailedAgent.profileImage || selectedAgent.profileImage)}
                      alt={detailedAgent.name || selectedAgent.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    (detailedAgent.name || selectedAgent.name || 'A').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {detailedAgent.name || selectedAgent.name}
                    </h3>
                    {renderStatusBadge(detailedAgent.status || selectedAgent.status)}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {detailedAgent.agencyName || detailedAgent.agency || selectedAgent.agency || selectedAgent.agencyName} • License: <span style={{ fontFamily: 'monospace' }}>{detailedAgent.licenseNumber || detailedAgent.liceneseNumber || detailedAgent.license || selectedAgent.license}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => { setSelectedAgent(null); setShowRejectForm(false); }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-header Navigation Tabs */}
            <div className="realtor-tabs-header">
              <button
                type="button"
                onClick={() => setActiveViewTab('leads')}
                className={`realtor-tab-btn ${activeViewTab === 'leads' ? 'active' : 'inactive'}`}
              >
                <Users size={16} />
                <span className="realtor-tab-text-full">Client Leads & Inquiries</span>
                <span className="realtor-tab-text-mobile">Leads</span>
                <span className="realtor-tab-badge">
                  {statsData.totalLeads}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab('credentials')}
                className={`realtor-tab-btn ${activeViewTab === 'credentials' ? 'active' : 'inactive'}`}
              >
                <FileCheck size={16} />
                <span className="realtor-tab-text-full">License & Credentials Review</span>
                <span className="realtor-tab-text-mobile">Credentials</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body realtor-modal-body">
              {drawerLoading ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Retrieving live agent details, client leads & stats from server...</p>
                </div>
              ) : activeViewTab === 'leads' ? (
                /* TAB 1: CLIENT LEADS & INQUIRIES */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                  {/* Lead Stats Bar */}
                  <div className="realtor-stats-grid">
                    <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Total Leads</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: 'var(--text-primary)' }}>{statsData.totalLeads}</p>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#b47404', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Pending</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#d97706' }}>{statsData.pendingLeads}</p>
                    </div>
                    <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Contacted</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#0284c7' }}>{statsData.contactedLeads}</p>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Won</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#059669' }}>{statsData.wonLeads}</p>
                    </div>
                  </div>

                  {/* Filter Leads by Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Inquiries List ({filteredLeads.length})
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {['All', 'pending', 'contacted', 'won'].map(st => (
                        <button
                          key={st}
                          type="button"
                          className={`btn btn-sm ${leadStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', textTransform: 'capitalize' }}
                          onClick={() => setLeadStatusFilter(st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leads Cards */}
                  {filteredLeads.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {filteredLeads.map((lead) => {
                        const userImg = getMediaUrl(lead.user?.profileImage);
                        return (
                          <div
                            key={lead._id || lead.id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid var(--border-color)',
                              borderRadius: '10px',
                              padding: '1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.65rem',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                {userImg ? (
                                  <img
                                    src={userImg}
                                    alt={lead.name}
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '1px solid var(--primary)',
                                      flexShrink: 0
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(250, 179, 25, 0.12)',
                                    color: '#b47404',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    flexShrink: 0
                                  }}>
                                    {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                                  </div>
                                )}
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                    {lead.name}
                                  </h4>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                                    {lead.email && (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <Mail size={12} style={{ color: 'var(--text-muted)' }} /> {lead.email}
                                      </span>
                                    )}
                                    {lead.phone && (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <Phone size={12} style={{ color: 'var(--text-muted)' }} /> {lead.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {renderLeadStatusBadge(lead.status)}
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                </span>
                              </div>
                            </div>

                            {/* Inquiry message */}
                            {lead.description && (
                              <div style={{
                                background: '#faf8f5',
                                border: '1px solid rgba(10, 31, 57, 0.08)',
                                borderRadius: '6px',
                                padding: '0.65rem 0.85rem',
                                fontSize: '0.8125rem',
                                color: 'var(--text-primary)',
                                lineHeight: 1.45,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem'
                              }}>
                                <MessageSquare size={14} style={{ color: 'var(--primary)', marginTop: '2px', flexShrink: 0 }} />
                                <span>{lead.description}</span>
                              </div>
                            )}

                            {lead.user && lead.user.name && lead.user.name !== lead.name && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Linked User Account: <strong>{lead.user.name}</strong> ({lead.user.email})
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      background: '#faf8f5',
                      borderRadius: '10px',
                      border: '1px dashed var(--border-color)'
                    }}>
                      <Users size={32} style={{ color: 'var(--text-muted)', opacity: 0.5, margin: '0 auto 0.5rem' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>
                        No leads found
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        {leadStatusFilter !== 'All'
                          ? `No leads with status "${leadStatusFilter}" for this agent.`
                          : 'There are currently no customer leads assigned to this realtor.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: PROFILE & CREDENTIALS REVIEW */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                  <div style={{ background: '#faf8f5', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.85rem', color: 'var(--text-primary)' }}>Applicant Identity</h4>
                    <div className="realtor-identity-grid">
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Full Name:</strong> {detailedAgent.name || selectedAgent.name}</p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Email:</strong> {detailedAgent.email || selectedAgent.email}</p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Phone:</strong> {detailedAgent.phone || selectedAgent.phone || 'Not specified'}</p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Agency:</strong> {detailedAgent.agencyName || detailedAgent.agency || selectedAgent.agency || selectedAgent.agencyName}</p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>License Number:</strong> {detailedAgent.licenseNumber || detailedAgent.liceneseNumber || detailedAgent.license || selectedAgent.license}</p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Registration Date:</strong> {detailedAgent.createdAt ? new Date(detailedAgent.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Document Review Section */}
                  <div style={{
                    background: '#faf8f5',
                    border: '1px solid var(--border-color)',
                    padding: '1.25rem',
                    borderRadius: '10px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    <FileText size={40} style={{ color: 'var(--primary)', margin: '0 auto 0.75rem' }} />
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {(detailedAgent.document || selectedAgent.document)
                        ? 'License Verification Document'
                        : 'No Document Uploaded'}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {(detailedAgent.document || selectedAgent.document)
                        ? 'Official licensing and accreditation document on file for this realtor.'
                        : 'This realtor has not uploaded an official verification document yet.'}
                    </p>

                    {(detailedAgent.document || selectedAgent.document) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        {/\.(png|jpe?g|webp|gif)$/i.test(detailedAgent.document || selectedAgent.document) && (
                          <img
                            src={getMediaUrl(detailedAgent.document || selectedAgent.document)}
                            alt="License Document"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '200px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              objectFit: 'contain',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          />
                        )}
                        <a
                          href={getMediaUrl(detailedAgent.document || selectedAgent.document)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <ExternalLink size={14} />
                          Open Document in New Tab
                        </a>
                      </div>
                    ) : null}
                  </div>

                  {/* Reject reason display if already rejected */}
                  {normalizeStatus(selectedAgent.status) === 'rejected' && selectedAgent.rejectionReason && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '0.85rem' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>Previous Rejection Reason:</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#7f1d1d' }}>{selectedAgent.rejectionReason}</p>
                    </div>
                  )}

                  {/* Reject Form */}
                  {showRejectForm && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!rejectReason.trim()) {
                        toast.error('Please specify a rejection reason');
                        return;
                      }
                      handleChangeStatus(selectedAgent, 'rejected', rejectReason.trim());
                    }} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label text-danger" style={{ fontWeight: 600 }}>Specify Rejection Reason</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="e.g. Expired licensing credentials, identity mismatch, unaccredited agency..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRejectForm(false)}>
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-danger btn-sm"
                          disabled={actionLoading === (selectedAgent._id || selectedAgent.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          {actionLoading === (selectedAgent._id || selectedAgent.id) && <Loader2 size={13} className="animate-spin" />}
                          Confirm Rejection
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!showRejectForm && (
              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedAgent(null)}>
                  Close
                </button>
                {normalizeStatus(selectedAgent.status) === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setShowRejectForm(true)}
                      disabled={actionLoading === (selectedAgent._id || selectedAgent.id)}
                    >
                      Reject Credentials
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => handleChangeStatus(selectedAgent, 'approved')}
                      disabled={actionLoading === (selectedAgent._id || selectedAgent.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {actionLoading === (selectedAgent._id || selectedAgent.id) ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Approve & Verify
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 2. EDIT AGENT MODAL (URL /admin/agents/edit/:id) */}
      {editingAgent && createPortal(
        <div className="modal-overlay" onClick={() => !editLoading && setEditingAgent(null)}>
          <form
            className="modal-content"
            style={{ maxWidth: '620px', width: '100%', maxHeight: '90vh' }}
            onSubmit={handleEditSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Update Realtor Profile</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => !editLoading && setEditingAgent(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Profile Image Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  {formProfileImagePreview ? (
                    <img
                      src={formProfileImagePreview}
                      alt="Agent Avatar"
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
                      {formName ? formName.charAt(0).toUpperCase() : 'A'}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="form-label" style={{ marginBottom: '0.35rem' }}>Profile Picture</label>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Upload size={14} />
                    Choose New Avatar
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleProfileImageFileChange}
                    />
                  </label>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    JPG, PNG, WebP up to 5MB
                  </p>
                </div>
              </div>

              {/* Form Input Fields with responsive grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="agent@agency.com"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +1 555-0199"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Agency Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formAgencyName}
                    onChange={(e) => setFormAgencyName(e.target.value)}
                    placeholder="e.g. Skyline Realty Partners"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">License Number / Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formLicenseNumber}
                    onChange={(e) => setFormLicenseNumber(e.target.value)}
                    placeholder="e.g. LIC-2025-4512"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Verification / Account Status</label>
                  <select
                    className="form-control form-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Document Upload Field */}
              <div className="form-group" style={{ background: '#faf8f5', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Licensing Document / Certificate</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Upload size={14} />
                    Select Document (PDF/Image)
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      style={{ display: 'none' }}
                      onChange={handleDocumentFileChange}
                    />
                  </label>
                  <span style={{ fontSize: '0.8rem', color: formDocumentFile ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {formDocumentName || 'No document selected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingAgent(null)}
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {editLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* 3. DEDICATED CHANGE STATUS MODAL (Opened by clicking the status action button in Actions column) */}
      {statusModalAgent && createPortal(
        <div className="modal-overlay" onClick={() => !statusModalLoading && setStatusModalAgent(null)}>
          <form
            className="modal-content"
            style={{ maxWidth: '440px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
            onSubmit={handleSaveStatusModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Change Agent Status</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !statusModalLoading && setStatusModalAgent(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', padding: '1.25rem' }}>
              <div style={{ background: '#faf8f5', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {statusModalAgent.name}
                </p>
                <p style={{ margin: '0.15rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {statusModalAgent.agency || statusModalAgent.agencyName} • {statusModalAgent.email}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.45rem' }}>
                  Select New Status *
                </label>
                <select
                  className="form-control form-select"
                  value={statusModalValue}
                  onChange={(e) => setStatusModalValue(e.target.value)}
                  style={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    height: '44px',
                    lineHeight: 'normal',
                    padding: '0.5rem 2.5rem 0.5rem 1rem',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    borderColor: statusModalValue === 'approved' ? '#10b981' :
                                 statusModalValue === 'pending' ? '#f59e0b' : '#ef4444',
                    background: statusModalValue === 'approved' ? '#ecfdf5' :
                                statusModalValue === 'pending' ? '#fffbeb' : '#fef2f2',
                    color: statusModalValue === 'approved' ? '#047857' :
                           statusModalValue === 'pending' ? '#b47404' : '#b91c1c'
                  }}
                >
                  <option value="pending" style={{ background: '#ffffff', color: '#b47404' }}>Pending</option>
                  <option value="approved" style={{ background: '#ffffff', color: '#047857' }}>Approved</option>
                  <option value="rejected" style={{ background: '#ffffff', color: '#b91c1c' }}>Rejected</option>
                  <option value="suspended" style={{ background: '#ffffff', color: '#b91c1c' }}>Suspended</option>
                </select>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Choose the updated account and license status for this agent.
                </p>
              </div>

              {statusModalValue === 'rejected' && (
                <div className="form-group">
                  <label className="form-label text-danger" style={{ fontWeight: 600 }}>Rejection Reason *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Specify reason for rejection..."
                    value={statusModalReason}
                    onChange={(e) => setStatusModalReason(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStatusModalAgent(null)}
                disabled={statusModalLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={statusModalLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {statusModalLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Updating Status...
                  </>
                ) : (
                  'Apply Status'
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* 4. DELETE AGENT MODAL (DELETE /admin/agents/:id) */}
      {agentToDelete && createPortal(
        <div className="modal-overlay" onClick={() => !deleteLoading && setAgentToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '460px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
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
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.1rem' }}>Delete Realtor Account</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !deleteLoading && setAgentToDelete(null)}
                disabled={deleteLoading}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this realtor account?
              </p>

              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                {getMediaUrl(agentToDelete.profileImage) ? (
                  <img
                    src={getMediaUrl(agentToDelete.profileImage)}
                    alt={agentToDelete.name}
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
                    {agentToDelete.name && agentToDelete.name !== '—' ? agentToDelete.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {agentToDelete.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>
                    {agentToDelete.agency || agentToDelete.agencyName}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0', fontFamily: 'monospace' }}>
                    License: {agentToDelete.license || agentToDelete.licenseNumber}
                  </p>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                This will remove the realtor from the directory and unbind associated listing authorizations. This action <strong style={{ color: 'var(--danger)' }}>cannot be undone</strong>.
              </p>
            </div>

            <div className="modal-footer" style={{ background: '#faf8f5' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAgentToDelete(null)}
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
                    Deleting Realtor...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete Realtor
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
