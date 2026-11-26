import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import { getCookie } from '../utils/cookies';
import {
  Search,
  Filter,
  Building2,
  Home,
  MapPin,
  DollarSign,
  Globe,
  Phone,
  Mail,
  ExternalLink,
  MessageCircle,
  Check,
  X,
  RefreshCw,
  Loader2,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Image as ImageIcon,
  Star,
  Award,
  Sparkles,
  Layers,
  Calendar,
  Hash,
  Copy,
  Bed,
  Bath,
  Maximize2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function PropertyManagement() {
  const { adminUser } = useStateContext();

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';
  const imageBaseUrl = import.meta.env.VITE_IMAGE_URL || (baseUrl ? baseUrl.replace(/\/api\/?$/, '') : '') || 'https://mobappssolutiondevelopment.com/kleverProp';

  // API State (Only 2 endpoints: Get All Properties & Get By ID)
  const [propertiesList, setPropertiesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination State - Default: 20 per page as per API spec
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  });

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All'); // 'All' | 'sale' | 'rent'
  const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'Apartment' | 'House' | etc.
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal State for Property Inspection (GET /api/admin/properties/:id)
  const [selectedProp, setSelectedProp] = useState(null);
  const [selectedPropDetails, setSelectedPropDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [detailLang, setDetailLang] = useState('en'); // 'en' | 'es'

  // Debounce ref for search
  const searchTimeoutRef = useRef(null);

  // Resilient Auth Token Retriever
  const getAuthToken = useCallback(() => {
    try {
      if (adminUser?.token) return adminUser.token;
      const c = getCookie('klever_auth_data');
      if (c) {
        const parsed = JSON.parse(c);
        if (parsed?.token) return parsed.token;
      }
      const directToken = getCookie('token');
      if (directToken) return directToken;
      const ls = localStorage.getItem('token');
      if (ls) return ls;
    } catch {
      // quiet fallback
    }
    return '';
  }, [adminUser?.token]);

  // Helper to format image and logo URLs cleanly with VITE_IMAGE_URL
  const formatImageUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return null;
    let clean = url.trim().replace(/\\/g, '/');
    if (clean.startsWith('blob:') || clean.startsWith('data:')) return clean;
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/i.test(clean)) {
      clean = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/, '');
    }
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    return `${imageBaseUrl.replace(/\/+$/, '')}/${clean.replace(/^\/+/, '')}`;
  }, [imageBaseUrl]);

  // Helper to safely extract all photos of a property
  const getPropertyPhotos = useCallback((prop) => {
    if (!prop) return [];
    const rawPhotos = prop.photos || prop.images || (prop.image ? [prop.image] : []) || (prop.photo ? [prop.photo] : []);
    if (!Array.isArray(rawPhotos)) {
      if (typeof rawPhotos === 'string') {
        const fmt = formatImageUrl(rawPhotos);
        return fmt ? [fmt] : [];
      }
      return [];
    }
    return rawPhotos
      .map(p => {
        if (!p) return null;
        if (typeof p === 'string') return formatImageUrl(p);
        if (typeof p === 'object') return formatImageUrl(p.url || p.path || p.secure_url || p.src || p.location);
        return null;
      })
      .filter(Boolean);
  }, [formatImageUrl]);

  // Helper to get localized property title
  const getPropertyTitle = (title, lang = 'en') => {
    if (!title) return 'Property Asset';
    if (typeof title === 'string') return title;
    if (lang === 'es' && title.es) return title.es;
    return title.en || title.es || Object.values(title)[0] || 'Property Asset';
  };

  // Helper to get localized property description
  const getPropertyDescription = (desc, lang = 'en') => {
    if (!desc) return '';
    if (typeof desc === 'string') return desc;
    if (lang === 'es' && desc.es) return desc.es;
    return desc.en || desc.es || Object.values(desc)[0] || '';
  };

  // Helper to extract features array
  const getPropertyFeatures = (features, lang = 'en') => {
    if (!features) return [];
    if (Array.isArray(features)) {
      return features.map(f => (typeof f === 'object' ? (f.name?.en || f.name?.es || f.name || String(f)) : String(f)));
    }
    if (typeof features === 'object') {
      const list = lang === 'es' ? (features.es || features.en) : (features.en || features.es);
      if (Array.isArray(list)) return list;
    }
    return [];
  };

  // Helper to format clean full location
  const getPropertyLocation = (prop) => {
    if (!prop) return 'Dominican Republic';
    if (typeof prop.location === 'string') return prop.location;
    if (prop.location && typeof prop.location === 'object') {
      const parts = [prop.location.address, prop.location.area, prop.location.city, prop.location.state, prop.location.country].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    const countryName = prop.country_name?.en || prop.country_name?.es || prop.country || 'Dominican Republic';
    const parts = [prop.address, prop.urbanisation, prop.town, prop.region, countryName].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : countryName;
  };

  // Helper to format price with currency symbol
  const formatPrice = (price, currency = 'USD') => {
    if (price === null || price === undefined || isNaN(Number(price))) return '$0 USD';
    const num = Number(price);
    const currStr = String(currency || 'USD').toUpperCase();
    if (currStr === 'DOP' || currStr === 'RD$') {
      return `RD$ ${num.toLocaleString()}`;
    }
    if (currStr === 'EUR' || currStr === '€') {
      return `€${num.toLocaleString()} EUR`;
    }
    return `$${num.toLocaleString()} USD`;
  };

  // Helper to format surface area
  const formatSurfaceArea = (surfaceArea) => {
    if (!surfaceArea) return null;
    if (typeof surfaceArea === 'number') return `${surfaceArea} m²`;
    if (typeof surfaceArea === 'object') {
      const val = surfaceArea.built || surfaceArea.total || surfaceArea.plot || surfaceArea.size;
      if (val) return `${val} m²`;
    }
    return String(surfaceArea);
  };

  // =========================================================================
  // API 1: GET ALL PROPERTIES (GET /api/admin/properties?page=X&limit=Y)
  // =========================================================================
  const fetchProperties = useCallback(async (targetPage = currentPage, targetLimit = limit, search = searchTerm) => {
    const token = getAuthToken();
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = {
        page: targetPage,
        limit: targetLimit
      };
      if (search && search.trim()) {
        params.search = search.trim();
      }

      const res = await axios.get(`${baseUrl}/admin/properties`, { headers, params });

      const respData = res.data?.data || res.data || {};
      const rawProps = respData.properties || (Array.isArray(respData) ? respData : []);

      const totalCount = respData.total ?? respData.totalCount ?? respData.count ?? rawProps.length ?? 0;
      const totalPages = respData.pages ?? Math.ceil(totalCount / targetLimit) ?? 1;
      const serverPage = respData.page ?? targetPage;
      const serverLimit = respData.limit ?? targetLimit;

      setPropertiesList(rawProps);
      setPagination({
        total: Number(totalCount) || 0,
        page: Number(serverPage) || targetPage,
        limit: Number(serverLimit) || targetLimit,
        pages: Number(totalPages) || 1
      });
      setCurrentPage(Number(serverPage) || targetPage);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
      toast.error(err.response?.data?.message || 'Failed to retrieve properties from server');
      setPropertiesList([]);
      setPagination({ total: 0, page: 1, limit: targetLimit, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, currentPage, limit, searchTerm, getAuthToken]);

  // Initial Data Load
  useEffect(() => {
    fetchProperties(currentPage, limit, searchTerm);
  }, [currentPage, limit]);

  // Handle Search Input Change (Debounced)
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchProperties(1, limit, val);
    }, 350);
  };

  // Handle Page Change
  const handlePageChange = (newPage) => {
    const maxPages = pagination.pages || 1;
    if (newPage < 1 || newPage > maxPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchProperties(newPage, limit, searchTerm);
  };

  // Handle Limit Change (e.g. 10, 20, 50, 100)
  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10) || 20;
    setLimit(newLimit);
    setCurrentPage(1);
    fetchProperties(1, newLimit, searchTerm);
  };

  // =========================================================================
  // API 2: GET PROPERTY BY ID (GET /api/admin/properties/:id)
  // =========================================================================
  const handleInspectProperty = async (prop) => {
    const propId = prop._id || prop.id;
    if (!propId) return;

    setSelectedProp(prop);
    setSelectedPropDetails(null);
    setSelectedImageIndex(0);
    setDetailLang('en');
    setDetailLoading(true);

    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${baseUrl}/admin/properties/${propId}`, { headers });
      const detailed = res.data?.data?.property || res.data?.data || res.data?.property || res.data;
      if (detailed && typeof detailed === 'object') {
        setSelectedPropDetails(detailed);
      }
    } catch (err) {
      console.error('Failed to load property details:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch detailed property specifications');
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter properties client-side by Action and Property Type if applied
  const filteredProperties = useMemo(() => {
    return propertiesList.filter(prop => {
      if (actionFilter !== 'All') {
        const act = (prop.action || prop.action_es || '').toLowerCase();
        if (!act.includes(actionFilter.toLowerCase())) return false;
      }
      if (typeFilter !== 'All') {
        const t = (prop.type || prop.type_es || prop.propertyType || '').toLowerCase();
        if (!t.includes(typeFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [propertiesList, actionFilter, typeFilter]);

  // Unique property types for filter dropdown
  const uniquePropertyTypes = useMemo(() => {
    const set = new Set();
    propertiesList.forEach(p => {
      const t = p.type || p.type_es || p.propertyType;
      if (t && typeof t === 'string') set.add(t);
    });
    return Array.from(set);
  }, [propertiesList]);

  // Active property details merged with basic prop
  const activeDetailProp = selectedPropDetails || selectedProp;
  const activePhotos = useMemo(() => getPropertyPhotos(activeDetailProp), [activeDetailProp, getPropertyPhotos]);
  const currentPreviewImage = activePhotos[selectedImageIndex] || activePhotos[0] || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80';

  // Keyboard navigation for image carousel in modal
  useEffect(() => {
    if (!selectedProp || activePhotos.length <= 1) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex(prev => (prev === 0 ? activePhotos.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedImageIndex(prev => (prev === activePhotos.length - 1 ? 0 : prev + 1));
      } else if (e.key === 'Escape') {
        setSelectedProp(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProp, activePhotos.length]);

  // Pagination calculation
  const totalPages = pagination.pages || Math.ceil((pagination.total || 0) / limit) || 1;
  const fromIndex = pagination.total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const toIndex = Math.min(currentPage * limit, pagination.total || 0);

  // Generate page numbers for pagination
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

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(250, 179, 25, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Home size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Property Directory</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.15rem 0 0' }}>
                Browse verified property listings, inspect real-time XML feeds, and analyze multi-currency real estate assets
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Grid or Table */}
          <div style={{ display: 'flex', background: '#e9ecef', borderRadius: '8px', padding: '3px' }}>
            <button
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
              style={{ padding: '0.35rem 0.65rem', height: '32px', borderRadius: '6px' }}
              title="Grid Card View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('table')}
              style={{ padding: '0.35rem 0.65rem', height: '32px', borderRadius: '6px' }}
              title="Listing Table View"
            >
              <List size={15} />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            className="btn btn-secondary"
            onClick={() => fetchProperties(currentPage, limit, searchTerm)}
            disabled={loading}
            title="Refresh Properties from Server"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by title, reference code, town, address, or agency..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Action Filter (Sale / Rent) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            className="form-control form-select"
            style={{ width: '130px', padding: '0.5rem 1.8rem 0.5rem 0.85rem', fontSize: '0.85rem' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="All">All Deals</option>
            <option value="sale">For Sale</option>
            <option value="rent">For Rent</option>
          </select>
        </div>

        {/* Property Type Filter */}
        {uniquePropertyTypes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <select
              className="form-control form-select"
              style={{ width: '150px', padding: '0.5rem 1.8rem 0.5rem 0.85rem', fontSize: '0.85rem' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              {uniquePropertyTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Reset Filter Button */}
        {(searchTerm || actionFilter !== 'All' || typeFilter !== 'All') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearchTerm('');
              setActionFilter('All');
              setTypeFilter('All');
              fetchProperties(1, limit, '');
            }}
            style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Content: Grid or Table View */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>Loading properties from server...</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredProperties.length > 0 ? (
            filteredProperties.map((prop) => {
              const propId = prop._id || prop.id;
              const photos = getPropertyPhotos(prop);
              const mainPhoto = photos[0] || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80';
              const title = getPropertyTitle(prop.title);
              const location = getPropertyLocation(prop);
              const priceDisplay = formatPrice(prop.price, prop.currency);
              const surface = formatSurfaceArea(prop.surface_area);

              return (
                <div
                  key={propId}
                  className="glass-panel"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleInspectProperty(prop)}
                >
                  {/* Property Image Banner */}
                  <div style={{ height: '200px', overflow: 'hidden', background: '#0e1731', position: 'relative' }}>
                    <img
                      src={mainPhoto}
                      alt={title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80';
                      }}
                    />

                    {/* Top Overlay: Reference & Action Badges */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.4rem', zIndex: 3, flexWrap: 'wrap' }}>
                      {prop.ref && (
                        <span className="badge badge-primary" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.3)', fontWeight: 700 }}>
                          {prop.ref}
                        </span>
                      )}
                      {(prop.action || prop.action_es) && (
                        <span className="badge badge-secondary" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.3)', textTransform: 'uppercase' }}>
                          {prop.action_es || prop.action}
                        </span>
                      )}
                    </div>

                    {/* Status Badge on Top Right */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 3 }}>
                      <span className={`badge ${String(prop.status || '').toLowerCase().includes('avail') ? 'badge-success' : 'badge-danger'}`} style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                        {prop.status_es || prop.status || 'Available'}
                      </span>
                    </div>

                    {/* Photos Count Badge */}
                    {photos.length > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          zIndex: 3
                        }}
                      >
                        <ImageIcon size={12} /> {photos.length} Photos
                      </span>
                    )}
                  </div>

                  {/* Property Body */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {/* Agency Attribution Header */}
                    {prop.agency && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                          {prop.agency.logo ? (
                            <img
                              src={formatImageUrl(prop.agency.logo)}
                              alt={prop.agency.name || 'Agency'}
                              style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'contain', background: '#ffffff' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <Building2 size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prop.agency.name}
                          </span>
                        </div>
                        {prop.agency.isFoundingSponsor && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 5px' }} title="Founding Sponsor Agency">
                            ★ Sponsor
                          </span>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <h4 style={{ fontSize: '0.975rem', fontWeight: 800, margin: 0, lineHeight: 1.35, color: 'var(--text-primary)' }}>
                      {title}
                    </h4>

                    {/* Location */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location}</span>
                    </div>

                    {/* Property Specs (Beds, Baths, Area, Type) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {prop.beds != null && (
                        <span><strong>{prop.beds}</strong> Beds</span>
                      )}
                      {prop.baths != null && (
                        <span><strong>{prop.baths}</strong> Baths</span>
                      )}
                      {surface && (
                        <span><strong>{surface}</strong></span>
                      )}
                      {(prop.type || prop.type_es) && (
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{prop.type_es || prop.type}</span>
                      )}
                    </div>

                    {/* Card Price & Action Button Footer */}
                    <div style={{ marginTop: 'auto', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>PRICE</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--primary)', fontWeight: 800 }}>
                          {priceDisplay}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectProperty(prop);
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                        title="Inspect property specifications (GET /api/admin/properties/{id})"
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No properties found matching your selection criteria.
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Property Asset</th>
                  <th>Location</th>
                  <th>Type & Deal</th>
                  <th>Rooms & Area</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.length > 0 ? (
                  filteredProperties.map((prop) => {
                    const propId = prop._id || prop.id;
                    const photos = getPropertyPhotos(prop);
                    const mainPhoto = photos[0] || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80';
                    const title = getPropertyTitle(prop.title);
                    const location = getPropertyLocation(prop);
                    const priceDisplay = formatPrice(prop.price, prop.currency);
                    const surface = formatSurfaceArea(prop.surface_area);

                    return (
                      <tr
                        key={propId}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleInspectProperty(prop)}
                      >
                        {/* Property Column */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <img
                              src={mainPhoto}
                              alt={title}
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                border: '1px solid var(--border-color)',
                                flexShrink: 0
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                {prop.ref && (
                                  <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                    {prop.ref}
                                  </span>
                                )}
                                {prop.agency?.name && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {prop.agency.name}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.3 }}>
                                {title}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Location Column */}
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {location}
                            </span>
                          </div>
                        </td>

                        {/* Type & Deal Column */}
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                              {prop.type_es || prop.type || 'Apartment'}
                            </span>
                            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                              {prop.action_es || prop.action || 'Sale'}
                            </span>
                          </div>
                        </td>

                        {/* Rooms & Area Column */}
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div>
                            {prop.beds != null && <span>🛏️ {prop.beds} Beds </span>}
                            {prop.baths != null && <span>🚿 {prop.baths} Baths</span>}
                          </div>
                          {surface && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              📐 {surface}
                            </div>
                          )}
                        </td>

                        {/* Price Column */}
                        <td>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 800 }}>
                            {priceDisplay}
                          </strong>
                        </td>

                        {/* Status Column */}
                        <td>
                          <span className={`badge ${String(prop.status || '').toLowerCase().includes('avail') ? 'badge-success' : 'badge-danger'}`}>
                            {prop.status_es || prop.status || 'Available'}
                          </span>
                        </td>

                        {/* Action Column */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectProperty(prop);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            title="Inspect details (GET /api/admin/properties/{id})"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No properties found matching your selection criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="glass-panel flex-between" style={{ padding: '0.85rem 1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Left: Summary & Per-Page Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{fromIndex}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{toIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> properties
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Per page:</span>
            <select
              className="form-control form-select"
              style={{ width: '75px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem', height: '32px' }}
              value={limit}
              onChange={handleLimitChange}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
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

          {/* Page Numbers */}
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
                fontWeight: pageNum === currentPage ? 800 : 500
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

      {/* ========================================================================= */}
      {/* PROPERTY DETAIL MODAL (GET /api/admin/properties/:id) */}
      {/* ========================================================================= */}
      {selectedProp && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedProp(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '840px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
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
                    Property Specifications & Inspection
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Verified listing data from agency feed • GET /api/admin/properties/{selectedProp._id || selectedProp.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setSelectedProp(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
              {detailLoading ? (
                <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--primary)' }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Retrieving property details from server...</p>
                </div>
              ) : (
                <>
                  {/* Photo Carousel & Slider */}
                  <div style={{
                    width: '100%',
                    height: '280px',
                    minHeight: '280px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid var(--border-color)',
                    background: '#0e1731',
                    flexShrink: 0
                  }}>
                    <img
                      key={selectedImageIndex}
                      src={currentPreviewImage}
                      alt={getPropertyTitle(activeDetailProp?.title, detailLang)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        animation: 'fadeIn 0.25s ease-in-out'
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80';
                      }}
                    />

                    {/* Top Left Badges: Ref & Action */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '0.45rem', zIndex: 3, flexWrap: 'wrap' }}>
                      {activeDetailProp?.ref && (
                        <span className="badge badge-primary" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)', fontWeight: 800 }}>
                          Ref: {activeDetailProp.ref}
                        </span>
                      )}
                      {(activeDetailProp?.action || activeDetailProp?.action_es) && (
                        <span className="badge badge-secondary" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)', textTransform: 'uppercase' }}>
                          {activeDetailProp.action_es || activeDetailProp.action}
                        </span>
                      )}
                    </div>

                    {/* Top Right: Status Badge */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 3 }}>
                      <span className={`badge ${String(activeDetailProp?.status || '').toLowerCase().includes('avail') ? 'badge-success' : 'badge-danger'}`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        {activeDetailProp?.status_es || activeDetailProp?.status || 'Available'}
                      </span>
                    </div>

                    {/* Left/Right Slider Navigation */}
                    {activePhotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex(prev => (prev === 0 ? activePhotos.length - 1 : prev - 1))}
                          aria-label="Previous photo"
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 4,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                          }}
                        >
                          <ChevronLeft size={20} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex(prev => (prev === activePhotos.length - 1 ? 0 : prev + 1))}
                          aria-label="Next photo"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 4,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>

                        {/* Slide Counter & Dots */}
                        <div style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '0',
                          right: '0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0 14px',
                          zIndex: 3,
                          pointerEvents: 'none'
                        }}>
                          <div style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
                            {activePhotos.slice(0, 12).map((_, dotIdx) => (
                              <button
                                key={dotIdx}
                                type="button"
                                onClick={() => setSelectedImageIndex(dotIdx)}
                                style={{
                                  width: selectedImageIndex === dotIdx ? '18px' : '6px',
                                  height: '6px',
                                  borderRadius: '3px',
                                  background: selectedImageIndex === dotIdx ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  transition: 'all 0.25s ease'
                                }}
                              />
                            ))}
                          </div>

                          <span style={{
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(4px)',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '12px'
                          }}>
                            {selectedImageIndex + 1} / {activePhotos.length}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {activePhotos.length > 1 && (
                    <div style={{
                      display: 'flex',
                      gap: '0.65rem',
                      overflowX: 'auto',
                      padding: '8px 10px',
                      background: '#faf8f5',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      flexShrink: 0,
                      alignItems: 'center',
                      scrollbarWidth: 'thin'
                    }}>
                      {activePhotos.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          style={{
                            width: '74px',
                            height: '52px',
                            minWidth: '74px',
                            minHeight: '52px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            padding: 0,
                            border: selectedImageIndex === idx ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                            boxShadow: selectedImageIndex === idx ? '0 0 0 2px rgba(250, 179, 25, 0.4)' : 'none',
                            opacity: selectedImageIndex === idx ? 1 : 0.65,
                            cursor: 'pointer',
                            flexShrink: 0,
                            background: '#0e1731'
                          }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Thumbnail ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Title & Reference */}
                  <div>
                    {activeDetailProp?.ref && (
                      <div style={{ marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Reference: <code style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{activeDetailProp.ref}</code>
                        </span>
                      </div>
                    )}

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                      {getPropertyTitle(activeDetailProp?.title, detailLang)}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span>{getPropertyLocation(activeDetailProp)}</span>
                    </div>
                  </div>

                  {/* Price Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.12) 0%, rgba(255, 255, 255, 0.95) 100%)',
                    border: '1.5px solid rgba(250, 179, 25, 0.35)',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        LISTING PRICE
                      </span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.2 }}>
                        {formatPrice(activeDetailProp?.price, activeDetailProp?.currency)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {activeDetailProp?.whatsapp && (
                        <a
                          href={`https://wa.me/${String(activeDetailProp.whatsapp).replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)' }}
                          title="Contact via WhatsApp"
                        >
                          <MessageCircle size={14} style={{ color: '#25D366' }} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {activeDetailProp?.url && (
                        <a
                          href={activeDetailProp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          title="Open original listing website"
                        >
                          <ExternalLink size={14} />
                          <span>View on Portal</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Key Specifications Grid */}
                  <div style={{
                    background: '#faf8f5',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.15rem'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.85rem' }}>
                      Property Specifications
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>PROPERTY TYPE</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {activeDetailProp?.type_es || activeDetailProp?.type || 'Apartment'}
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>DEAL ACTION</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {activeDetailProp?.action_es || activeDetailProp?.action || 'Sale'}
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>BEDROOMS</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          🛏️ {activeDetailProp?.beds != null ? activeDetailProp.beds : '—'} Beds
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>BATHROOMS</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          🚿 {activeDetailProp?.baths != null ? activeDetailProp.baths : '—'} Baths
                        </strong>
                      </div>

                      {activeDetailProp?.floors != null && (
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>FLOORS / NIVELES</span>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            🏢 {activeDetailProp.floors}
                          </strong>
                        </div>
                      )}

                      {formatSurfaceArea(activeDetailProp?.surface_area) && (
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>BUILT SURFACE AREA</span>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            📐 {formatSurfaceArea(activeDetailProp.surface_area)}
                          </strong>
                        </div>
                      )}

                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>STATUS</span>
                        <span className={`badge ${String(activeDetailProp?.status || '').toLowerCase().includes('avail') ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: '0.2rem' }}>
                          {activeDetailProp?.status_es || activeDetailProp?.status || 'Available'}
                        </span>
                      </div>

                      {activeDetailProp?.new_development !== undefined && (
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>DEVELOPMENT TYPE</span>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {activeDetailProp.new_development ? 'New Construction' : 'Resale Asset'}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agency Attribution Card */}
                  {activeDetailProp?.agency && (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.15rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Listing Agency Brokerage
                        </span>
                        {activeDetailProp.agency.isFoundingSponsor && (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Star size={11} fill="currentColor" /> Founding Sponsor
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {activeDetailProp.agency.logo ? (
                          <img
                            src={formatImageUrl(activeDetailProp.agency.logo)}
                            alt={activeDetailProp.agency.name || 'Agency'}
                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff', border: '1px solid var(--border-color)', padding: '2px' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(250, 179, 25, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={24} />
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <h4 style={{ margin: '0 0 0.2rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {activeDetailProp.agency.name}
                          </h4>
                          {activeDetailProp.agency.website && (
                            <a
                              href={activeDetailProp.agency.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Globe size={13} />
                              <span>{activeDetailProp.agency.website.replace(/^https?:\/\//, '')}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Features & Amenities */}
                  {(() => {
                    const features = getPropertyFeatures(activeDetailProp?.features, detailLang);
                    if (features.length === 0) return null;
                    return (
                      <div>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
                          Features & Amenities ({features.length})
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {features.map((feat, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.78rem',
                                background: 'rgba(250, 179, 25, 0.1)',
                                color: '#b47404',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Check size={12} color="#b47404" />
                              <span>{feat}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Property Description */}
                  {(() => {
                    const desc = getPropertyDescription(activeDetailProp?.desc || activeDetailProp?.description, detailLang);
                    if (!desc) return null;
                    return (
                      <div>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
                          Detailed Description
                        </h4>
                        <div style={{
                          padding: '1rem 1.25rem',
                          background: '#faf8f5',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.85rem',
                          lineHeight: '1.65',
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-line',
                          maxHeight: '260px',
                          overflowY: 'auto'
                        }}>
                          {desc}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Location & Town Breakdown */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1rem',
                    fontSize: '0.8rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    {activeDetailProp?.urbanisation && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>URBANISATION</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{activeDetailProp.urbanisation}</strong>
                      </div>
                    )}
                    {activeDetailProp?.town && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TOWN / CITY</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{activeDetailProp.town}</strong>
                      </div>
                    )}
                    {activeDetailProp?.region && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>REGION / PROVINCE</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{activeDetailProp.region}</strong>
                      </div>
                    )}
                    {(activeDetailProp?.country_name || activeDetailProp?.country) && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>COUNTRY</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {activeDetailProp.country_name?.en || activeDetailProp.country_name?.es || activeDetailProp.country}
                        </strong>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: '#faf8f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedProp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
