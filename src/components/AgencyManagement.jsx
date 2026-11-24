import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import { getCookie } from '../utils/cookies';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Upload,
  Globe,
  Award,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Layers,
  X,
  Plus,
  RotateCcw,
  Download,
  Check,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  AlertTriangle,
  Zap,
  MessageCircle,
  HelpCircle,
  Flame,
  Users,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Rss,
  Clock,
  Copy,
  Hash,
  Home,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AgencyManagement() {
  const {
    adminUser,
    addAuditLog: onAddAuditLog
  } = useStateContext();

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';

  // API State
  const [agenciesList, setAgenciesList] = useState([]);
  const [tiersList, setTiersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores agency ID during action

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive'
  const [verifiedFilter, setVerifiedFilter] = useState('All'); // 'All' | 'Verified' | 'Unverified'
  const [tierFilter, setTierFilter] = useState('All'); // 'All' | Tier ID / Level
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal / Drawer States
  const [selectedAgency, setSelectedAgency] = useState(null); // For detail drawer
  const [agencyDetails, setAgencyDetails] = useState(null); // Detailed data from GET /admin/agency/:id
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null); // For edit modal
  const [agencyToDelete, setAgencyToDelete] = useState(null); // For delete confirmation modal
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [syncingAgencyId, setSyncingAgencyId] = useState(null); // stores agency ID during sync-feed
  const [syncAllLoading, setSyncAllLoading] = useState(false); // stores global batch sync state

  // Pagination & Server Stats State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  });
  const [statsData, setStatsData] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    sponsors: 0
  });

  // Add Agency Form State & Modal Control
  const initialAddForm = {
    name: '',
    description: '',
    logoFile: null,
    logoPreview: '',
    website: '',
    corporateEmail: '',
    corporateCallCenterPhone: '',
    corporateWhatsapp: '',
    country: 'DO',
    region: '',
    town: '',
    brandColorHex: '#002B49',
    tier: '',
    agentSeatsLimit: 10,
    xmlFeedUrl: '',
    autoSyncEnabled: true,
    syncSchedule: 'EVERY_6_HOURS'
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState(initialAddForm);

  // Edit Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formCorporateEmail, setFormCorporateEmail] = useState('');
  const [formCorporateCallCenterPhone, setFormCorporateCallCenterPhone] = useState('');
  const [formCorporateWhatsapp, setFormCorporateWhatsapp] = useState('');
  const [formCountry, setFormCountry] = useState('DO');
  const [formRegion, setFormRegion] = useState('');
  const [formTown, setFormTown] = useState('');
  const [formBrandColorHex, setFormBrandColorHex] = useState('#002B49');
  const [formIsFoundingSponsor, setFormIsFoundingSponsor] = useState(false);
  const [formXmlFeedUrl, setFormXmlFeedUrl] = useState('');
  const [formAutoSyncEnabled, setFormAutoSyncEnabled] = useState(true);
  const [formSyncSchedule, setFormSyncSchedule] = useState('EVERY_6_HOURS');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsVerified, setFormIsVerified] = useState(false);
  const [formTierId, setFormTierId] = useState('');
  const [formAgentSeatsLimit, setFormAgentSeatsLimit] = useState(10);
  const [formLogoFile, setFormLogoFile] = useState(null);
  const [formLogoPreview, setFormLogoPreview] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');

  // Search debounce ref
  const searchTimeoutRef = useRef(null);

  // Helper to format logo URL
  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    if (typeof logoPath !== 'string') return null;
    let clean = logoPath.trim();
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
  };

  // Helper to get initials if logo fails to load
  const getInitials = (name) => {
    if (!name) return 'AG';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Dedicated Agency Logo Component with resilient multi-level fallback
  function AgencyLogo({ src, name, size = 48, style = {} }) {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      setHasError(false);
      setIsLoaded(false);
    }, [src]);

    const cleanName = (name || '').trim();
    const isRemax = /re\/?max/i.test(cleanName);
    const isCentury21 = /century\s*21/i.test(cleanName);
    const formattedUrl = getLogoUrl(src);

    // Fallback UI if no url or image load failed
    if (!formattedUrl || hasError) {
      if (isRemax) {
        return (
          <div
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: Math.max(8, Math.round(size * 0.2)),
              background: '#ffffff',
              border: '1px solid rgba(10, 31, 57, 0.12)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '4px',
              flexShrink: 0,
              userSelect: 'none',
              ...style
            }}
            title={name || 'RE/MAX'}
          >
            <svg viewBox="0 0 140 44" width="94%" height="94%" style={{ display: 'block' }}>
              <text
                x="50%"
                y="31"
                fontFamily="'Plus Jakarta Sans', Arial, Helvetica, sans-serif"
                fontWeight="900"
                fontSize="28"
                textAnchor="middle"
                letterSpacing="-0.5"
              >
                <tspan fill="#003da5">RE</tspan>
                <tspan fill="#e11b22">/</tspan>
                <tspan fill="#e11b22">MAX</tspan>
              </text>
            </svg>
          </div>
        );
      }

      if (isCentury21) {
        return (
          <div
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: Math.max(8, Math.round(size * 0.2)),
              background: '#212121',
              border: '1px solid rgba(190, 160, 95, 0.4)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#be9b5e',
              fontWeight: 800,
              fontSize: `${Math.round(size * 0.32)}px`,
              flexShrink: 0,
              userSelect: 'none',
              ...style
            }}
            title={name || 'Century 21'}
          >
            C21
          </div>
        );
      }

      // Default branded monogram emblem
      return (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: Math.max(8, Math.round(size * 0.2)),
            background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.18) 0%, rgba(10, 31, 57, 0.08) 100%)',
            border: '1px solid rgba(250, 179, 25, 0.35)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: `${Math.max(12, Math.round(size * 0.36))}px`,
            color: '#b47404',
            letterSpacing: '0.02em',
            flexShrink: 0,
            userSelect: 'none',
            ...style
          }}
          title={name}
        >
          {getInitials(name)}
        </div>
      );
    }

    // Attempt to load provided image URL
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: Math.max(8, Math.round(size * 0.2)),
          background: '#ffffff',
          border: '1px solid rgba(10, 31, 57, 0.1)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '4px',
          flexShrink: 0,
          position: 'relative',
          ...style
        }}
      >
        <img
          src={formattedUrl}
          alt={name || 'Agency Logo'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease'
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
        {!isLoaded && !hasError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(250, 179, 25, 0.08)',
              fontSize: `${Math.max(11, Math.round(size * 0.32))}px`,
              fontWeight: 800,
              color: 'var(--primary)'
            }}
          >
            {getInitials(name)}
          </div>
        )}
      </div>
    );
  }

  // Helper to safely retrieve token across session stores
  const getAuthToken = useCallback(() => {
    if (adminUser?.token) return adminUser.token;
    try {
      const c = getCookie('klever_auth_data');
      if (c) {
        const t = c?.data?.accessToken || c?.data?.token || c?.accessToken || c?.token;
        if (t) return t;
      }
    } catch {}
    try {
      const directToken = getCookie('token');
      if (directToken) return directToken;
    } catch {}
    try {
      const ls = localStorage.getItem('klever_admin_session');
      if (ls) {
        const parsed = JSON.parse(ls);
        const t = parsed?.data?.accessToken || parsed?.token || parsed?.accessToken;
        if (t) return t;
      }
    } catch {}
    try {
      const rawLsToken = localStorage.getItem('token');
      if (rawLsToken) return rawLsToken;
    } catch {}
    return '';
  }, [adminUser?.token]);

  // 1. FETCH ALL TIERS: GET /admin/tiers/get-all (Auth: yes)
  const fetchTiers = useCallback(async () => {
    if (!adminUser?.token) return;
    try {
      setTiersLoading(true);
      const headers = { Authorization: `Bearer ${adminUser.token}` };
      const candidateEndpoints = [
        `${baseUrl}/admin/tiers/get-all`,
        `${baseUrl}/admin/tier/get-all`,
        `${baseUrl}/admin/tiers`,
        `${baseUrl}/admin/getAllTiers`,
        `${baseUrl}/admin/tier`
      ];

      let fetchedTiers = null;
      for (const endpoint of candidateEndpoints) {
        try {
          const res = await axios.get(endpoint, { headers });
          const raw =
            (Array.isArray(res.data?.data) ? res.data.data : null) ||
            res.data?.data?.tiers ||
            res.data?.tiers ||
            (Array.isArray(res.data) ? res.data : null);

          if (Array.isArray(raw) && raw.length > 0) {
            fetchedTiers = raw;
            break;
          }
        } catch (e) {
          // try next endpoint quietly
        }
      }

      if (fetchedTiers) {
        setTiersList(fetchedTiers);
      }
    } catch (err) {
      console.warn('Failed to fetch tiers list:', err);
    } finally {
      setTiersLoading(false);
    }
  }, [adminUser?.token, baseUrl]);

  // 2. FETCH AGENCIES: GET /admin/agency?page=X&limit=Y
  const fetchAgencies = useCallback(async (targetPage = currentPage, targetLimit = limit, search = searchTerm, showToast = false) => {
    if (!adminUser?.token) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${adminUser.token}` };
      const params = {
        page: targetPage,
        limit: targetLimit
      };
      if (search && search.trim()) {
        params.search = search.trim();
      }

      let res = null;
      let rawAgencies = null;
      let statsObj = null;
      let paginationObj = null;

      try {
        const response = await axios.get(`${baseUrl}/admin/agency`, { headers, params });
        res = response;
        const respData = response.data?.data || response.data || {};
        rawAgencies = respData.agencies || (Array.isArray(respData) ? respData : null);
        statsObj = respData.stats || null;
        paginationObj = respData.pagination || null;
      } catch (err) {
        if (err.response?.status === 404) {
          // Candidate fallbacks
          const candidateEndpoints = [
            `${baseUrl}/admin/agencies`,
            `${baseUrl}/admin/agency/all`,
            `${baseUrl}/agency`
          ];
          for (const endpoint of candidateEndpoints) {
            try {
              const response = await axios.get(endpoint, { headers, params });
              const respData = response.data?.data || response.data || {};
              const candidateList = respData.agencies || (Array.isArray(respData) ? respData : null);
              if (Array.isArray(candidateList)) {
                res = response;
                rawAgencies = candidateList;
                statsObj = respData.stats || null;
                paginationObj = respData.pagination || null;
                break;
              }
            } catch (e) {}
          }
        } else {
          throw err;
        }
      }

      const list = Array.isArray(rawAgencies) ? rawAgencies : [];
      setAgenciesList(list);

      if (statsObj) {
        setStatsData(statsObj);
      }

      const finalPagination = paginationObj || {
        total: list.length,
        page: targetPage,
        limit: targetLimit,
        pages: Math.ceil(list.length / targetLimit) || 1
      };
      setPagination(finalPagination);
      setCurrentPage(finalPagination.page || targetPage);

      // Extract unique tiers from agencies as fallback to enrich tiersList
      const extractedTiersMap = new Map();
      list.forEach(agency => {
        if (agency.tier && typeof agency.tier === 'object' && agency.tier._id) {
          extractedTiersMap.set(agency.tier._id, agency.tier);
        }
      });

      if (extractedTiersMap.size > 0) {
        setTiersList(prev => {
          const existingIds = new Set(prev.map(t => t._id));
          const additions = Array.from(extractedTiersMap.values()).filter(t => !existingIds.has(t._id));
          return [...prev, ...additions];
        });
      }

      if (showToast) {
        toast.success(res?.data?.message || 'Agencies retrieved successfully');
      }
    } catch (err) {
      console.error('Failed to fetch agencies:', err);
      toast.error(err.response?.data?.message || 'Failed to retrieve agencies');
      setAgenciesList([]);
      setPagination({ total: 0, page: 1, limit: targetLimit, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [adminUser?.token, baseUrl, currentPage, limit, searchTerm]);

  // Initial Data Load & Page Trigger
  useEffect(() => {
    fetchAgencies(currentPage, limit, searchTerm);
    fetchTiers();
  }, [adminUser?.token, currentPage, limit]);

  // 3. FETCH SINGLE AGENCY BY ID: GET /admin/agency/:id & GET /admin/agency/:id/sync-status
  const handleInspectAgency = async (agency) => {
    setSelectedAgency(agency);
    setAgencyDetails(null);
    setDrawerLoading(true);

    const agencyId = agency._id || agency.id;
    if (!agencyId) {
      setDrawerLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      let res = null;
      try {
        res = await axios.get(`${baseUrl}/admin/agency/${agencyId}`, { headers });
      } catch (err) {
        if (err.response?.status === 404) {
          res = await axios.get(`${baseUrl}/admin/agencies/${agencyId}`, { headers });
        } else {
          throw err;
        }
      }

      const detailed = res.data?.data?.agency || res.data?.data || res.data?.agency || res.data;
      if (detailed && typeof detailed === 'object') {
        // Also fetch live sync status from GET /api/admin/agency/{id}/sync-status
        try {
          const syncRes = await axios.get(`${baseUrl}/admin/agency/${agencyId}/sync-status`, { headers });
          const syncData = syncRes.data?.data || syncRes.data;
          if (syncData) {
            detailed.syncStatus = syncData.syncStatus || detailed.syncStatus;
            detailed.lastSyncedAt = syncData.lastSyncedAt || detailed.lastSyncedAt;
            detailed.syncStats = syncData.syncStats || detailed.syncStats;
            detailed.activePropertiesCount = syncData.activePropertiesCount ?? detailed.activePropertiesCount;
          }
        } catch (syncErr) {
          // ignore quiet fallback
        }

        setAgencyDetails(detailed);
        // Sync detailed fields with agenciesList item
        setAgenciesList(prev => prev.map(a => ((a._id || a.id) === agencyId ? { ...a, ...detailed } : a)));
      }
    } catch (err) {
      console.warn('Failed to load agency by ID:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // 4. TOGGLE AGENCY STATUS: PUT /admin/agency/:id/toggle-status
  const handleToggleStatus = async (agency, e) => {
    if (e) e.stopPropagation();
    const agencyId = agency._id || agency.id;
    if (!agencyId) return;

    try {
      setActionLoading(agencyId);
      const nextActive = !agency.isActive;
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      // Official Swagger endpoint: PUT /api/admin/agency/{id}/toggle-status with { "isActive": boolean }
      let res = null;
      try {
        res = await axios.put(
          `${baseUrl}/admin/agency/${agencyId}/toggle-status`,
          { isActive: nextActive },
          { headers }
        );
      } catch (err) {
        // Fallback candidate routes
        const candidateEndpoints = [
          `${baseUrl}/admin/toggleAgencyStatus/${agencyId}`,
          `${baseUrl}/admin/agency/toggle-status/${agencyId}`,
          `${baseUrl}/admin/toggle-agency-status/${agencyId}`
        ];
        let ok = false;
        for (const endpoint of candidateEndpoints) {
          try {
            res = await axios.put(endpoint, { isActive: nextActive }, { headers });
            ok = true;
            break;
          } catch (e) {}
        }
        if (!ok) throw err;
      }

      toast.success(res?.data?.message || `Agency ${nextActive ? 'activated' : 'deactivated'} successfully`);

      // Update state locally
      setAgenciesList(prev => prev.map(a => {
        if ((a._id || a.id) === agencyId) {
          return { ...a, isActive: nextActive };
        }
        return a;
      }));

      if (selectedAgency && (selectedAgency._id || selectedAgency.id) === agencyId) {
        setSelectedAgency(prev => ({ ...prev, isActive: nextActive }));
      }
      if (agencyDetails && (agencyDetails._id || agencyDetails.id) === agencyId) {
        setAgencyDetails(prev => ({ ...prev, isActive: nextActive }));
      }

      onAddAuditLog('Agency', `Toggled operational status for ${agency.name} to ${nextActive ? 'Active' : 'Inactive'}`);
    } catch (err) {
      console.error('Failed to toggle agency status:', err);
      toast.error(err.response?.data?.message || 'Failed to toggle agency status');
    } finally {
      setActionLoading(null);
    }
  };

  // 5. TRIGGER SINGLE AGENCY XML FEED SYNC: POST /admin/agency/:id/sync-feed
  const handleSyncSingleFeed = async (agencyId, agencyName = 'Agency', e) => {
    if (e) e.stopPropagation();
    if (!agencyId) return;

    try {
      setSyncingAgencyId(agencyId);
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await axios.post(
        `${baseUrl}/admin/agency/${agencyId}/sync-feed`,
        {},
        { headers }
      );

      toast.success(res.data?.message || `Feed sync completed for ${agencyName}`, { duration: 4000 });

      // Refresh live sync status from GET /api/admin/agency/{id}/sync-status
      try {
        const syncRes = await axios.get(`${baseUrl}/admin/agency/${agencyId}/sync-status`, { headers });
        const syncData = syncRes.data?.data || syncRes.data;
        if (syncData) {
          setAgencyDetails(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              syncStatus: syncData.syncStatus || 'success',
              lastSyncedAt: syncData.lastSyncedAt || new Date().toISOString(),
              syncStats: syncData.syncStats || prev.syncStats,
              activePropertiesCount: syncData.activePropertiesCount ?? prev.activePropertiesCount
            };
          });
        }
      } catch (syncErr) {}

      fetchAgencies(currentPage, limit, searchTerm);

      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Agency', `Triggered XML feed synchronization for agency: ${agencyName}`);
      }
    } catch (err) {
      console.error('Failed to sync feed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to synchronize feed';
      toast.error(errMsg);
    } finally {
      setSyncingAgencyId(null);
    }
  };

  // 6. TRIGGER BACKGROUND BATCH FEED SYNC: POST /admin/agency/sync-all-feeds
  const handleSyncAllFeeds = async () => {
    try {
      setSyncAllLoading(true);
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await axios.post(
        `${baseUrl}/admin/agency/sync-all-feeds`,
        {},
        { headers }
      );

      const msg = res.data?.message || 'Background feed sync triggered for all active agencies';
      toast.success(msg, { duration: 5000 });

      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Agency', 'Triggered background batch XML feed sync for all active agencies');
      }

      fetchAgencies(currentPage, limit, searchTerm);
    } catch (err) {
      console.error('Failed to sync all feeds:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to trigger batch feed sync';
      toast.error(errMsg);
    } finally {
      setSyncAllLoading(false);
    }
  };

  // 4. OPEN ADD AGENCY MODAL
  const handleOpenAdd = () => {
    const defaultTier = tiersList.length > 0 ? (tiersList[0]._id || '') : '';
    setAddForm({
      ...initialAddForm,
      tier: defaultTier
    });
    setIsAddModalOpen(true);
  };

  const handleAddLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAddForm(prev => ({
        ...prev,
        logoFile: file,
        logoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleRemoveAddLogo = () => {
    setAddForm(prev => ({
      ...prev,
      logoFile: null,
      logoPreview: ''
    }));
  };

  // 5. SUBMIT ADD AGENCY: POST /admin/agency (multipart/form-data)
  const handleAddAgencySubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast.error('Agency commercial name is required');
      return;
    }

    try {
      setAddLoading(true);
      const token = getAuthToken();
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append('name', addForm.name.trim());
      if (addForm.description.trim()) {
        formData.append('description', addForm.description.trim());
      }
      if (addForm.logoFile) {
        formData.append('logo', addForm.logoFile);
      }
      if (addForm.website.trim()) {
        formData.append('website', addForm.website.trim());
      }
      if (addForm.corporateEmail.trim()) {
        formData.append('corporateEmail', addForm.corporateEmail.trim());
      }
      if (addForm.corporateCallCenterPhone.trim()) {
        formData.append('corporateCallCenterPhone', addForm.corporateCallCenterPhone.trim());
      }
      if (addForm.corporateWhatsapp.trim()) {
        formData.append('corporateWhatsapp', addForm.corporateWhatsapp.trim());
      }
      if (addForm.country.trim()) {
        formData.append('country', addForm.country.trim());
      }
      if (addForm.region.trim()) {
        formData.append('region', addForm.region.trim());
      }
      if (addForm.town.trim()) {
        formData.append('town', addForm.town.trim());
      }
      if (addForm.brandColorHex.trim()) {
        formData.append('brandColorHex', addForm.brandColorHex.trim());
      }
      if (addForm.tier) {
        formData.append('tier', addForm.tier);
      }
      const seatsLimitNum = parseInt(addForm.agentSeatsLimit, 10);
      formData.append('agentSeatsLimit', !isNaN(seatsLimitNum) && seatsLimitNum >= 0 ? seatsLimitNum : 10);
      if (addForm.xmlFeedUrl.trim()) {
        formData.append('xmlFeedUrl', addForm.xmlFeedUrl.trim());
      }
      formData.append('autoSyncEnabled', addForm.autoSyncEnabled ? 'true' : 'false');
      if (addForm.syncSchedule) {
        formData.append('syncSchedule', addForm.syncSchedule);
      }

      const res = await axios.post(`${baseUrl}/admin/agency`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(res.data?.message || 'Agency added successfully!');
      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Agency', `Added new agency: ${addForm.name.trim()}`);
      }

      setIsAddModalOpen(false);
      setAddForm(initialAddForm);
      fetchAgencies(1, limit, '', true);
    } catch (err) {
      console.error('Failed to create agency:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to add agency';
      toast.error(errMsg);
    } finally {
      setAddLoading(false);
    }
  };

  // 6. OPEN EDIT MODAL
  const handleOpenEdit = (agency, e) => {
    if (e) e.stopPropagation();
    setEditingAgency(agency);
    setFormName(agency.name || '');
    setFormDescription(agency.description || '');
    setFormWebsite(agency.website || '');
    setFormCorporateEmail(agency.corporateEmail || '');
    setFormCorporateCallCenterPhone(agency.corporateCallCenterPhone || '');
    setFormCorporateWhatsapp(agency.corporateWhatsapp || '');
    setFormCountry(agency.country || 'DO');
    setFormRegion(agency.region || '');
    setFormTown(agency.town || '');
    setFormBrandColorHex(agency.brandColorHex || '#002B49');
    setFormIsFoundingSponsor(Boolean(agency.isFoundingSponsor));
    setFormXmlFeedUrl(agency.xmlFeedUrl || '');
    setFormAutoSyncEnabled(agency.autoSyncEnabled !== false);
    setFormSyncSchedule(agency.syncSchedule || 'EVERY_6_HOURS');
    setFormIsActive(agency.isActive !== false);
    setFormIsVerified(agency.isVerified === true);
    setFormAgentSeatsLimit(agency.agentSeatsLimit !== undefined && agency.agentSeatsLimit !== null ? agency.agentSeatsLimit : 10);
    
    // Set Tier ID
    const currentTierId = agency.tier?._id || agency.tier || '';
    setFormTierId(currentTierId);

    setFormLogoFile(null);
    setFormLogoPreview(getLogoUrl(agency.logo) || '');
    setFormLogoUrl(typeof agency.logo === 'string' ? agency.logo : '');
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormLogoFile(file);
      setFormLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setFormLogoFile(null);
    setFormLogoPreview('');
    setFormLogoUrl('');
  };

  // 7. SUBMIT EDIT AGENCY: PUT /admin/agency/:id
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAgency) return;
    const agencyId = editingAgency._id || editingAgency.id;
    if (!agencyId) return;

    if (!formName.trim()) {
      toast.error('Please provide an agency commercial name');
      return;
    }

    try {
      setEditLoading(true);
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const seatsLimitNum = parseInt(formAgentSeatsLimit, 10) >= 0 ? parseInt(formAgentSeatsLimit, 10) : 10;

      let res = null;

      if (formLogoFile) {
        // Multipart payload with logo file
        const formData = new FormData();
        formData.append('name', formName.trim());
        formData.append('description', formDescription.trim());
        formData.append('website', formWebsite.trim());
        formData.append('corporateEmail', formCorporateEmail.trim());
        formData.append('corporateCallCenterPhone', formCorporateCallCenterPhone.trim());
        formData.append('corporateWhatsapp', formCorporateWhatsapp.trim());
        formData.append('country', formCountry.trim());
        formData.append('region', formRegion.trim());
        formData.append('town', formTown.trim());
        formData.append('brandColorHex', formBrandColorHex.trim());
        if (formTierId) formData.append('tier', formTierId);
        formData.append('isFoundingSponsor', formIsFoundingSponsor ? 'true' : 'false');
        formData.append('agentSeatsLimit', seatsLimitNum);
        formData.append('xmlFeedUrl', formXmlFeedUrl.trim());
        formData.append('autoSyncEnabled', formAutoSyncEnabled ? 'true' : 'false');
        formData.append('syncSchedule', formSyncSchedule);
        formData.append('isActive', formIsActive ? 'true' : 'false');
        formData.append('isVerified', formIsVerified ? 'true' : 'false');
        formData.append('logo', formLogoFile);

        try {
          res = await axios.put(`${baseUrl}/admin/agency/${agencyId}`, formData, {
            headers: {
              ...headers,
              'Content-Type': 'multipart/form-data'
            }
          });
        } catch (multiErr) {
          res = await axios.put(`${baseUrl}/admin/editAgency/${agencyId}`, formData, {
            headers: {
              ...headers,
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      } else {
        // JSON payload matching Swagger schema
        const jsonPayload = {
          name: formName.trim(),
          description: formDescription.trim(),
          website: formWebsite.trim(),
          corporateEmail: formCorporateEmail.trim(),
          corporateCallCenterPhone: formCorporateCallCenterPhone.trim(),
          corporateWhatsapp: formCorporateWhatsapp.trim(),
          country: formCountry.trim(),
          region: formRegion.trim(),
          town: formTown.trim(),
          brandColorHex: formBrandColorHex.trim(),
          tier: formTierId || undefined,
          isFoundingSponsor: Boolean(formIsFoundingSponsor),
          agentSeatsLimit: seatsLimitNum,
          xmlFeedUrl: formXmlFeedUrl.trim(),
          autoSyncEnabled: Boolean(formAutoSyncEnabled),
          syncSchedule: formSyncSchedule,
          isActive: Boolean(formIsActive),
          isVerified: Boolean(formIsVerified),
          ...(formLogoUrl ? { logo: formLogoUrl } : {})
        };

        try {
          res = await axios.put(`${baseUrl}/admin/agency/${agencyId}`, jsonPayload, {
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            }
          });
        } catch (jsonErr) {
          res = await axios.put(`${baseUrl}/admin/editAgency/${agencyId}`, jsonPayload, {
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      toast.success(res?.data?.message || 'Agency updated successfully');

      // Update state locally
      const selectedTierObj = tiersList.find(t => t._id === formTierId) || editingAgency.tier;
      const updatedAgencyData = res?.data?.data?.agency || res?.data?.agency || res?.data?.data;

      setAgenciesList(prev => prev.map(a => {
        if ((a._id || a.id) === agencyId) {
          return {
            ...a,
            name: formName.trim(),
            description: formDescription.trim(),
            website: formWebsite.trim(),
            corporateEmail: formCorporateEmail.trim(),
            corporateCallCenterPhone: formCorporateCallCenterPhone.trim(),
            corporateWhatsapp: formCorporateWhatsapp.trim(),
            country: formCountry.trim(),
            region: formRegion.trim(),
            town: formTown.trim(),
            brandColorHex: formBrandColorHex.trim(),
            isFoundingSponsor: Boolean(formIsFoundingSponsor),
            isVerified: Boolean(formIsVerified),
            isActive: Boolean(formIsActive),
            agentSeatsLimit: seatsLimitNum,
            xmlFeedUrl: formXmlFeedUrl.trim(),
            autoSyncEnabled: Boolean(formAutoSyncEnabled),
            syncSchedule: formSyncSchedule,
            tier: selectedTierObj || a.tier,
            logo: updatedAgencyData?.logo || formLogoPreview || a.logo,
            updatedAt: new Date().toISOString()
          };
        }
        return a;
      }));

      if (selectedAgency && (selectedAgency._id || selectedAgency.id) === agencyId) {
        setSelectedAgency(prev => ({
          ...prev,
          name: formName.trim(),
          description: formDescription.trim(),
          website: formWebsite.trim(),
          corporateEmail: formCorporateEmail.trim(),
          corporateCallCenterPhone: formCorporateCallCenterPhone.trim(),
          corporateWhatsapp: formCorporateWhatsapp.trim(),
          country: formCountry.trim(),
          region: formRegion.trim(),
          town: formTown.trim(),
          brandColorHex: formBrandColorHex.trim(),
          isFoundingSponsor: Boolean(formIsFoundingSponsor),
          isVerified: Boolean(formIsVerified),
          isActive: Boolean(formIsActive),
          agentSeatsLimit: seatsLimitNum,
          xmlFeedUrl: formXmlFeedUrl.trim(),
          autoSyncEnabled: Boolean(formAutoSyncEnabled),
          syncSchedule: formSyncSchedule,
          tier: selectedTierObj || prev.tier,
          logo: updatedAgencyData?.logo || formLogoPreview || prev.logo,
          updatedAt: new Date().toISOString()
        }));
      }

      onAddAuditLog('Agency', `Updated agency profile details for ${formName}`);
      setEditingAgency(null);
      fetchAgencies(currentPage, limit, searchTerm);
    } catch (err) {
      console.error('Failed to edit agency:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update agency');
    } finally {
      setEditLoading(false);
    }
  };

  // 8. SOFT DELETE AGENCY: PUT /admin/agency/:id/soft-delete
  const handleDeleteSubmit = async () => {
    if (!agencyToDelete) return;
    const agencyId = agencyToDelete._id || agencyToDelete.id;
    if (!agencyId) return;

    try {
      setDeleteLoading(true);
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      // Official Swagger endpoint: PUT /api/admin/agency/{id}/soft-delete with body { "action": "soft-delete" }
      let res = null;
      try {
        res = await axios.put(
          `${baseUrl}/admin/agency/${agencyId}/soft-delete`,
          { action: 'soft-delete' },
          { headers }
        );
      } catch (err) {
        // Fallbacks if server routes vary
        const candidateFallbacks = [
          { method: 'patch', url: `${baseUrl}/admin/agency/${agencyId}/soft-delete`, data: { action: 'soft-delete' } },
          { method: 'delete', url: `${baseUrl}/admin/agency/${agencyId}` },
          { method: 'delete', url: `${baseUrl}/admin/deleteAgency/${agencyId}` }
        ];
        let ok = false;
        for (const fb of candidateFallbacks) {
          try {
            if (fb.method === 'delete') {
              res = await axios.delete(fb.url, { headers });
            } else {
              res = await axios[fb.method](fb.url, fb.data, { headers });
            }
            ok = true;
            break;
          } catch (e) {}
        }
        if (!ok) throw err;
      }

      toast.success(res?.data?.message || 'Agency soft-deleted successfully');

      // Update state locally
      setAgenciesList(prev => prev.filter(a => (a._id || a.id) !== agencyId));

      if (selectedAgency && (selectedAgency._id || selectedAgency.id) === agencyId) {
        setSelectedAgency(null);
        setAgencyDetails(null);
      }

      onAddAuditLog('Agency', `Soft-deleted agency: ${agencyToDelete.name}`);
      setAgencyToDelete(null);
      fetchAgencies(currentPage, limit, searchTerm);
    } catch (err) {
      console.error('Failed to soft delete agency:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to soft delete agency');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 9. RESTORE AGENCY: PUT /admin/agency/:id/soft-delete
  const handleRestoreAgency = async (agency) => {
    const agencyId = agency._id || agency.id;
    if (!agencyId) return;

    try {
      setActionLoading(agencyId);
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await axios.put(
        `${baseUrl}/admin/agency/${agencyId}/soft-delete`,
        { action: 'restore' },
        { headers }
      );

      toast.success(res?.data?.message || 'Agency restored successfully');
      fetchAgencies(currentPage, limit, searchTerm);
      onAddAuditLog('Agency', `Restored agency: ${agency.name}`);
    } catch (err) {
      console.error('Failed to restore agency:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to restore agency');
    } finally {
      setActionLoading(null);
    }
  };

  // Export Agencies to CSV
  const handleExportCSV = () => {
    if (agenciesList.length === 0) {
      toast.error('No agencies available to export');
      return;
    }

    const headers = ['Agency Name', 'Website', 'Tier', 'Tier Level', 'Verified', 'Active Status', 'Created At'];
    const rows = agenciesList.map(a => [
      `"${(a.name || '').replace(/"/g, '""')}"`,
      `"${(a.website || '').replace(/"/g, '""')}"`,
      `"${(a.tier?.name || 'Standard').replace(/"/g, '""')}"`,
      a.tier?.tierLevel || 1,
      a.isVerified ? 'Yes' : 'No',
      a.isActive ? 'Active' : 'Inactive',
      a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `agencies_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Agencies CSV exported successfully');
  };

  // Filtered & Searched agencies
  const filteredAgencies = useMemo(() => {
    return agenciesList.filter(item => {
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const web = (item.website || '').toLowerCase();
      const tierName = (item.tier?.name || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || desc.includes(query) || web.includes(query) || tierName.includes(query);

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && item.isActive === true) ||
        (statusFilter === 'Inactive' && item.isActive === false);

      const matchesVerified =
        verifiedFilter === 'All' ||
        (verifiedFilter === 'Verified' && item.isVerified === true) ||
        (verifiedFilter === 'Unverified' && item.isVerified !== true);

      const matchesTier =
        tierFilter === 'All' ||
        (item.tier?._id === tierFilter) ||
        (String(item.tier?.tierLevel) === String(tierFilter));

      return matchesSearch && matchesStatus && matchesVerified && matchesTier;
    });
  }, [agenciesList, searchTerm, statusFilter, verifiedFilter, tierFilter]);

  // Dynamic KPI Metrics
  const metrics = useMemo(() => {
    const total = pagination.total !== undefined && pagination.total !== 0 ? pagination.total : (statsData.total || agenciesList.length);
    const active = statsData.active !== undefined && statsData.active !== 0 ? statsData.active : agenciesList.filter(a => a.isActive === true).length;
    const verified = agenciesList.filter(a => a.isVerified === true).length;
    const sponsors = statsData.sponsors !== undefined && statsData.sponsors !== 0 ? statsData.sponsors : agenciesList.filter(a => a.isFoundingSponsor === true || (a.tier?.tierLevel && a.tier.tierLevel > 1)).length;
    const verifiedRate = total > 0 ? Math.round((verified / total) * 100) : 0;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return { total, verified, active, sponsors, verifiedRate, activeRate };
  }, [agenciesList, pagination.total, statsData]);

  // Reset to page 1 whenever client filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, verifiedFilter, tierFilter]);

  // Handle Search Input with Debounce to fetchAgencies
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchAgencies(1, limit, val);
    }, 400);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setCurrentPage(1);
    fetchAgencies(1, limit, '');
  };

  // Pagination Calculations
  const hasClientFilters = statusFilter !== 'All' || verifiedFilter !== 'All' || tierFilter !== 'All';
  const totalAgencies = hasClientFilters ? filteredAgencies.length : (pagination.total || filteredAgencies.length);
  const totalPages = hasClientFilters
    ? (Math.ceil(totalAgencies / limit) || 1)
    : (pagination.pages || Math.ceil(totalAgencies / limit) || 1);

  // Auto-correct page if items count shrinks
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const fromIndex = totalAgencies === 0 ? 0 : (currentPage - 1) * limit + 1;
  const toIndex = Math.min(currentPage * limit, totalAgencies);

  const paginatedAgencies = useMemo(() => {
    // If the server returned more than limit, slice client-side; otherwise, server already paginated
    if (filteredAgencies.length > limit) {
      const start = (currentPage - 1) * limit;
      return filteredAgencies.slice(start, start + limit);
    }
    return filteredAgencies;
  }, [filteredAgencies, currentPage, limit]);

  // Handle Page Navigation
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchAgencies(newPage, limit, searchTerm);
  };

  // Handle Limit Change
  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimit(newLimit);
    setCurrentPage(1);
    fetchAgencies(1, newLimit, searchTerm);
  };

  // Generate visible page numbers for pagination toolbar
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Render Reusable Pagination Toolbar matching UserManagement / RealtorManagement
  const renderPaginationToolbar = () => (
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
          Showing <strong style={{ color: 'var(--text-primary)' }}>{fromIndex}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{toIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalAgencies}</strong> agencies
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        {/* First Page */}
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => handlePageChange(1)}
          disabled={currentPage <= 1 || loading || totalAgencies === 0}
          title="First Page"
          style={{ width: '32px', height: '32px', padding: 0 }}
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page */}
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading || totalAgencies === 0}
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
            disabled={loading || totalAgencies === 0}
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
          disabled={currentPage >= totalPages || loading || totalAgencies === 0}
          title="Next Page"
          style={{ width: '32px', height: '32px', padding: 0 }}
        >
          <ChevronRight size={15} />
        </button>

        {/* Last Page */}
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage >= totalPages || loading || totalAgencies === 0}
          title="Last Page"
          style={{ width: '32px', height: '32px', padding: 0 }}
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="content-body" style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* 1. Header and Primary Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.2) 0%, rgba(250, 179, 25, 0.05) 100%)',
              border: '1px solid rgba(250, 179, 25, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              boxShadow: '0 4px 12px rgba(250, 179, 25, 0.15)'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Agency Management
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Manage verified partner agencies, subscription tiers, discovery priority, and branding
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenAdd}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.15rem' }}
            title="Add new real estate agency"
          >
            <Plus size={16} />
            <span>Add Agency</span>
          </button>

          <button
            onClick={handleSyncAllFeeds}
            disabled={syncAllLoading || loading}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem' }}
            title="Trigger background batch XML feed sync across all active agencies"
          >
            <Rss size={15} className={syncAllLoading ? 'animate-spin' : ''} style={{ color: 'var(--primary)' }} />
            <span>{syncAllLoading ? 'Syncing All Feeds...' : 'Sync All Feeds'}</span>
          </button>

          <button
            onClick={() => {
              fetchAgencies(true);
              fetchTiers();
            }}
            disabled={loading || tiersLoading}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem' }}
            title="Refresh agency and tier data from server"
          >
            <RefreshCw size={15} className={loading || tiersLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem' }}
            title="Export agencies to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        {/* Total Agencies */}
        <div className="glass-panel" style={{
          padding: '1.35rem',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(250, 179, 25, 0.08)',
            zIndex: 0
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Agencies
              </span>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(250, 179, 25, 0.15)',
                color: '#b47404',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building2 size={18} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {metrics.total}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <TrendingUp size={12} /> Active Network
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Registered brokerage entities
            </div>
          </div>
        </div>

        {/* Verified Agencies */}
        <div className="glass-panel" style={{
          padding: '1.35rem',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.08)',
            zIndex: 0
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verified Trust
              </span>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={18} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {metrics.verified}
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                {metrics.verifiedRate}% Verified
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Credential-validated firms
            </div>
          </div>
        </div>

        {/* Active Operational */}
        <div className="glass-panel" style={{
          padding: '1.35rem',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(14, 165, 233, 0.08)',
            zIndex: 0
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Operations
              </span>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(14, 165, 233, 0.15)',
                color: 'var(--info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={18} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {metrics.active}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--info)' }}>
                {metrics.activeRate}% online
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Publicly visible on portal
            </div>
          </div>
        </div>

        {/* Founding & Premium Tier */}
        <div className="glass-panel" style={{
          padding: '1.35rem',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(250, 179, 25, 0.35)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250, 248, 245, 0.8) 100%)'
        }}>
          <div style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(250, 179, 25, 0.15)',
            zIndex: 0
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b47404', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Featured & Sponsors
              </span>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #fab319 0%, #e09b0b 100%)',
                color: '#0a1f39',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(250, 179, 25, 0.4)'
              }}>
                <Sparkles size={18} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {metrics.sponsors}
              </span>
              <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                Priority Search
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Founding & higher tier partners
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Bar */}
      <div className="glass-panel" style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flex: '1 1 320px',
          minWidth: '260px'
        }}>
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '0.85rem',
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search agencies by name, website, tier or description..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '0.55rem 2.2rem 0.55rem 2.4rem',
                background: 'rgba(0, 0, 0, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          flexWrap: 'wrap'
        }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* Verification Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Verified:</span>
            <select
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Verification</option>
              <option value="Verified">Verified Only</option>
              <option value="Unverified">Unverified Only</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '160px'
              }}
            >
              <option value="All">All Tiers</option>
              {tiersList.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name || `Tier ${t.tierLevel || ''}`}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.04)',
            padding: '2px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Agencies Display Area */}
      {loading ? (
        <div className="glass-panel" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <div>
            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>
              Retrieving Agency Portfolio
            </h4>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Fetching agencies from server endpoint <code style={{ color: 'var(--primary)', fontWeight: 600 }}>GET /admin/agency</code>
            </p>
          </div>
        </div>
      ) : filteredAgencies.length === 0 ? (
        <div className="glass-panel" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(250, 179, 25, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            marginBottom: '1rem'
          }}>
            <Building2 size={28} />
          </div>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
            No agencies found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0.5rem 0 1.25rem 0' }}>
            {searchTerm || statusFilter !== 'All' || verifiedFilter !== 'All' || tierFilter !== 'All'
              ? 'No agencies match your current search or filter criteria. Try clearing your filters.'
              : 'There are currently no agencies registered on the platform.'}
          </p>
          {(searchTerm || statusFilter !== 'All' || verifiedFilter !== 'All' || tierFilter !== 'All') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setVerifiedFilter('All');
                setTierFilter('All');
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '1.5rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            {paginatedAgencies.map((agency) => {
            const agencyId = agency._id || agency.id;
            const logo = getLogoUrl(agency.logo);
            const tier = agency.tier;
            const isSponsor = agency.isFoundingSponsor === true;
            const isVerified = agency.isVerified === true;
            const isActive = agency.isActive === true;
            const isOperating = actionLoading === agencyId;

            return (
              <div
                key={agencyId}
                className="glass-panel"
                onClick={() => handleInspectAgency(agency)}
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  border: isSponsor
                    ? '1px solid rgba(250, 179, 25, 0.45)'
                    : '1px solid var(--border-color)',
                  background: isSponsor
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(253, 248, 238, 0.85) 100%)'
                    : 'var(--bg-surface)',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Founding Sponsor Ribbon */}
                {isSponsor && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'linear-gradient(135deg, #fab319 0%, #f59e0b 100%)',
                    color: '#0a1f39',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 8px rgba(250, 179, 25, 0.35)'
                  }}>
                    <Sparkles size={11} /> Founding Sponsor
                  </div>
                )}

                {/* Top Card: Logo + Name + Verification */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1rem', paddingRight: isSponsor ? '100px' : '0' }}>
                  <AgencyLogo
                    src={agency.logo}
                    name={agency.name}
                    size={52}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                      lineHeight: '1.3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {agency.name || 'Untitled Agency'}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      {isVerified ? (
                        <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                          <CheckCircle2 size={11} /> Verified Agency
                        </span>
                      ) : (
                        <span className="badge" style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.5rem',
                          background: 'rgba(0, 0, 0, 0.05)',
                          color: 'var(--text-muted)'
                        }}>
                          Unverified
                        </span>
                      )}

                      <span className={`badge ${isActive ? 'badge-primary' : 'badge-danger'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description Snippet */}
                <p style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  margin: '0 0 1rem 0',
                  lineHeight: '1.45',
                  height: '2.9em',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  textOverflow: 'ellipsis'
                }}>
                  {agency.description || 'No description provided for this real estate agency.'}
                </p>

                {/* Tier & Privileges Cardlet */}
                <div style={{
                  background: 'rgba(10, 31, 57, 0.03)',
                  border: '1px solid rgba(10, 31, 57, 0.06)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(250, 179, 25, 0.15)',
                      color: '#b47404',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Layers size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {tier?.name || 'Tier 1 — Basic'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Priority: Level {tier?.searchAndAI?.searchPriorityWeight ?? tier?.tierLevel ?? 1} • {agency.coveredAgentsCount || 0}/{agency.agentSeatsLimit ?? 10} Seats
                      </div>
                    </div>
                  </div>

                  {tier?.conversionAndLeads?.whatapps_button && (
                    <span title="WhatsApp Lead Routing Enabled" style={{ color: '#25D366' }}>
                      <MessageCircle size={16} />
                    </span>
                  )}
                </div>

                {/* Website Link */}
                {agency.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem', fontSize: '0.78rem' }}>
                    <Globe size={13} style={{ color: 'var(--text-muted)' }} />
                    <a
                      href={agency.website.startsWith('http') ? agency.website : `https://${agency.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {agency.website.replace(/^https?:\/\//, '')}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}

                {/* Card Action Footer */}
                <div style={{
                  marginTop: 'auto',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}>
                  {/* Status Toggle Switch */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                  >
                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '36px',
                        height: '20px',
                        cursor: isOperating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        disabled={isOperating}
                        onChange={(e) => handleToggleStatus(agency, e)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: isActive ? 'var(--success)' : 'rgba(0,0,0,0.2)',
                        transition: '0.3s',
                        borderRadius: '20px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '""',
                          height: '14px',
                          width: '14px',
                          left: isActive ? '18px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }} />
                      </span>
                    </label>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInspectAgency(agency);
                      }}
                      style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      title="View agency details"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => handleOpenEdit(agency, e)}
                      style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Edit agency details"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>

                    {agency.xmlFeedUrl && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => handleSyncSingleFeed(agencyId, agency.name, e)}
                        disabled={syncingAgencyId === agencyId}
                        style={{ padding: '0.35rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Sync XML Feed properties now"
                      >
                        <RefreshCw size={12} className={syncingAgencyId === agencyId ? 'animate-spin' : ''} style={{ color: 'var(--primary)' }} />
                        <span>Sync</span>
                      </button>
                    )}

                    {agency.isDeleted ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreAgency(agency);
                        }}
                        disabled={actionLoading === agencyId}
                        style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--success)' }}
                        title="Restore soft-deleted agency"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAgencyToDelete(agency);
                        }}
                        style={{ color: 'var(--danger)', padding: '0.4rem' }}
                        title="Soft delete agency"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          <div className="glass-panel" style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginTop: '1.5rem',
            border: '1px solid var(--border-color)'
          }}>
            {renderPaginationToolbar()}
          </div>
        </>
      ) : (
        /* TABLE VIEW */
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.875rem'
            }}>
              <thead>
                <tr style={{
                  background: 'rgba(10, 31, 57, 0.03)',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Agency</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Website</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Tier & Priority</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Agent Seats</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Verification</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Created</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAgencies.map((agency) => {
                  const agencyId = agency._id || agency.id;
                  const logo = getLogoUrl(agency.logo);
                  const tier = agency.tier;
                  const isSponsor = agency.isFoundingSponsor === true;
                  const isVerified = agency.isVerified === true;
                  const isActive = agency.isActive === true;
                  const isOperating = actionLoading === agencyId;

                  return (
                    <tr
                      key={agencyId}
                      onClick={() => handleInspectAgency(agency)}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(250, 179, 25, 0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Agency Name & Logo */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <AgencyLogo
                            src={agency.logo}
                            name={agency.name}
                            size={40}
                          />

                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{agency.name || 'Untitled Agency'}</span>
                              {isSponsor && (
                                <span title="Founding Sponsor" style={{ color: '#fab319', display: 'inline-flex' }}>
                                  <Sparkles size={14} />
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {agency.description || 'Verified Real Estate Agency'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Website */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {agency.website ? (
                          <a
                            href={agency.website.startsWith('http') ? agency.website : `https://${agency.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: 'var(--primary)',
                              textDecoration: 'none',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            {agency.website.replace(/^https?:\/\/(www\.)?/, '')}
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      {/* Tier */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                            {tier?.name || 'Tier 1 — Basic'}
                          </span>
                          {tier?.searchAndAI?.searchPriorityWeight > 1 && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              (Weight: {tier.searchAndAI.searchPriorityWeight})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Agent Seats */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Users size={13} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {agency.coveredAgentsCount || 0} / {agency.agentSeatsLimit ?? 10}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: (agency.coveredAgentsCount || 0) >= (agency.agentSeatsLimit ?? 10) ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                          {(agency.coveredAgentsCount || 0) >= (agency.agentSeatsLimit ?? 10) ? 'Seats Full' : `${Math.max(0, (agency.agentSeatsLimit ?? 10) - (agency.coveredAgentsCount || 0))} Available`}
                        </div>
                      </td>

                      {/* Verification */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {isVerified ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                            <CheckCircle2 size={12} /> Verified
                          </span>
                        ) : (
                          <span className="badge" style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.5rem',
                            background: 'rgba(0, 0, 0, 0.05)',
                            color: 'var(--text-muted)'
                          }}>
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: '1rem 1.25rem' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label
                            style={{
                              position: 'relative',
                              display: 'inline-block',
                              width: '34px',
                              height: '18px',
                              cursor: isOperating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              disabled={isOperating}
                              onChange={(e) => handleToggleStatus(agency, e)}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0, left: 0, right: 0, bottom: 0,
                              backgroundColor: isActive ? 'var(--success)' : 'rgba(0,0,0,0.2)',
                              transition: '0.3s',
                              borderRadius: '20px'
                            }}>
                              <span style={{
                                position: 'absolute',
                                content: '""',
                                height: '12px',
                                width: '12px',
                                left: isActive ? '18px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                transition: '0.3s',
                                borderRadius: '50%'
                              }} />
                            </span>
                          </label>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {agency.createdAt ? new Date(agency.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleInspectAgency(agency)}
                            title="Inspect details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => handleOpenEdit(agency, e)}
                            style={{ padding: '0.35rem 0.65rem' }}
                            title="Edit agency"
                          >
                            <Edit2 size={13} />
                          </button>
                          {agency.xmlFeedUrl && (
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => handleSyncSingleFeed(agencyId, agency.name)}
                              disabled={syncingAgencyId === agencyId}
                              title="Sync XML Feed properties now"
                            >
                              <RefreshCw size={13} className={syncingAgencyId === agencyId ? 'animate-spin' : ''} style={{ color: 'var(--primary)' }} />
                            </button>
                          )}
                          {agency.isDeleted ? (
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => handleRestoreAgency(agency)}
                              disabled={actionLoading === agencyId}
                              style={{ color: 'var(--success)' }}
                              title="Restore soft-deleted agency"
                            >
                              <RotateCcw size={15} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => setAgencyToDelete(agency)}
                              style={{ color: 'var(--danger)' }}
                              title="Soft delete agency"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderPaginationToolbar()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. AGENCY DETAIL MODAL (Centered Modal Dialog) */}
      {/* ========================================================================= */}
      {selectedAgency && (() => {
        const activeAgency = agencyDetails || selectedAgency;
        return createPortal(
          <div className="modal-overlay" onClick={() => { setSelectedAgency(null); setAgencyDetails(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px', width: '100%', maxHeight: '90vh' }}>
              {/* Header */}
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Building2 size={20} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Agency Profile & Details
                  </h3>
                  {drawerLoading && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Loader2 size={13} className="animate-spin" style={{ color: 'var(--primary)' }} />
                      Syncing live data...
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => { setSelectedAgency(null); setAgencyDetails(null); }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', padding: '1.5rem' }}>
                {/* Profile Card Header */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.1) 0%, rgba(10, 31, 57, 0.03) 100%)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  position: 'relative'
                }}>
                  {activeAgency.isFoundingSponsor && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#fab319',
                      color: '#0a1f39',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '20px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 2px 6px rgba(250, 179, 25, 0.4)'
                    }}>
                      <Sparkles size={11} /> Founding Sponsor
                    </div>
                  )}

                  <AgencyLogo
                    src={activeAgency.logo}
                    name={activeAgency.name}
                    size={76}
                    style={{ margin: '0 auto 1rem auto' }}
                  />

                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {activeAgency.name}
                  </h2>

                  {/* Location text if available */}
                  {(activeAgency.town || activeAgency.region || activeAgency.country) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <MapPin size={13} style={{ color: 'var(--primary)' }} />
                      <span>
                        {[activeAgency.town, activeAgency.region, activeAgency.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                    {activeAgency.isVerified ? (
                      <span className="badge badge-success">
                        <ShieldCheck size={12} /> Verified Agency
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-muted)' }}>
                        Unverified
                      </span>
                    )}

                    <span className={`badge ${activeAgency.isActive ? 'badge-primary' : 'badge-danger'}`}>
                      {activeAgency.isActive ? 'Active Operations' : 'Suspended / Inactive'}
                    </span>

                    {activeAgency.brandColorHex && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        fontWeight: 600,
                        color: 'var(--text-secondary)'
                      }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: activeAgency.brandColorHex, display: 'inline-block' }} />
                        <code>{activeAgency.brandColorHex}</code>
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Metric Stats Bar (Properties, Agents, Seats, Sync Status) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '0.65rem'
                }}>
                  <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block' }}>Total Properties</span>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0', color: 'var(--text-primary)' }}>
                      {activeAgency.stats?.totalProperties ?? activeAgency.syncStats?.total ?? 0}
                    </p>
                  </div>

                  <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block' }}>Total Agents</span>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#0284c7' }}>
                      {activeAgency.stats?.totalAgents ?? activeAgency.coveredAgentsCount ?? 0}
                    </p>
                  </div>

                  <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block' }}>Covered Seats</span>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#b47404' }}>
                      {activeAgency.coveredAgentsCount || 0} / {activeAgency.agentSeatsLimit ?? 10}
                    </p>
                  </div>

                  <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block' }}>Sync Status</span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0.45rem 0 0', textTransform: 'uppercase', color: activeAgency.syncStatus === 'success' ? '#059669' : activeAgency.syncStatus === 'failed' ? '#dc2626' : '#d97706' }}>
                      {activeAgency.syncStatus || 'Idle'}
                    </p>
                  </div>
                </div>

                {/* Description Section */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                    Overview & About
                  </h4>
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(0,0,0,0.02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    lineHeight: '1.55',
                    color: 'var(--text-primary)'
                  }}>
                    {activeAgency.description || 'No detailed description specified for this brokerage.'}
                  </div>
                </div>

                {/* Corporate Contact Channels */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                    Corporate Channels & Direct Contact
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.65rem'
                  }}>
                    {/* Call Center Phone */}
                    <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Phone size={12} style={{ color: 'var(--primary)' }} /> Call Center Phone
                      </div>
                      {activeAgency.corporateCallCenterPhone ? (
                        <a
                          href={`tel:${activeAgency.corporateCallCenterPhone}`}
                          style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'block', marginTop: '0.2rem' }}
                        >
                          {activeAgency.corporateCallCenterPhone}
                        </a>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>—</div>
                      )}
                    </div>

                    {/* Corporate WhatsApp */}
                    <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MessageCircle size={12} style={{ color: '#25D366' }} /> Corporate WhatsApp
                      </div>
                      {activeAgency.corporateWhatsapp ? (
                        <a
                          href={`https://wa.me/${String(activeAgency.corporateWhatsapp).replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}
                        >
                          {activeAgency.corporateWhatsapp} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>—</div>
                      )}
                    </div>

                    {/* Corporate Email */}
                    <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Mail size={12} style={{ color: 'var(--primary)' }} /> Corporate Email
                      </div>
                      {activeAgency.corporateEmail ? (
                        <a
                          href={`mailto:${activeAgency.corporateEmail}`}
                          style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'block', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {activeAgency.corporateEmail}
                        </a>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>—</div>
                      )}
                    </div>

                    {/* Website */}
                    <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Globe size={12} style={{ color: 'var(--primary)' }} /> Website URL
                      </div>
                      {activeAgency.website ? (
                        <a
                          href={activeAgency.website.startsWith('http') ? activeAgency.website : `https://${activeAgency.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {activeAgency.website.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>—</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* XML Feed & Portal Synchronization Engine */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                    XML Feed & Portal Synchronization
                  </h4>
                  <div style={{
                    background: '#faf8f5',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sync Schedule:</span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {activeAgency.syncSchedule ? String(activeAgency.syncSchedule).replace(/_/g, ' ') : 'Manual Sync Only'}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Auto-Sync Status:</span>
                        <div>
                          {activeAgency.autoSyncEnabled ? (
                            <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                              <Check size={10} /> Auto-Sync Enabled
                            </span>
                          ) : (
                            <span className="badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', background: 'rgba(0,0,0,0.06)' }}>
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Last Synced At:</span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {activeAgency.lastSyncedAt ? new Date(activeAgency.lastSyncedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </div>
                      </div>
                    </div>

                    {/* Feed URL row & Sync Action */}
                    {activeAgency.xmlFeedUrl && (
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.65rem',
                        flexWrap: 'wrap',
                        marginBottom: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', flex: '1 1 200px' }}>
                          <Rss size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <code style={{ fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activeAgency.xmlFeedUrl}
                          </code>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => {
                              navigator.clipboard.writeText(activeAgency.xmlFeedUrl);
                              toast.success('Feed URL copied!');
                            }}
                            title="Copy Feed URL"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSyncSingleFeed(activeAgency._id || activeAgency.id, activeAgency.name)}
                            disabled={syncingAgencyId === (activeAgency._id || activeAgency.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            title="Trigger instant XML feed synchronization (POST /api/admin/agency/{id}/sync-feed)"
                          >
                            <RefreshCw size={12} className={syncingAgencyId === (activeAgency._id || activeAgency.id) ? 'animate-spin' : ''} />
                            <span>{syncingAgencyId === (activeAgency._id || activeAgency.id) ? 'Syncing...' : 'Sync Feed Now'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sync Stats Summary Cards */}
                    {activeAgency.syncStats && (
                      <div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '0.45rem',
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '0.65rem'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeAgency.syncStats.total ?? 0}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 600 }}>INSERTED</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>{activeAgency.syncStats.inserted ?? 0}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#0284c7', fontWeight: 600 }}>UPDATED</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>{activeAgency.syncStats.updated ?? 0}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 600 }}>FAILED</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>{activeAgency.syncStats.failed ?? 0}</div>
                          </div>
                        </div>

                        {(activeAgency.syncStats.lastDurationMs !== undefined || activeAgency.activePropertiesCount !== undefined) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {activeAgency.activePropertiesCount !== undefined && (
                              <span>Active Catalog: <strong style={{ color: 'var(--text-primary)' }}>{activeAgency.activePropertiesCount}</strong> properties</span>
                            )}
                            {activeAgency.syncStats.lastDurationMs !== undefined && (
                              <span>Execution: <strong style={{ color: 'var(--text-primary)' }}>{activeAgency.syncStats.lastDurationMs}ms</strong></span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tier Breakdown Card */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                    Subscription Tier & Privileges
                  </h4>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.08) 0%, rgba(255,255,255,0.95) 100%)',
                    border: '1px solid rgba(250, 179, 25, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {activeAgency.tier?.name || 'Tier 1 — Basic'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <span>Level: {activeAgency.tier?.tierLevel || 1}</span>
                          <span>•</span>
                          <span>
                            {activeAgency.tier?.finalPrice !== undefined ? (
                              <>
                                <strong style={{ color: 'var(--text-primary)' }}>${activeAgency.tier.finalPrice}</strong>
                                {activeAgency.tier.price && activeAgency.tier.price !== activeAgency.tier.finalPrice && (
                                  <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>${activeAgency.tier.price}</span>
                                )}
                                <span> {activeAgency.tier.currency || 'USD'}/mo</span>
                              </>
                            ) : (
                              `$${activeAgency.tier?.price || 0} USD/mo`
                            )}
                          </span>
                          {activeAgency.tier?.discountPercentage > 0 && (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              {activeAgency.tier.discountPercentage}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                        Active Plan
                      </span>
                    </div>

                    {/* Feature Matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Check size={14} style={{ color: 'var(--success)' }} />
                        <span>Search Weight: {activeAgency.tier?.searchAndAI?.searchPriorityWeight ?? 1}x</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        {activeAgency.tier?.conversionAndLeads?.whatapps_button ? (
                          <Check size={14} style={{ color: 'var(--success)' }} />
                        ) : (
                          <X size={14} style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span>WhatsApp Leads Button</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        {activeAgency.tier?.uiAppearance?.hasCardHighlight ? (
                          <Check size={14} style={{ color: 'var(--success)' }} />
                        ) : (
                          <X size={14} style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span>Card Highlight Badge</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        {activeAgency.tier?.conversionAndLeads?.external_webview ? (
                          <Check size={14} style={{ color: 'var(--success)' }} />
                        ) : (
                          <X size={14} style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span>External Webview</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent Seats Breakdown */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                    Agent Seats & Plan Coverage
                  </h4>
                  <div style={{
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(250, 179, 25, 0.15)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Users size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {activeAgency.coveredAgentsCount || 0} of {activeAgency.agentSeatsLimit ?? 10} Covered Agent Seats
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Limit: <code style={{ fontWeight: 700, color: 'var(--primary)' }}>agentSeatsLimit: {activeAgency.agentSeatsLimit ?? 10}</code>
                          </div>
                        </div>
                      </div>

                      {(activeAgency.coveredAgentsCount || 0) >= (activeAgency.agentSeatsLimit ?? 10) ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                          Seats Full
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                          {Math.max(0, (activeAgency.agentSeatsLimit ?? 10) - (activeAgency.coveredAgentsCount || 0))} Free Slots Left
                        </span>
                      )}
                    </div>

                    {/* Progress Meter */}
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(0,0,0,0.08)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginTop: '0.65rem'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round(((activeAgency.coveredAgentsCount || 0) / Math.max(1, activeAgency.agentSeatsLimit ?? 10)) * 100))}%`,
                        background: (activeAgency.coveredAgentsCount || 0) >= (activeAgency.agentSeatsLimit ?? 10) ? 'var(--danger)' : 'linear-gradient(90deg, #10b981 0%, #fab319 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Technical Identifiers */}
                <div style={{
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span><strong>System ID:</strong> <code>{activeAgency._id || activeAgency.id}</code></span>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => {
                        navigator.clipboard.writeText(activeAgency._id || activeAgency.id);
                        toast.success('Agency ID copied!');
                      }}
                      title="Copy System ID"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>
                    <strong>Created:</strong> {activeAgency.createdAt ? new Date(activeAgency.createdAt).toLocaleString() : 'N/A'}
                    <span style={{ margin: '0 0.5rem' }}>•</span>
                    <strong>Updated:</strong> {activeAgency.updatedAt ? new Date(activeAgency.updatedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="modal-footer" style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-color)',
                background: '#faf8f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setSelectedAgency(null); setAgencyDetails(null); }}
                >
                  Close
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleToggleStatus(activeAgency)}
                    disabled={actionLoading === (activeAgency._id || activeAgency.id)}
                  >
                    {activeAgency.isActive ? 'Deactivate Agency' : 'Activate Agency'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const target = activeAgency;
                      setSelectedAgency(null);
                      setAgencyDetails(null);
                      handleOpenEdit(target);
                    }}
                  >
                    <Edit2 size={14} /> Edit Agency
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ========================================================================= */}
      {/* 6. EDIT AGENCY MODAL (PUT /admin/agency/:id) */}
      {/* ========================================================================= */}
      {editingAgency && createPortal(
        <div className="modal-overlay" onClick={() => !editLoading && setEditingAgency(null)}>
          <form
            className="modal-content"
            onSubmit={handleEditSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', width: '100%', maxHeight: '90vh' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(250, 179, 25, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Modify Agency Profile & Settings
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Update agency branding, communication channels, location, tier, and XML feeds
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                disabled={editLoading}
                onClick={() => setEditingAgency(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', padding: '1.5rem' }}>
              
              {/* Section 1: Logo & Commercial Identity */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  1. Commercial Identity & Logo
                </span>

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {/* Logo Preview */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    <AgencyLogo
                      src={formLogoPreview || formLogoUrl}
                      name={formName}
                      size={64}
                    />
                  </div>

                  <div style={{ flex: '1 1 240px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Agency Logo <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(PNG, JPG, WEBP, SVG)</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={13} />
                        Choose New Logo File
                        <input
                          type="file"
                          accept="image/*,.svg"
                          style={{ display: 'none' }}
                          onChange={handleLogoFileChange}
                        />
                      </label>
                      {(formLogoPreview || formLogoUrl) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleRemoveLogo}
                          style={{ color: 'var(--danger)', fontSize: '0.75rem' }}
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {/* Agency Name */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Agency Commercial Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Multiinmuebles Punta Cana"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Brand Color Hex */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Brand Color Hex
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={formBrandColorHex || '#002B49'}
                        onChange={(e) => setFormBrandColorHex(e.target.value)}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          padding: '2px',
                          background: '#ffffff'
                        }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="#002B49"
                        value={formBrandColorHex}
                        onChange={(e) => setFormBrandColorHex(e.target.value)}
                        style={{ flex: 1, fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginTop: '0.85rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                    Agency Description
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Leading real estate agency in Punta Cana, Bávaro, and Cap Cana..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Section 2: Corporate Communication Channels */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  2. Corporate Communication Channels
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Corporate Email
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Mail size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="email"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="contacto@multiinmueblespc.com"
                        value={formCorporateEmail}
                        onChange={(e) => setFormCorporateEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Call Center Phone
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Phone size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="+18095451798"
                        value={formCorporateCallCenterPhone}
                        onChange={(e) => setFormCorporateCallCenterPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Corporate WhatsApp
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <MessageCircle size={15} style={{ position: 'absolute', left: '0.85rem', color: '#25D366', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="+18095451798"
                        value={formCorporateWhatsapp}
                        onChange={(e) => setFormCorporateWhatsapp(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Official Website URL
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Globe size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="url"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="https://www.multiinmueblespc.com"
                        value={formWebsite}
                        onChange={(e) => setFormWebsite(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Geographic Location */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  3. Geographic Location
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Country Code
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="DO"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Region / Province
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. La Altagracia"
                      value={formRegion}
                      onChange={(e) => setFormRegion(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Town / City
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Punta Cana"
                      value={formTown}
                      onChange={(e) => setFormTown(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Subscription Tier & Seats */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  4. Subscription Tier & Seat Allocation
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Subscription Tier ({tiersList.length} Available)
                    </label>
                    <select
                      className="form-control"
                      value={formTierId}
                      onChange={(e) => setFormTierId(e.target.value)}
                      style={{ cursor: 'pointer', background: '#ffffff' }}
                    >
                      <option value="">Select a subscription tier...</option>
                      {tiersList.map(tier => (
                        <option key={tier._id} value={tier._id}>
                          {tier.name || `Tier ${tier.tierLevel || 1}`} — Level {tier.tierLevel || 1} (${tier.finalPrice ?? tier.price ?? 0} {tier.currency || 'USD'}/mo)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Covered Agent Seats Limit
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Users size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="10"
                        value={formAgentSeatsLimit}
                        onChange={(e) => setFormAgentSeatsLimit(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Founding Sponsor Checkbox */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: formIsFoundingSponsor ? 'rgba(250, 179, 25, 0.12)' : 'rgba(0,0,0,0.02)',
                  border: formIsFoundingSponsor ? '1px solid rgba(250, 179, 25, 0.4)' : '1px solid var(--border-color)'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Sparkles size={15} style={{ color: '#b47404' }} /> Founding Sponsor Partner
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Enables golden sponsor badge and priority search ranking across property queries.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsFoundingSponsor}
                    onChange={(e) => setFormIsFoundingSponsor(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                </div>
              </div>

              {/* Section 5: XML Feed Engine & Status */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  5. XML Feed Engine & Operational Status
                </span>

                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                    XML Feed URL
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Rss size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--primary)', pointerEvents: 'none' }} />
                    <input
                      type="url"
                      className="form-control"
                      style={{ paddingLeft: '2.4rem' }}
                      placeholder="https://www.multiinmueblespc.com/feed.xml"
                      value={formXmlFeedUrl}
                      onChange={(e) => setFormXmlFeedUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Auto-Sync Engine Status
                    </label>
                    <select
                      className="form-control"
                      value={formAutoSyncEnabled ? 'true' : 'false'}
                      onChange={(e) => setFormAutoSyncEnabled(e.target.value === 'true')}
                      style={{ cursor: 'pointer', background: '#ffffff' }}
                    >
                      <option value="true">Enabled (Automatic Syncing)</option>
                      <option value="false">Disabled (Manual Sync Only)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Sync Schedule Interval
                    </label>
                    <select
                      className="form-control"
                      value={formSyncSchedule}
                      onChange={(e) => setFormSyncSchedule(e.target.value)}
                      style={{ cursor: 'pointer', background: '#ffffff' }}
                    >
                      <option value="EVERY_6_HOURS">Every 6 Hours (Default)</option>
                      <option value="EVERY_12_HOURS">Every 12 Hours</option>
                      <option value="DAILY">Daily (Once per day)</option>
                      <option value="HOURLY">Hourly</option>
                    </select>
                  </div>
                </div>

                {/* Status Toggles: Active & Verified */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {/* Active Operations Toggle */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: formIsActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.02)',
                    border: formIsActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                        Active Operations
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Publicly visible on directory
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--success)' }}
                    />
                  </div>

                  {/* Verified Brokerage Toggle */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: formIsVerified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.02)',
                    border: formIsVerified ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                        Verified Brokerage Status
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Displays trust verification badge
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formIsVerified}
                      onChange={(e) => setFormIsVerified(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--success)' }}
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-footer" style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: '#faf8f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              flexShrink: 0
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={editLoading}
                onClick={() => setEditingAgency(null)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={editLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                {editLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Updating Agency...</span>
                  </>
                ) : (
                  <>
                    <Edit2 size={15} />
                    <span>Save Agency Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 7. SOFT DELETE AGENCY CONFIRMATION MODAL (PUT /admin/agency/:id/soft-delete) */}
      {/* ========================================================================= */}
      {agencyToDelete && createPortal(
        <div className="modal-overlay" onClick={() => !deleteLoading && setAgencyToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                <AlertTriangle size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Confirm Agency Soft Delete
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                disabled={deleteLoading}
                onClick={() => setAgencyToDelete(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: 'center', padding: '1.75rem 1.5rem' }}>
              <AgencyLogo
                src={agencyToDelete.logo}
                name={agencyToDelete.name}
                size={64}
                style={{ margin: '0 auto 1rem auto' }}
              />

              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                Soft delete "{agencyToDelete.name}"?
              </h4>

              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Are you sure you want to soft delete this agency? The agency will be marked as deleted (<code style={{ color: 'var(--danger)' }}>isDeleted = true</code>) via <code style={{ color: 'var(--danger)' }}>PUT /admin/agency/{agencyToDelete._id}/soft-delete</code> and hidden from active discovery.
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center', gap: '0.75rem', background: '#faf8f5', padding: '1rem 1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deleteLoading}
                onClick={() => setAgencyToDelete(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteLoading}
                onClick={handleDeleteSubmit}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Soft Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Yes, Soft Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ========================================================================= */}
      {/* 8. ADD AGENCY MODAL (POST /admin/agency) */}
      {/* ========================================================================= */}
      {isAddModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => !addLoading && setIsAddModalOpen(false)}>
          <form
            className="modal-content"
            onSubmit={handleAddAgencySubmit}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', width: '100%', maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(250, 179, 25, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Add New Real Estate Agency
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Register a verified brokerage partner, configure XML syndication, and assign tiers
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                disabled={addLoading}
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', padding: '1.5rem' }}>
              
              {/* Section 1: Commercial Identity & Logo */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  1. Commercial Identity & Logo
                </span>

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {/* Logo Preview & Picker */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    {addForm.logoPreview ? (
                      <img src={addForm.logoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <Building2 size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                    )}
                  </div>

                  <div style={{ flex: '1 1 240px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Agency Logo <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(PNG, JPG, WEBP, SVG)</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={13} />
                        Choose Logo File
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                          style={{ display: 'none' }}
                          onChange={handleAddLogoChange}
                        />
                      </label>
                      {addForm.logoPreview && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleRemoveAddLogo}
                          style={{ color: 'var(--danger)', fontSize: '0.75rem' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                      Upload square or high-resolution horizontal logo for listing attribution.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {/* Agency Name */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Agency Commercial Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Multiinmuebles Punta Cana"
                      value={addForm.name}
                      onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Brand Color Hex */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Brand Color Hex
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={addForm.brandColorHex || '#002B49'}
                        onChange={(e) => setAddForm(prev => ({ ...prev, brandColorHex: e.target.value }))}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          padding: '2px',
                          background: '#ffffff'
                        }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="#002B49"
                        value={addForm.brandColorHex}
                        onChange={(e) => setAddForm(prev => ({ ...prev, brandColorHex: e.target.value }))}
                        style={{ flex: 1, fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginTop: '0.85rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                    Agency Description
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Leading real estate agency in Punta Cana, Bávaro, and Cap Cana..."
                    value={addForm.description}
                    onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Section 2: Corporate Communication Channels */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  2. Corporate Communication Channels
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Corporate Email
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Mail size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="email"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="contacto@multiinmueblespc.com"
                        value={addForm.corporateEmail}
                        onChange={(e) => setAddForm(prev => ({ ...prev, corporateEmail: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Call Center Phone
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Phone size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="+18095451798"
                        value={addForm.corporateCallCenterPhone}
                        onChange={(e) => setAddForm(prev => ({ ...prev, corporateCallCenterPhone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Corporate WhatsApp
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <MessageCircle size={15} style={{ position: 'absolute', left: '0.85rem', color: '#25D366', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="+18095451798"
                        value={addForm.corporateWhatsapp}
                        onChange={(e) => setAddForm(prev => ({ ...prev, corporateWhatsapp: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Official Website URL
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Globe size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="url"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="https://www.multiinmueblespc.com"
                        value={addForm.website}
                        onChange={(e) => setAddForm(prev => ({ ...prev, website: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Geographic Location */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  3. Geographic Location
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Country Code
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="DO"
                      value={addForm.country}
                      onChange={(e) => setAddForm(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Region / Province
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. La Altagracia"
                      value={addForm.region}
                      onChange={(e) => setAddForm(prev => ({ ...prev, region: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Town / City
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Punta Cana"
                      value={addForm.town}
                      onChange={(e) => setAddForm(prev => ({ ...prev, town: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Subscription Tier & Seats */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  4. Subscription Tier & Seat Allocation
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Subscription Tier ({tiersList.length} Available)
                    </label>
                    <select
                      className="form-control"
                      value={addForm.tier}
                      onChange={(e) => setAddForm(prev => ({ ...prev, tier: e.target.value }))}
                      style={{ cursor: 'pointer', background: '#ffffff' }}
                    >
                      <option value="">Select a subscription tier...</option>
                      {tiersList.map(tier => (
                        <option key={tier._id} value={tier._id}>
                          {tier.name || `Tier ${tier.tierLevel || 1}`} — Level {tier.tierLevel || 1} (${tier.finalPrice ?? tier.price ?? 0} {tier.currency || 'USD'}/mo)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Covered Agent Seats Limit
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Users size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        className="form-control"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="10"
                        value={addForm.agentSeatsLimit}
                        onChange={(e) => setAddForm(prev => ({ ...prev, agentSeatsLimit: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: XML Feed & Auto-Synchronization */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                  5. XML Feed Engine & Portal Synchronization
                </span>

                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                    XML Feed URL
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Rss size={15} style={{ position: 'absolute', left: '0.85rem', color: 'var(--primary)', pointerEvents: 'none' }} />
                    <input
                      type="url"
                      className="form-control"
                      style={{ paddingLeft: '2.4rem' }}
                      placeholder="https://www.multiinmueblespc.com/feed.xml"
                      value={addForm.xmlFeedUrl}
                      onChange={(e) => setAddForm(prev => ({ ...prev, xmlFeedUrl: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Auto-Sync Engine Status
                    </label>
                    <select
                      className="form-control"
                      value={addForm.autoSyncEnabled ? 'true' : 'false'}
                      onChange={(e) => setAddForm(prev => ({ ...prev, autoSyncEnabled: e.target.value === 'true' }))}
                      style={{ cursor: 'pointer', background: '#ffffff' }}
                    >
                      <option value="true">Enabled (Automatic Syncing)</option>
                      <option value="false">Disabled (Manual Sync Only)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                      Sync Schedule Interval
                    </label>
                    <select
                      className="form-control"
                      value={addForm.syncSchedule}
                      onChange={(e) => setAddForm(prev => ({ ...prev, syncSchedule: e.target.value }))}
                      style={{ cursor: 'pointer', background: '#ffffff' }}
                    >
                      <option value="EVERY_6_HOURS">Every 6 Hours (Default)</option>
                      <option value="EVERY_12_HOURS">Every 12 Hours</option>
                      <option value="DAILY">Daily (Once per day)</option>
                      <option value="HOURLY">Hourly</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="modal-footer" style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: '#faf8f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              flexShrink: 0
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={addLoading}
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={addLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                {addLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Adding Agency...</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Add Agency</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}