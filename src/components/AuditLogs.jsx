import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStateContext } from '../context/StateContext';
import { getCookie } from '../utils/cookies';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User
} from 'lucide-react';

export default function AuditLogs() {
  const { adminUser } = useStateContext();
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // ================= AUDIT LOGS STATE & FILTERS =================
  const [logsList, setLogsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'create' | 'edit' | 'delete'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  });

  // Auth token helper
  const getAuthToken = () => {
    return (
      adminUser?.token ||
      getCookie('token') ||
      getCookie('klever_auth_data')?.data?.accessToken ||
      getCookie('klever_auth_data')?.data?.token ||
      getCookie('klever_auth_data')?.token
    );
  };

  // ================= FETCH AUDIT LOGS API =================
  // URL: /admin/logs
  // Query params: action (create/edit/delete), page, limit
  const fetchAuditLogs = useCallback(async (isManualRefresh = false) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit: limit
      };

      if (actionFilter && actionFilter !== 'all') {
        params.action = actionFilter;
      }

      let res;
      try {
        res = await axios.get(`${baseUrl}/admin/logs`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params
        });
      } catch (getErr) {
        // Fallback in case endpoint uses DELETE method
        if (getErr.response?.status === 405) {
          res = await axios.delete(`${baseUrl}/admin/logs`, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            params
          });
        } else {
          throw getErr;
        }
      }

      const resData = res.data;
      let fetchedLogs = [];

      if (Array.isArray(resData?.data?.logs)) {
        fetchedLogs = resData.data.logs;
      } else if (Array.isArray(resData?.logs)) {
        fetchedLogs = resData.logs;
      } else if (Array.isArray(resData?.data)) {
        fetchedLogs = resData.data;
      } else if (Array.isArray(resData?.auditLogs)) {
        fetchedLogs = resData.auditLogs;
      } else if (Array.isArray(resData)) {
        fetchedLogs = resData;
      }

      setLogsList(fetchedLogs);

      // Handle pagination metadata matching { totalLogs, totalPages, page, limit }
      const pag = resData?.data?.pagination || resData?.pagination || resData?.meta || {};
      const totalCount =
        typeof resData?.data?.totalLogs === 'number'
          ? resData.data.totalLogs
          : typeof pag.total === 'number'
          ? pag.total
          : typeof resData?.total === 'number'
          ? resData.total
          : typeof resData?.count === 'number'
          ? resData.count
          : fetchedLogs.length;

      const totalPages =
        typeof resData?.data?.totalPages === 'number'
          ? resData.data.totalPages
          : typeof pag.pages === 'number'
          ? pag.pages
          : typeof pag.totalPages === 'number'
          ? pag.totalPages
          : Math.ceil(totalCount / limit) || 1;

      setPagination({
        total: totalCount,
        page: resData?.data?.page || pag.page || currentPage,
        limit: resData?.data?.limit || pag.limit || limit,
        pages: totalPages
      });

      if (isManualRefresh) {
        toast.success('Audit logs refreshed successfully');
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setLogsList([]);
      setPagination({
        total: 0,
        page: 1,
        limit: limit,
        pages: 1
      });
      if (isManualRefresh) {
        toast.error(err.response?.data?.message || 'Failed to fetch audit logs from server');
      }
    } finally {
      setLoading(false);
    }
  }, [baseUrl, currentPage, limit, actionFilter]);

  // Initial fetch and on dependency change
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Normalize single log details from API schema
  const getNormalizedLog = (log, index) => {
    const id = log._id || log.id || `log-${index}`;
    
    // Extract operator name/email/role from userId object or user property
    let operator = 'Admin';
    let operatorEmail = '';
    let operatorRole = '';

    if (log.userId && typeof log.userId === 'object') {
      operator = log.userId.name || log.userId.email || 'Admin';
      operatorEmail = log.userId.email || '';
      operatorRole = log.userId.role || '';
    } else if (log.user && typeof log.user === 'object') {
      operator = log.user.name || log.user.email || 'Admin';
      operatorEmail = log.user.email || '';
      operatorRole = log.user.role || '';
    } else if (typeof log.user === 'string' && log.user) {
      operator = log.user;
    } else if (typeof log.userId === 'string' && log.userId) {
      operator = log.userId;
    } else if (log.performedBy?.name || log.performedBy?.email) {
      operator = log.performedBy.name || log.performedBy.email;
      operatorEmail = log.performedBy.email || '';
      operatorRole = log.performedBy.role || '';
    } else if (log.operator) {
      operator = log.operator;
    } else if (log.userName) {
      operator = log.userName;
    }

    // Extract action (create, edit, delete, etc.)
    const action = (log.action || log.type || log.event || 'activity').toLowerCase();

    // Extract module / category
    const category = log.module || log.category || log.target || 'General';

    // Extract endpoint & statusCode
    const endpoint = log.endpoint || log.path || log.url || '';
    const statusCode = log.statusCode || log.status || null;

    // Extract details message
    const details = log.details || log.description || log.message || log.title || '';

    // Extract timestamp
    const rawDate = log.createdAt || log.timestamp || log.date || log.time;
    let formattedDate = 'Recent';
    let relativeTime = '';
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          const diffMs = Date.now() - d.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) relativeTime = 'Just now';
          else if (diffMins < 60) relativeTime = `${diffMins}m ago`;
          else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
          else if (diffDays < 7) relativeTime = `${diffDays}d ago`;
        } else {
          formattedDate = String(rawDate);
        }
      } catch (e) {
        formattedDate = String(rawDate);
      }
    }

    // IP address
    const ip = log.ipAddress || log.ip || log.host || '127.0.0.1';

    return {
      id,
      operator,
      operatorEmail,
      operatorRole,
      action,
      category,
      endpoint,
      statusCode,
      details,
      formattedDate,
      relativeTime,
      ip,
      raw: log
    };
  };

  // Client-side search & category filtering
  const filteredLogs = useMemo(() => {
    return logsList
      .map((log, index) => getNormalizedLog(log, index))
      .filter((log) => {
        // Module / Category filter
        if (categoryFilter !== 'All' && log.category.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }

        // Search text filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchUser = log.operator.toLowerCase().includes(q) || log.operatorEmail.toLowerCase().includes(q);
          const matchDetails = log.details.toLowerCase().includes(q);
          const matchEndpoint = log.endpoint.toLowerCase().includes(q);
          const matchCat = log.category.toLowerCase().includes(q);
          const matchAction = log.action.toLowerCase().includes(q);
          const matchIp = log.ip.toLowerCase().includes(q);
          return matchUser || matchDetails || matchEndpoint || matchCat || matchAction || matchIp;
        }

        return true;
      });
  }, [logsList, categoryFilter, searchTerm]);

  // Action badge styling helper
  const getActionBadge = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('create') || act.includes('add') || act.includes('insert') || act.includes('post')) {
      return {
        label: 'Create',
        bg: 'rgba(16, 185, 129, 0.12)',
        color: '#059669',
        border: 'rgba(16, 185, 129, 0.3)'
      };
    }
    if (act.includes('edit') || act.includes('update') || act.includes('modify') || act.includes('put') || act.includes('patch')) {
      return {
        label: 'Edit',
        bg: 'rgba(37, 99, 235, 0.12)',
        color: '#2563eb',
        border: 'rgba(37, 99, 235, 0.3)'
      };
    }
    if (act.includes('delete') || act.includes('remove') || act.includes('destroy') || act.includes('drop')) {
      return {
        label: 'Delete',
        bg: 'rgba(239, 68, 68, 0.12)',
        color: '#dc2626',
        border: 'rgba(239, 68, 68, 0.3)'
      };
    }
    return {
      label: action.toUpperCase(),
      bg: 'rgba(10, 31, 57, 0.06)',
      color: 'var(--text-secondary)',
      border: 'var(--border-color)'
    };
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>System Monitoring & Diagnostic Logs</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Real-time administrative audit trails, operational history, and user activity records.
          </p>
        </div>

        <div className="flex-align-center" style={{ gap: '0.65rem' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.4rem 0.8rem',
            borderRadius: '8px',
            background: 'rgba(10, 31, 57, 0.05)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}>
            Total Logs: {pagination.total}
          </span>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchAuditLogs(true)}
            disabled={loading}
            style={{ gap: '0.45rem', fontSize: '0.825rem', padding: '0.45rem 0.9rem' }}
            title="Refresh logs from server"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </div>

      {/* Main Content: Controls Bar + Audit Logs Table */}
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Controls Bar: Action Filter Buttons + Search + Category */}
        <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Row 1: Action Filter Buttons (Query Parameter: action = create | edit | delete) */}
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.35rem' }}>
                Filter Action:
              </span>
              {[
                { id: 'all', label: 'All Actions' },
                { id: 'create', label: 'Create', color: '#059669', bg: 'rgba(16, 185, 129, 0.12)' },
                { id: 'edit', label: 'Edit / Update', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)' },
                { id: 'delete', label: 'Delete', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.12)' }
              ].map((act) => {
                const isActive = actionFilter === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      setActionFilter(act.id);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '0.35rem 0.8rem',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 700 : 500,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: isActive ? (act.color || 'var(--primary)') : 'var(--border-color)',
                      background: isActive ? (act.bg || 'var(--primary-glow)') : 'transparent',
                      color: isActive ? (act.color || 'var(--primary)') : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {act.label}
                  </button>
                );
              })}
            </div>

            {/* Rows Per Page Selector */}
            <div className="flex-align-center" style={{ gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Show:</span>
              <select
                className="form-control form-select"
                style={{ width: '80px', padding: '0.3rem 1.5rem 0.3rem 0.6rem', fontSize: '0.78rem' }}
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Row 2: Search Query Input + Category Filter Dropdown */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.4rem', fontSize: '0.825rem' }}
                placeholder="Search logs by operator, endpoint, action, category, IP address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex-align-center" style={{ gap: '0.5rem' }}>
              <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
              <select
                className="form-control form-select"
                style={{ width: '160px', padding: '0.45rem 2rem 0.45rem 0.75rem', fontSize: '0.8rem' }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Modules</option>
                <option value="User">User</option>
                <option value="Notification">Notification</option>
                <option value="Agent">Agent</option>
                <option value="Property">Property</option>
                <option value="Sync">Portal Sync</option>
                <option value="Settings">System Settings</option>
                {/* <option value="AI">AI Parameters</option> */}
              </select>
            </div>
          </div>

        </div>

        {/* Audit Logs Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '170px' }}>Timestamp</th>
                  <th style={{ width: '180px' }}>Operator</th>
                  <th style={{ width: '100px' }}>Action</th>
                  <th style={{ width: '130px' }}>Module / Category</th>
                  <th>Action Details (Endpoint)</th>
                  <th style={{ width: '130px' }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading && logsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Loading system audit logs...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'rgba(10, 31, 57, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)'
                        }}>
                          <History size={22} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>No Audit Logs Found</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '360px' }}>
                          {searchTerm || actionFilter !== 'all' || categoryFilter !== 'All'
                            ? 'No logs match your current search and action filters.'
                            : 'There are currently no recorded audit logs in the system.'}
                        </p>
                        {(searchTerm || actionFilter !== 'all' || categoryFilter !== 'All') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setActionFilter('all');
                              setCategoryFilter('All');
                              setCurrentPage(1);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', marginTop: '0.5rem', padding: '0.35rem 0.75rem' }}
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const actionBadge = getActionBadge(log.action);
                    return (
                      <tr key={log.id}>
                        {/* Timestamp */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {log.formattedDate}
                            </span>
                            {log.relativeTime && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {log.relativeTime}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Operator (Name, Email & Role) */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'var(--primary-glow)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              <User size={14} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {log.operator}
                              </span>
                              {log.operatorEmail && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {log.operatorEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action Badge (Create / Edit / Delete) */}
                        <td>
                          <span style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: actionBadge.bg,
                            color: actionBadge.color,
                            border: `1px solid ${actionBadge.border}`,
                            display: 'inline-block',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}>
                            {actionBadge.label}
                          </span>
                        </td>

                        {/* Module / Category Badge */}
                        <td>
                          <span className={`badge ${
                            log.category === 'Security' || log.category === 'Danger' ? 'badge-danger' :
                            log.category === 'Sync' ? 'badge-info' :
                            log.category === 'Settings' || log.category === 'Notification' ? 'badge-warning' : 'badge-primary'
                          }`} style={{ fontSize: '0.7rem' }}>
                            {log.category}
                          </span>
                        </td>

                        {/* Action Details (Endpoint & Status Code) */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {log.endpoint ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                  background: 'rgba(10, 31, 57, 0.04)',
                                  border: '1px solid var(--border-color)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  wordBreak: 'break-all'
                                }}>
                                  {log.endpoint}
                                </span>
                                {log.statusCode && (
                                  <span style={{
                                    fontSize: '0.675rem',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                    background: log.statusCode >= 200 && log.statusCode < 300
                                      ? 'rgba(16, 185, 129, 0.12)'
                                      : log.statusCode >= 400
                                      ? 'rgba(239, 68, 68, 0.12)'
                                      : 'rgba(245, 158, 11, 0.12)',
                                    color: log.statusCode >= 200 && log.statusCode < 300
                                      ? '#059669'
                                      : log.statusCode >= 400
                                      ? '#dc2626'
                                      : '#b45309',
                                    border: `1px solid ${
                                      log.statusCode >= 200 && log.statusCode < 300
                                        ? 'rgba(16, 185, 129, 0.25)'
                                        : log.statusCode >= 400
                                        ? 'rgba(239, 68, 68, 0.25)'
                                        : 'rgba(245, 158, 11, 0.25)'
                                    }`
                                  }}>
                                    {log.statusCode}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                {log.details || 'Executed API Request'}
                              </span>
                            )}

                            {log.details && log.endpoint && log.details !== log.endpoint && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {log.details}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* IP Address */}
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(10, 31, 57, 0.04)',
                            color: 'var(--text-secondary)'
                          }}>
                            {log.ip}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          <div className="flex-between" style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(10, 31, 57, 0.02)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing{' '}
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {filteredLogs.length > 0 ? (currentPage - 1) * limit + 1 : 0}
              </span>{' '}
              to{' '}
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {Math.min(currentPage * limit, pagination.total || filteredLogs.length)}
              </span>{' '}
              of{' '}
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {pagination.total || filteredLogs.length}
              </span>{' '}
              total logs
            </div>

            {/* Page Buttons */}
            <div className="flex-align-center" style={{ gap: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || loading}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                <ChevronLeft size={15} />
                <span>Prev</span>
              </button>

              <div style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                background: 'var(--primary-glow)',
                color: 'var(--primary)',
                border: '1px solid var(--border-color)'
              }}>
                Page {currentPage} of {pagination.pages || 1}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages || 1, prev + 1))}
                disabled={currentPage >= (pagination.pages || 1) || loading}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
