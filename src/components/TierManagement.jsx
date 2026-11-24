import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Check,
  X,
  Eye,
  LayoutGrid,
  List,
  Crown,
  Zap,
  TrendingUp,
  ShieldCheck,
  Star,
  MessageCircle,
  ExternalLink,
  BellRing,
  Globe,
  Loader2,
  HelpCircle,
  Flame,
  ArrowRight,
  Info,
  Edit2,
  DollarSign,
  Percent,
  Sliders
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function TierManagement() {
  const { adminUser, addAuditLog: onAddAuditLog } = useStateContext();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';

  // API State
  const [tiersList, setTiersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // View & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive'
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modal / Drawer States
  const [selectedTier, setSelectedTier] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Edit Tier Modal State
  const [editingTier, setEditingTier] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Edit Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formDiscountPercentage, setFormDiscountPercentage] = useState(0);
  const [formSearchPriorityWeight, setFormSearchPriorityWeight] = useState(1);
  const [formBadgeType, setFormBadgeType] = useState('NONE');
  const [formEnableShimmerAnimation, setFormEnableShimmerAnimation] = useState(false);
  const [formHasCardHighlight, setFormHasCardHighlight] = useState(false);
  const [formWhatappsButton, setFormWhatappsButton] = useState(false);
  const [formEnableNativeLeadNotifications, setFormEnableNativeLeadNotifications] = useState(false);
  const [formExternalWebview, setFormExternalWebview] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  // Helper to extract tier pricing metrics
  const getTierPricing = useCallback((tier) => {
    if (!tier) return { basePrice: 0, discount: 0, finalPrice: 0, currency: 'USD' };
    const basePrice = tier.price ?? tier.pricing?.monthlyPrice ?? 0;
    const discount = tier.discountPercentage ?? 0;
    let finalPrice = tier.finalPrice;
    if (finalPrice === undefined || finalPrice === null) {
      finalPrice = discount > 0 ? Number((basePrice - (basePrice * discount) / 100).toFixed(2)) : basePrice;
    }
    const currency = tier.currency || tier.pricing?.currency || 'USD';
    return { basePrice, discount, finalPrice, currency };
  }, []);

  // 1. FETCH ALL TIERS: GET /admin/tiers
  const fetchTiers = useCallback(async (showToast = false) => {
    if (!adminUser?.token) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${adminUser.token}` };
      const candidateEndpoints = [
        `${baseUrl}/admin/tiers`,
        `${baseUrl}/admin/tiers/get-all`,
        `${baseUrl}/admin/tier/get-all`,
        `${baseUrl}/admin/tier`,
        `${baseUrl}/admin/getAllTiers`
      ];

      let fetchedTiers = null;
      let resMessage = '';

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
            resMessage = res.data?.message || 'Tiers retrieved successfully';
            break;
          }
        } catch (e) {
          // continue fallback
        }
      }

      if (fetchedTiers) {
        // Sort by tierLevel ascending
        const sorted = [...fetchedTiers].sort((a, b) => (a.tierLevel || 0) - (b.tierLevel || 0));
        setTiersList(sorted);
        if (showToast) {
          toast.success(resMessage || 'Tiers retrieved successfully');
        }
      } else {
        setTiersList([]);
        if (showToast) {
          toast.error('No tier configurations found on server');
        }
      }
    } catch (err) {
      console.error('Failed to fetch tiers:', err);
      toast.error(err.response?.data?.message || 'Failed to retrieve subscription tiers');
      setTiersList([]);
    } finally {
      setLoading(false);
    }
  }, [adminUser?.token, baseUrl]);

  // Initial Fetch
  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  // 2. GET TIER BY ID: GET /admin/tiers/:id
  const handleViewTier = async (tier) => {
    setSelectedTier(tier);
    setDrawerLoading(true);
    const tierId = tier._id || tier.id;
    try {
      let res;
      try {
        res = await axios.get(`${baseUrl}/admin/tiers/${tierId}`, {
          headers: { Authorization: `Bearer ${adminUser?.token}` }
        });
      } catch (firstErr) {
        if (firstErr.response && (firstErr.response.status === 404 || firstErr.response.status === 405)) {
          res = await axios.get(`${baseUrl}/admin/tier/${tierId}`, {
            headers: { Authorization: `Bearer ${adminUser?.token}` }
          });
        } else {
          throw firstErr;
        }
      }
      const data = res.data?.data || res.data?.tier || res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setSelectedTier(data);
      }
    } catch (err) {
      console.warn('GET /admin/tiers/:id fallback notice:', err);
      // Keep cached tier on fallback
    } finally {
      setDrawerLoading(false);
    }
  };

  // 3. OPEN EDIT TIER MODAL: Populate fields
  const handleOpenEdit = async (tier, e) => {
    if (e) e.stopPropagation();
    let currentTier = tier;
    const tierId = tier._id || tier.id;

    // Fetch latest fresh tier data by ID
    try {
      const res = await axios.get(`${baseUrl}/admin/tiers/${tierId}`, {
        headers: { Authorization: `Bearer ${adminUser?.token}` }
      });
      const data = res.data?.data || res.data?.tier || res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        currentTier = data;
      }
    } catch (err) {
      // Use passed tier as fallback
    }

    setEditingTier(currentTier);
    setFormName(currentTier.name || '');
    setFormDescription(currentTier.description || '');
    setFormPrice(currentTier.price ?? currentTier.pricing?.monthlyPrice ?? 0);
    setFormDiscountPercentage(currentTier.discountPercentage ?? 0);
    setFormSearchPriorityWeight(currentTier.searchAndAI?.searchPriorityWeight ?? 1);
    setFormBadgeType(currentTier.uiAppearance?.badgeType || 'NONE');
    setFormEnableShimmerAnimation(Boolean(currentTier.uiAppearance?.enableShimmerAnimation));
    setFormHasCardHighlight(Boolean(currentTier.uiAppearance?.hasCardHighlight));
    setFormWhatappsButton(Boolean(currentTier.conversionAndLeads?.whatapps_button));
    setFormEnableNativeLeadNotifications(Boolean(currentTier.conversionAndLeads?.enableNativeLeadNotifications));
    setFormExternalWebview(Boolean(currentTier.conversionAndLeads?.external_webview));
    setFormIsActive(currentTier.isActive !== false);
  };

  // 4. SUBMIT EDIT TIER: PUT /admin/tiers/edit/:id
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTier) return;
    if (!adminUser?.token) {
      toast.error('Authentication required. Please sign in again.');
      return;
    }

    const tierId = editingTier._id || editingTier.id;
    const numPrice = Number(formPrice) >= 0 ? Number(formPrice) : 0;
    const numDiscount = Number(formDiscountPercentage) >= 0 ? Number(formDiscountPercentage) : 0;
    const numSearchWeight = Number(formSearchPriorityWeight) >= 1 ? Number(formSearchPriorityWeight) : 1;

    const payload = {
      name: formName.trim(),
      description: formDescription.trim(),
      price: numPrice,
      discountPercentage: numDiscount,
      searchAndAI: {
        searchPriorityWeight: numSearchWeight
      },
      uiAppearance: {
        badgeType: formBadgeType,
        enableShimmerAnimation: Boolean(formEnableShimmerAnimation),
        hasCardHighlight: Boolean(formHasCardHighlight)
      },
      conversionAndLeads: {
        external_webview: Boolean(formExternalWebview),
        whatapps_button: Boolean(formWhatappsButton),
        enableNativeLeadNotifications: Boolean(formEnableNativeLeadNotifications)
      },
      isActive: Boolean(formIsActive)
    };

    try {
      setEditLoading(true);
      const headers = { Authorization: `Bearer ${adminUser.token}` };

      // Primary: PUT /admin/tiers/edit/:id
      // Fallback: PUT /admin/tiers/:id
      let res;
      try {
        res = await axios.put(`${baseUrl}/admin/tiers/edit/${tierId}`, payload, { headers });
      } catch (firstErr) {
        if (firstErr.response && (firstErr.response.status === 404 || firstErr.response.status === 405)) {
          try {
            res = await axios.put(`${baseUrl}/admin/tiers/${tierId}`, payload, { headers });
          } catch (secondErr) {
            if (secondErr.response && (secondErr.response.status === 404 || secondErr.response.status === 405)) {
              res = await axios.put(`${baseUrl}/admin/tier/edit/${tierId}`, payload, { headers });
            } else {
              throw secondErr;
            }
          }
        } else {
          throw firstErr;
        }
      }

      toast.success(res.data?.message || `Tier "${formName}" updated successfully`);

      const calculatedFinal = numDiscount > 0
        ? Number((numPrice - (numPrice * numDiscount) / 100).toFixed(2))
        : numPrice;

      const updatedObj = res.data?.data || res.data?.tier || {
        ...editingTier,
        ...payload,
        finalPrice: calculatedFinal,
        updatedAt: new Date().toISOString()
      };

      // Update locally
      setTiersList(prev => prev.map(t => ((t._id || t.id) === tierId ? { ...t, ...updatedObj } : t)));

      if (selectedTier && (selectedTier._id || selectedTier.id) === tierId) {
        setSelectedTier(prev => ({ ...prev, ...updatedObj }));
      }

      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Tier Management', `Updated configuration for subscription tier: ${formName} (ID: ${tierId})`);
      }

      setEditingTier(null);
    } catch (err) {
      console.error('Failed to update tier:', err);
      toast.error(err.response?.data?.message || 'Failed to update subscription tier on server');
    } finally {
      setEditLoading(false);
    }
  };

  // Export Tiers to CSV
  const handleExportCSV = () => {
    if (tiersList.length === 0) {
      toast.error('No tiers available to export');
      return;
    }

    const headers = [
      'Tier Level',
      'Name',
      'Original Price (USD)',
      'Discount (%)',
      'Final Price (USD)',
      'Search Priority Weight',
      'Badge Type',
      'Card Highlight',
      'Shimmer Animation',
      'WhatsApp Routing',
      'Native Lead Notifications',
      'External Webview',
      'Status'
    ];

    const rows = tiersList.map(t => {
      const { basePrice, discount, finalPrice } = getTierPricing(t);
      return [
        t.tierLevel || 1,
        `"${(t.name || '').replace(/"/g, '""')}"`,
        basePrice,
        discount,
        finalPrice,
        t.searchAndAI?.searchPriorityWeight ?? 1,
        `"${t.uiAppearance?.badgeType || 'NONE'}"`,
        t.uiAppearance?.hasCardHighlight ? 'Yes' : 'No',
        t.uiAppearance?.enableShimmerAnimation ? 'Yes' : 'No',
        t.conversionAndLeads?.whatapps_button ? 'Yes' : 'No',
        t.conversionAndLeads?.enableNativeLeadNotifications ? 'Yes' : 'No',
        t.conversionAndLeads?.external_webview ? 'Yes' : 'No',
        t.isActive !== false ? 'Active' : 'Inactive'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `subscription_tiers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Subscription tiers exported to CSV');
  };

  // Filtered tiers list
  const filteredTiers = useMemo(() => {
    return tiersList.filter(t => {
      const name = (t.name || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const badge = (t.uiAppearance?.badgeType || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || desc.includes(query) || badge.includes(query);
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && t.isActive !== false) ||
        (statusFilter === 'Inactive' && t.isActive === false);

      return matchesSearch && matchesStatus;
    });
  }, [tiersList, searchTerm, statusFilter]);

  // Derived KPI metrics
  const maxSearchBoost = useMemo(() => {
    if (!tiersList.length) return '3.0x';
    const max = Math.max(...tiersList.map(t => t.searchAndAI?.searchPriorityWeight || 1));
    return `${max.toFixed(1)}x`;
  }, [tiersList]);

  const proTier = useMemo(() => tiersList.find(t => t.tierLevel === 2), [tiersList]);
  const sponsorTier = useMemo(() => tiersList.find(t => t.tierLevel === 3), [tiersList]);

  // Badge UI renderer
  const renderBadgePill = (badgeType) => {
    switch (badgeType) {
      case 'GOLDEN_STAR':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'linear-gradient(135deg, #fab319 0%, #e09b0b 100%)',
            color: '#0a1f39',
            padding: '0.2rem 0.6rem',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 800,
            boxShadow: '0 2px 8px rgba(250, 179, 25, 0.4)'
          }}>
            <Star size={12} fill="#0a1f39" /> Golden Star
          </span>
        );
      case 'BLUE_CHECKMARK':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(14, 165, 233, 0.15)',
            color: 'var(--info)',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            padding: '0.2rem 0.6rem',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 700
          }}>
            <CheckCircle2 size={12} /> Blue Verified
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.05)',
            color: 'var(--text-muted)',
            padding: '0.2rem 0.55rem',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 600
          }}>
            Standard Badge (None)
          </span>
        );
    }
  };

  return (
    <div className="content-body" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* 1. Header & Quick Actions */}
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
              <Layers size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Subscription Tier Management
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Configure subscription plans, search AI priority weights, UI appearance badges, and lead conversion features
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchTiers(true)}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem' }}
            title="Refresh tiers from server"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Tiers</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem' }}
            title="Export tiers matrix to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        {/* Total Tiers */}
        <div className="glass-panel" style={{
          padding: '1.35rem',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Configured Tiers
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
              <Layers size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {tiersList.length}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>
              Active in System
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Level 1 (Basic) to Level 3 (Founding Sponsor)
          </div>
        </div>

        {/* Highest Search Weight */}
        <div className="glass-panel" style={{
          padding: '1.35rem',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Max Search AI Boost
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
              <Zap size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {maxSearchBoost}
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
              Top Priority
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Search algorithm priority multiplier
          </div>
        </div>

        {/* Pro Agent Tier */}
        <div className="glass-panel" style={{
          padding: '1.35rem',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {proTier?.name || 'Pro Plan (Tier 2)'}
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
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ${proTier ? (proTier.finalPrice ?? proTier.price ?? 49) : 49}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--info)' }}>
              / month {proTier?.currency || 'USD'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Includes WhatsApp Leads & Blue Checkmark
          </div>
        </div>

        {/* Sponsor Tier */}
        <div className="glass-panel" style={{
          padding: '1.35rem',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(250, 179, 25, 0.35)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250, 248, 245, 0.8) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b47404', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {sponsorTier?.name || 'Founding Sponsor (Tier 3)'}
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
              ${sponsorTier ? (sponsorTier.finalPrice ?? sponsorTier.price ?? 49) : 49}
            </span>
            {sponsorTier?.discountPercentage > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                {sponsorTier.discountPercentage}% OFF
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Shimmer Animation + Card Highlight + {sponsorTier?.searchAndAI?.searchPriorityWeight ?? 3}x Search
          </div>
        </div>
      </div>

      {/* 3. Search and View Controls Bar */}
      <div className="glass-panel" style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flex: '1 1 280px',
          minWidth: '220px'
        }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search tiers by name, perks or badge type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 2.2rem 0.55rem 2.4rem',
                background: 'rgba(0, 0, 0, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter & View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: '#ffffff',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* Billing Cycle Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.04)',
            padding: '3px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                background: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
                color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: billingCycle === 'monthly' ? 700 : 500,
                cursor: 'pointer',
                boxShadow: billingCycle === 'monthly' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Monthly View
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              style={{
                background: billingCycle === 'yearly' ? '#ffffff' : 'transparent',
                color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: billingCycle === 'yearly' ? 700 : 500,
                cursor: 'pointer',
                boxShadow: billingCycle === 'yearly' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Annual View
            </button>
          </div>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.04)',
            padding: '3px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                color: viewMode === 'cards' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                boxShadow: viewMode === 'cards' ? 'var(--shadow-sm)' : 'none'
              }}
              title="Pricing Cards View"
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
                boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none'
              }}
              title="Comparison Matrix Table"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Tiers Display Area */}
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
              Loading Subscription Tiers
            </h4>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Fetching tiers configuration from server endpoint <code style={{ color: 'var(--primary)', fontWeight: 600 }}>GET /admin/tiers</code>
            </p>
          </div>
        </div>
      ) : filteredTiers.length === 0 ? (
        <div className="glass-panel" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          borderRadius: 'var(--radius-md)'
        }}>
          <Layers size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No subscription tiers found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
            No tiers match your search query. Try clearing your search term or status filter.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* PRICING & PLAN CARDS VIEW */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch'
        }}>
          {filteredTiers.map((tier) => {
            const isTopTier = tier.tierLevel === 3 || tier.uiAppearance?.badgeType === 'GOLDEN_STAR';
            const isProTier = tier.tierLevel === 2;
            const { basePrice, discount, finalPrice, currency } = getTierPricing(tier);
            const displayPrice = billingCycle === 'yearly' ? Number((finalPrice * 12).toFixed(2)) : finalPrice;
            const displayOriginal = billingCycle === 'yearly' ? Number((basePrice * 12).toFixed(2)) : basePrice;

            return (
              <div
                key={tier._id || tier.id}
                className="glass-panel"
                onClick={() => handleViewTier(tier)}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  border: isTopTier
                    ? '2px solid rgba(250, 179, 25, 0.65)'
                    : isProTier
                    ? '1.5px solid rgba(14, 165, 233, 0.45)'
                    : '1px solid var(--border-color)',
                  background: isTopTier
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(253, 248, 238, 0.9) 100%)'
                    : 'var(--bg-surface)',
                  boxShadow: isTopTier ? '0 10px 30px -10px rgba(250, 179, 25, 0.25)' : 'var(--shadow-md)',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Popular / Sponsor Ribbon */}
                {isTopTier && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #fab319 0%, #e09b0b 100%)',
                    color: '#0a1f39',
                    padding: '0.25rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 4px 12px rgba(250, 179, 25, 0.4)'
                  }}>
                    <Crown size={12} /> Master Franchise / Sponsor
                  </div>
                )}

                {/* Top Badge & Level */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', marginTop: isTopTier ? '0.25rem' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', fontWeight: 800 }}>
                      LEVEL {tier.tierLevel || 1}
                    </span>
                    {tier.isActive === false && (
                      <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Inactive</span>
                    )}
                  </div>
                  {renderBadgePill(tier.uiAppearance?.badgeType)}
                </div>

                {/* Plan Title & Description */}
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
                  {tier.name}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', minHeight: '2.4em', lineHeight: '1.45' }}>
                  {tier.description || (tier.tierLevel === 1 ? 'Free platform presence for emerging agents & agencies.' : tier.tierLevel === 2 ? 'Enhanced visibility with verified branding and WhatsApp leads.' : 'Maximum platform prominence, card highlights, and top priority search.')}
                </p>

                {/* Pricing Box */}
                <div style={{
                  padding: '1.1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(10, 31, 57, 0.03)',
                  border: '1px solid rgba(10, 31, 57, 0.06)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  {discount > 0 ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          ${displayPrice}
                        </span>
                        <span style={{ fontSize: '1.05rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          ${displayOriginal}
                        </span>
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', fontWeight: 700 }}>
                          {discount}% OFF
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {currency} / {billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {basePrice === 0 ? 'Free' : `$${displayPrice}`}
                      </span>
                      {basePrice > 0 && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {currency} / {billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Core Perks List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '1.75rem' }}>
                  {/* Search AI Boost */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={12} />
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      Search & AI Weight: <strong>{tier.searchAndAI?.searchPriorityWeight ?? 1}x Boost</strong>
                    </span>
                  </div>

                  {/* WhatsApp Leads Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: tier.conversionAndLeads?.whatapps_button ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.06)',
                      color: tier.conversionAndLeads?.whatapps_button ? 'var(--success)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {tier.conversionAndLeads?.whatapps_button ? <Check size={12} /> : <X size={12} />}
                    </div>
                    <span style={{ color: tier.conversionAndLeads?.whatapps_button ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      Direct WhatsApp Lead Routing
                    </span>
                  </div>

                  {/* Native Lead Alerts */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: tier.conversionAndLeads?.enableNativeLeadNotifications ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.06)',
                      color: tier.conversionAndLeads?.enableNativeLeadNotifications ? 'var(--success)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {tier.conversionAndLeads?.enableNativeLeadNotifications ? <Check size={12} /> : <X size={12} />}
                    </div>
                    <span style={{ color: tier.conversionAndLeads?.enableNativeLeadNotifications ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      Native Instant Lead Notifications
                    </span>
                  </div>

                  {/* Card Highlight Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: tier.uiAppearance?.hasCardHighlight ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.06)',
                      color: tier.uiAppearance?.hasCardHighlight ? 'var(--success)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {tier.uiAppearance?.hasCardHighlight ? <Check size={12} /> : <X size={12} />}
                    </div>
                    <span style={{ color: tier.uiAppearance?.hasCardHighlight ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      Featured Portal Card Highlight
                    </span>
                  </div>

                  {/* Shimmer Animation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: tier.uiAppearance?.enableShimmerAnimation ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.06)',
                      color: tier.uiAppearance?.enableShimmerAnimation ? 'var(--success)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {tier.uiAppearance?.enableShimmerAnimation ? <Check size={12} /> : <X size={12} />}
                    </div>
                    <span style={{ color: tier.uiAppearance?.enableShimmerAnimation ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      Live Shimmering Glow Effect
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, gap: '0.4rem', justifyContent: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewTier(tier);
                    }}
                  >
                    <Eye size={14} /> Specs
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ gap: '0.4rem', justifyContent: 'center', padding: '0.55rem 0.95rem' }}
                    onClick={(e) => handleOpenEdit(tier, e)}
                    title="Edit Tier Configuration"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPARISON MATRIX TABLE VIEW */
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden'
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
                  <th style={{ padding: '1rem 1.25rem' }}>Tier Plan</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Level</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Base Price</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Discount</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Final Price</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Search AI Weight</th>
                  <th style={{ padding: '1rem 1.25rem' }}>UI Badge</th>
                  <th style={{ padding: '1rem 1.25rem' }}>WhatsApp</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Highlight</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTiers.map((tier) => {
                  const { basePrice, discount, finalPrice, currency } = getTierPricing(tier);
                  return (
                    <tr
                      key={tier._id || tier.id}
                      onClick={() => handleViewTier(tier)}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(250, 179, 25, 0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{tier.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tier.description || 'Configured plan'}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                          Level {tier.tierLevel || 1}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        ${basePrice} {currency}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {discount > 0 ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                            {discount}% OFF
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ${finalPrice} {currency}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                          {tier.searchAndAI?.searchPriorityWeight ?? 1}x Weight
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {renderBadgePill(tier.uiAppearance?.badgeType)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {tier.conversionAndLeads?.whatapps_button ? (
                          <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                            <Check size={14} /> Enabled
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {tier.uiAppearance?.hasCardHighlight ? (
                          <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 700 }}>
                            <Sparkles size={14} /> Highlight
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={`badge ${tier.isActive !== false ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.72rem' }}>
                          {tier.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleViewTier(tier)}
                            title="Inspect Tier Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={(e) => handleOpenEdit(tier, e)}
                            title="Edit Tier Configuration"
                            style={{ color: 'var(--primary)' }}
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TIER SPECIFICATION DRAWER (GET /admin/tiers/:id)                       */}
      {/* ========================================================================= */}
      {selectedTier && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedTier(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Layers size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Tier Configuration Details
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setSelectedTier(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              {drawerLoading ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--primary)' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Retrieving live tier specifications from server...</p>
                </div>
              ) : (
                <>
                  {/* Header Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.12) 0%, rgba(10, 31, 57, 0.04) 100%)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="badge badge-primary">LEVEL {selectedTier.tierLevel || 1}</span>
                        <span className={`badge ${selectedTier.isActive !== false ? 'badge-success' : 'badge-secondary'}`}>
                          {selectedTier.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {renderBadgePill(selectedTier.uiAppearance?.badgeType)}
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0' }}>
                      {selectedTier.name}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                      {selectedTier.description || 'Standard platform tier subscription configuration.'}
                    </p>
                  </div>

                  {/* Pricing Structure */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                      Pricing & Discount Matrix
                    </h4>
                    {(() => {
                      const { basePrice, discount, finalPrice, currency } = getTierPricing(selectedTier);
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                          <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Original Price</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                              ${basePrice} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>{currency}</span>
                            </div>
                          </div>
                          <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Discount</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: discount > 0 ? '#b47404' : 'var(--text-primary)', marginTop: '0.2rem' }}>
                              {discount}%
                            </div>
                          </div>
                          <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                            <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>Final Price</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                              ${finalPrice} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#047857' }}>{currency}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Full Privileges Matrix */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                      Privileges & Feature Capabilities
                    </h4>
                    <div style={{
                      background: 'rgba(0,0,0,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      fontSize: '0.82rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Search Priority Weight</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTier.searchAndAI?.searchPriorityWeight ?? 1}x Boost</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Badge Type</span>
                        <span>{renderBadgePill(selectedTier.uiAppearance?.badgeType)}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Shimmer Animation Glow</span>
                        <span style={{ fontWeight: 600, color: selectedTier.uiAppearance?.enableShimmerAnimation ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedTier.uiAppearance?.enableShimmerAnimation ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Card Highlight Style</span>
                        <span style={{ fontWeight: 600, color: selectedTier.uiAppearance?.hasCardHighlight ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedTier.uiAppearance?.hasCardHighlight ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>WhatsApp Leads Button</span>
                        <span style={{ fontWeight: 600, color: selectedTier.conversionAndLeads?.whatapps_button ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedTier.conversionAndLeads?.whatapps_button ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Native Lead Push Notifications</span>
                        <span style={{ fontWeight: 600, color: selectedTier.conversionAndLeads?.enableNativeLeadNotifications ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedTier.conversionAndLeads?.enableNativeLeadNotifications ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>External Webview Routing</span>
                        <span style={{ fontWeight: 600, color: selectedTier.conversionAndLeads?.external_webview ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedTier.conversionAndLeads?.external_webview ? 'Allowed' : 'Restricted'}
                        </span>
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
                    <div><strong>System ID:</strong> {selectedTier._id || selectedTier.id}</div>
                    <div style={{ marginTop: '0.2rem' }}><strong>Created:</strong> {selectedTier.createdAt ? new Date(selectedTier.createdAt).toLocaleString() : 'N/A'}</div>
                    <div style={{ marginTop: '0.2rem' }}><strong>Last Updated:</strong> {selectedTier.updatedAt ? new Date(selectedTier.updatedAt).toLocaleString() : 'N/A'}</div>
                  </div>
                </>
              )}
            </div>

            <div className="drawer-footer" style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: '#faf8f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedTier(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const tierToEdit = selectedTier;
                  setSelectedTier(null);
                  handleOpenEdit(tierToEdit);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Edit2 size={15} /> Edit Configuration
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 6. EDIT TIER MODAL (PUT /admin/tiers/edit/:id)                             */}
      {/* ========================================================================= */}
      {editingTier && createPortal(
        <div className="modal-overlay" onClick={() => !editLoading && setEditingTier(null)}>
          <form
            className="modal-content"
            style={{
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onSubmit={handleEditSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              background: '#faf8f5',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Edit Tier Configuration
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Level {editingTier.tierLevel || 1} • {editingTier.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !editLoading && setEditingTier(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '1.25rem'
            }}>
              {/* Basic Details Section */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  General Tier Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Tier Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Tier 2 — Pro"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Description
                    </label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="e.g. Professional tier for active agents with direct leads and blue badge."
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tier Active Status
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Enable or disable this subscription plan across the platform
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={(e) => setFormIsActive(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: formIsActive ? 'var(--success)' : 'var(--text-muted)' }}>
                        {formIsActive ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Pricing & Discounts Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Pricing & Discounts
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Base Price (USD) <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        style={{ paddingLeft: '1.75rem' }}
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Discount Percentage (%)
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="form-control"
                        style={{ paddingRight: '1.75rem' }}
                        value={formDiscountPercentage}
                        onChange={(e) => setFormDiscountPercentage(e.target.value)}
                        placeholder="0"
                      />
                      <span style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>%</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Calculated Final Price
                    </label>
                    <div style={{
                      padding: '0.55rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '38px',
                      boxSizing: 'border-box'
                    }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#047857' }}>
                        ${Number(formDiscountPercentage) > 0
                          ? (Number(formPrice) - (Number(formPrice) * Number(formDiscountPercentage)) / 100).toFixed(2)
                          : Number(formPrice || 0).toFixed(2)} USD
                      </span>
                      {Number(formDiscountPercentage) > 0 && (
                        <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                          -{formDiscountPercentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search AI Priority Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Search & AI Priority Weight
                </h4>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    Algorithm Search Boost Multiplier (searchPriorityWeight)
                  </label>
                  <select
                    className="form-control"
                    value={formSearchPriorityWeight}
                    onChange={(e) => setFormSearchPriorityWeight(Number(e.target.value))}
                  >
                    <option value={1}>1.0x — Standard Weight (Basic Tier 1)</option>
                    <option value={2}>2.0x — Double Weight (Pro Tier 2)</option>
                    <option value={3}>3.0x — Maximum Triple Weight (Founding Sponsor Tier 3)</option>
                    <option value={4}>4.0x — Custom High Weight</option>
                    <option value={5}>5.0x — Custom Enterprise Weight</option>
                  </select>
                </div>
              </div>

              {/* UI Appearance & Badges Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  UI Appearance & Badges
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Profile & Card Badge (badgeType)
                    </label>
                    <select
                      className="form-control"
                      value={formBadgeType}
                      onChange={(e) => setFormBadgeType(e.target.value)}
                    >
                      <option value="NONE">NONE — Standard (No Badge)</option>
                      <option value="BLUE_CHECKMARK">BLUE_CHECKMARK — Blue Verified Checkmark</option>
                      <option value="GOLDEN_STAR">GOLDEN_STAR — Golden Star Sponsor</option>
                    </select>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Featured Card Highlight (hasCardHighlight)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Add an elevated border and gold background glow to property & agent cards
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formHasCardHighlight}
                      onChange={(e) => setFormHasCardHighlight(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Live Shimmer Animation (enableShimmerAnimation)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Animate badges and premium cards with a shimmering golden light beam
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formEnableShimmerAnimation}
                      onChange={(e) => setFormEnableShimmerAnimation(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Conversion & Leads Features Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Conversion & Lead Features
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Direct WhatsApp Leads Button (whatapps_button)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Allows visitors to start a WhatsApp inquiry chat directly with the agent
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formWhatappsButton}
                      onChange={(e) => setFormWhatappsButton(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Native Push Lead Notifications (enableNativeLeadNotifications)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Real-time push notifications delivered directly to the agent mobile/web app
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formEnableNativeLeadNotifications}
                      onChange={(e) => setFormEnableNativeLeadNotifications(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        External Webview Access (external_webview)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Open developer websites and VR 3D tours within integrated webview
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formExternalWebview}
                      onChange={(e) => setFormExternalWebview(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              background: '#faf8f5',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.75rem',
              flexShrink: 0
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={editLoading}
                onClick={() => setEditingTier(null)}
                style={{ padding: '0.55rem 1.2rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.35rem', fontWeight: 700 }}
              >
                {editLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save Tier Changes
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

