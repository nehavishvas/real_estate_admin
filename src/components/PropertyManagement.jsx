import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import {
  Search,
  Filter,
  Plus,
  Home,
  Star,
  Trash2,
  Edit2,
  Copy,
  Layers,
  ArrowRight,
  MapPin,
  Tag,
  Info,
  Check,
  X,
  RefreshCw,
  Upload,
  Loader2,
  Building,
  DollarSign,
  User,
  Phone,
  Mail,
  Compass,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Image as ImageIcon,
  Sliders,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function PropertyManagement() {
  const {
    adminUser,
    addAuditLog: onAddAuditLog
  } = useStateContext();

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';

  // API Properties & Pagination State
  const [propertiesList, setPropertiesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores property ID during status toggle

  // View Mode: 'grid' or 'list' (table)
  const [viewMode, setViewMode] = useState('grid');

  // Pagination State - Default: 10 per page
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
  const [portalFilter, setPortalFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProp, setSelectedProp] = useState(null); // Basic prop for detail modal
  const [selectedPropDetails, setSelectedPropDetails] = useState(null); // Detailed prop from GET /admin/properties/:id
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  const [mergingProps, setMergingProps] = useState(null); // Array of 2 properties for side-by-side merge
  const [masterSelect, setMasterSelect] = useState(null); // 'left' or 'right'

  // Delete Property Confirmation State (DELETE /admin/properties/:id)
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Properties Form State (PUT /admin/properties/:id)
  const [editFormEnTitle, setEditFormEnTitle] = useState('');
  const [editFormEsTitle, setEditFormEsTitle] = useState('');
  const [editFormEnDescription, setEditFormEnDescription] = useState('');
  const [editFormEsDescription, setEditFormEsDescription] = useState('');
  const [editFormAddress, setEditFormAddress] = useState('');
  const [editFormArea, setEditFormArea] = useState('');
  const [editFormCity, setEditFormCity] = useState('');
  const [editFormState, setEditFormState] = useState('');
  const [editFormCountry, setEditFormCountry] = useState('Dominican Republic');
  const [editFormPincode, setEditFormPincode] = useState('');
  const [editFormLatitude, setEditFormLatitude] = useState('');
  const [editFormLongitude, setEditFormLongitude] = useState('');
  const [editFormPropertyType, setEditFormPropertyType] = useState('APARTMENT');
  const [editFormListingType, setEditFormListingType] = useState('BUY');
  const [editFormConstructionStatus, setEditFormConstructionStatus] = useState('Off-plan');
  const [editFormIsShortTermRentalAllowed, setEditFormIsShortTermRentalAllowed] = useState(false);
  const [editFormPriceDop, setEditFormPriceDop] = useState('');
  const [editFormPriceUsd, setEditFormPriceUsd] = useState('');
  const [editFormPriceEur, setEditFormPriceEur] = useState('');
  const [editFormBedrooms, setEditFormBedrooms] = useState(2);
  const [editFormBathrooms, setEditFormBathrooms] = useState(2);
  const [editFormSize, setEditFormSize] = useState(1200);
  const [editFormSizeUnit, setEditFormSizeUnit] = useState('sq ft');
  const [editFormFurnishedStatus, setEditFormFurnishedStatus] = useState('SEMI_FURNISHED');
  const [editFormSelectedAmenities, setEditFormSelectedAmenities] = useState([]);
  const [editFormOwnerName, setEditFormOwnerName] = useState('');
  const [editFormOwnerPhone, setEditFormOwnerPhone] = useState('');
  const [editFormOwnerEmail, setEditFormOwnerEmail] = useState('');
  const [editFormExistingImages, setEditFormExistingImages] = useState([]);
  const [removedExistingImages, setRemovedExistingImages] = useState([]);
  const [editFormNewImageFiles, setEditFormNewImageFiles] = useState([]);
  const [editFormNewImagePreviews, setEditFormNewImagePreviews] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormTab, setEditFormTab] = useState('en'); // 'en' | 'es'

  // Amenities API State (GET /admin/amenities)
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);

  // Add Properties Form State (POST /admin/properties/add)
  const [addFormEnTitle, setAddFormEnTitle] = useState('');
  const [addFormEsTitle, setAddFormEsTitle] = useState('');
  const [addFormEnDescription, setAddFormEnDescription] = useState('');
  const [addFormEsDescription, setAddFormEsDescription] = useState('');
  const [addFormAddress, setAddFormAddress] = useState('');
  const [addFormArea, setAddFormArea] = useState('');
  const [addFormCity, setAddFormCity] = useState('');
  const [addFormState, setAddFormState] = useState('');
  const [addFormCountry, setAddFormCountry] = useState('Dominican Republic');
  const [addFormPincode, setAddFormPincode] = useState('');
  const [addFormLatitude, setAddFormLatitude] = useState('');
  const [addFormLongitude, setAddFormLongitude] = useState('');
  const [addFormPropertyType, setAddFormPropertyType] = useState('APARTMENT');
  const [addFormListingType, setAddFormListingType] = useState('BUY');
  const [addFormConstructionStatus, setAddFormConstructionStatus] = useState('Off-plan');
  const [addFormIsShortTermRentalAllowed, setAddFormIsShortTermRentalAllowed] = useState(false);
  const [addFormPriceDop, setAddFormPriceDop] = useState('');
  const [addFormPriceUsd, setAddFormPriceUsd] = useState('');
  const [addFormPriceEur, setAddFormPriceEur] = useState('');
  const [addFormBedrooms, setAddFormBedrooms] = useState(2);
  const [addFormBathrooms, setAddFormBathrooms] = useState(2);
  const [addFormSize, setAddFormSize] = useState(1200);
  const [addFormSizeUnit, setAddFormSizeUnit] = useState('sq ft');
  const [addFormFurnishedStatus, setAddFormFurnishedStatus] = useState('SEMI_FURNISHED');
  const [addFormSelectedAmenities, setAddFormSelectedAmenities] = useState([]);
  const [addFormOwnerName, setAddFormOwnerName] = useState('');
  const [addFormOwnerPhone, setAddFormOwnerPhone] = useState('');
  const [addFormOwnerEmail, setAddFormOwnerEmail] = useState('');
  const [addFormImageFiles, setAddFormImageFiles] = useState([]);
  const [addFormImagePreviews, setAddFormImagePreviews] = useState([]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addFormTab, setAddFormTab] = useState('en'); // 'en' | 'es'

  // Search debounce ref
  const searchTimeoutRef = useRef(null);

  // Helpers to safely parse multilingual / nested property schema
  const toApiPropertyType = (type) => {
    if (!type) return 'APARTMENT';
    const str = String(type).trim().toUpperCase();
    if (str === 'APARTMENT') return 'APARTMENT';
    if (str === 'HOUSE') return 'HOUSE';
    if (str === 'LAND' || str.includes('SOLAR') || str.includes('TERRENO') || str.includes('PLOT')) return 'LAND';
    if (str.includes('OFFICE')) return 'OFFICE';
    if (str.includes('COMMERCIAL') || str.includes('LOCAL')) return 'COMMERCIAL';
    return str;
  };

  const normalizePropertyType = (type) => {
    if (!type) return 'Apartment';
    const str = String(type).trim().toUpperCase();
    if (str === 'APARTMENT') return 'Apartment';
    if (str === 'HOUSE') return 'House';
    if (str === 'LAND' || str.includes('SOLAR') || str.includes('TERRENO') || str.includes('PLOT')) return 'Land/Solar (Terreno)';
    if (str === 'OFFICE' || str === 'OFFICEE') return 'Office';
    if (str === 'COMMERCIAL' || str.includes('LOCAL')) return 'Commercial Local';
    return String(type);
  };

  const extractPrices = (rawPrice, rawObj = {}) => {
    let dop = null;
    let usd = null;
    let eur = null;

    const parseNum = (val) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'number') return isNaN(val) ? null : val;
      if (typeof val === 'string') {
        const clean = val.replace(/[^0-9.-]+/g, '');
        if (clean === '' || clean === '-' || clean === '.') return null;
        const num = Number(clean);
        return isNaN(num) ? null : num;
      }
      return null;
    };

    const tryExtractFromObj = (obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      if (dop === null) {
        dop = parseNum(obj.dop ?? obj.DOP ?? obj.priceDop ?? obj.price_dop ?? obj['price[dop]'] ?? obj.rd ?? obj.RD);
      }
      if (usd === null) {
        usd = parseNum(obj.usd ?? obj.USD ?? obj.priceUsd ?? obj.price_usd ?? obj['price[usd]'] ?? obj.dollar);
      }
      if (eur === null) {
        eur = parseNum(obj.eur ?? obj.EUR ?? obj.priceEur ?? obj.price_eur ?? obj['price[eur]'] ?? obj.euro);
      }
    };

    if (typeof rawPrice === 'string') {
      const trimmed = rawPrice.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          tryExtractFromObj(parsed);
        } catch {
          // not json
        }
      }
    }

    if (rawPrice && typeof rawPrice === 'object') {
      tryExtractFromObj(rawPrice);
      if (rawPrice.price && typeof rawPrice.price === 'object') {
        tryExtractFromObj(rawPrice.price);
      }
    } else if (usd === null && dop === null && eur === null) {
      const directNum = parseNum(rawPrice);
      if (directNum !== null && directNum > 0) {
        usd = directNum;
      }
    }

    if (rawObj && typeof rawObj === 'object') {
      tryExtractFromObj(rawObj);
      if (rawObj.price && typeof rawObj.price === 'object') {
        tryExtractFromObj(rawObj.price);
      }
      if (rawObj.pricing && typeof rawObj.pricing === 'object') {
        tryExtractFromObj(rawObj.pricing);
      }
      if (rawObj.prices && typeof rawObj.prices === 'object') {
        tryExtractFromObj(rawObj.prices);
      }
      if (usd === null && dop === null && eur === null) {
        const objPrice = parseNum(rawObj.price || rawObj.propertyPrice || rawObj.amount || rawObj.rent);
        if (objPrice !== null && objPrice > 0) {
          usd = objPrice;
        }
      }
    }

    return {
      dop: dop !== null && dop > 0 ? dop : null,
      usd: usd !== null && usd > 0 ? usd : null,
      eur: eur !== null && eur > 0 ? eur : null,
      raw: rawPrice
    };
  };

  const renderPriceBadges = (prop, isTable = false) => {
    const prices = prop?.prices || extractPrices(prop?.price, prop?.raw || prop || {});
    let primary = null;
    if (prices.usd != null && prices.usd > 0) {
      primary = { text: `$${prices.usd.toLocaleString()}`, currency: 'usd' };
    } else if (prices.dop != null && prices.dop > 0) {
      primary = { text: `RD$ ${prices.dop.toLocaleString()}`, currency: 'dop' };
    } else if (prices.eur != null && prices.eur > 0) {
      primary = { text: `€${prices.eur.toLocaleString()}`, currency: 'eur' };
    } else {
      const numFallback = typeof prop?.price === 'number' ? prop.price : (typeof prop?.rawPrice === 'number' ? prop.rawPrice : null);
      if (numFallback !== null && numFallback > 0) {
        primary = { text: `$${numFallback.toLocaleString()}`, currency: 'usd' };
      } else {
        primary = { text: '$0', currency: 'usd' };
      }
    }

    const secondaries = [];
    if (primary.currency !== 'dop' && prices.dop != null && prices.dop > 0) {
      secondaries.push({ label: `RD$ ${prices.dop.toLocaleString()}`, color: '#b47404' });
    }
    if (primary.currency !== 'usd' && prices.usd != null && prices.usd > 0) {
      secondaries.push({ label: `$${prices.usd.toLocaleString()}`, color: 'var(--primary)' });
    }
    if (primary.currency !== 'eur' && prices.eur != null && prices.eur > 0) {
      secondaries.push({ label: `€${prices.eur.toLocaleString()}`, color: '#0369a1' });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: isTable ? '0.15rem' : '0.1rem' }}>
        <span style={{ fontSize: isTable ? '0.95rem' : '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
          {primary.text}
          {prop?.listingType === 'RENT' && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}> /mo</span>}
        </span>
        {secondaries.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.72rem', flexWrap: 'wrap' }}>
            {secondaries.map((sec, idx) => (
              <span key={idx} style={{ color: sec.color, fontWeight: 600 }}>{sec.label}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const formatPriceString = (prop) => {
    if (!prop) return '$0';
    const prices = prop.prices || extractPrices(prop.price, prop.raw || prop);
    const parts = [];
    if (prices.usd != null && prices.usd > 0) parts.push(`$${prices.usd.toLocaleString()}`);
    if (prices.dop != null && prices.dop > 0) parts.push(`RD$ ${prices.dop.toLocaleString()}`);
    if (prices.eur != null && prices.eur > 0) parts.push(`€${prices.eur.toLocaleString()}`);
    if (parts.length > 0) return parts.join(' • ');
    if (prop.price && Number(prop.price) > 0) return `$${Number(prop.price).toLocaleString()}`;
    return '$0';
  };

  const getPropertyTitle = (title) => {
    if (!title) return 'Property Asset';
    if (typeof title === 'string') return title;
    return title.en || title.es || Object.values(title)[0] || 'Property Asset';
  };

  const getPropertyLocation = (location) => {
    if (!location) return 'Dominican Republic';
    if (typeof location === 'string') return location;
    const parts = [location.address, location.area, location.city, location.state, location.country, location.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : (location.country || 'Dominican Republic');
  };

  const getPropertyImage = (images, fallbackImage) => {
    let rawItem = (images && Array.isArray(images) && images.length > 0) ? images[0] : (images && typeof images === 'string' ? images : fallbackImage);
    let raw = typeof rawItem === 'string' ? rawItem : (rawItem?.url || rawItem?.path || rawItem?.secure_url || rawItem?.src || rawItem?.location || fallbackImage || '');
    if (!raw || typeof raw !== 'string') return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80';
    let clean = raw.trim().replace(/\\/g, '/');
    if (clean.startsWith('blob:') || clean.startsWith('data:')) return clean;
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/i.test(clean)) {
      clean = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/, '');
    }
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    const imageBaseUrl = import.meta.env.VITE_IMAGE_URL || (baseUrl ? baseUrl.replace(/\/api\/?$/, '') : '') || 'https://mobappssolutiondevelopment.com/kleverProp';
    return `${imageBaseUrl.replace(/\/+$/, '')}/${clean.replace(/^\/+/, '')}`;
  };

  const getPropertyDescription = (desc) => {
    if (!desc) return '';
    if (typeof desc === 'string') return desc;
    return desc.en || desc.es || Object.values(desc)[0] || '';
  };

  const formatFurnishedStatus = (status) => {
    if (!status) return 'Not Specified';
    const clean = String(status).replace(/[_-]+/g, ' ').trim();
    return clean
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAmenityDisplayName = (amenity) => {
    if (!amenity) return 'Amenity';

    // 1. If amenity is an object
    if (typeof amenity === 'object') {
      if (amenity.name) {
        if (typeof amenity.name === 'object') {
          return amenity.name.en || amenity.name.es || Object.values(amenity.name)[0] || 'Amenity';
        }
        return String(amenity.name);
      }
      // If object has _id or id but no name, look it up in amenitiesList
      const aId = amenity._id || amenity.id;
      if (aId && amenitiesList && amenitiesList.length > 0) {
        const found = amenitiesList.find(a => (a._id || a.id) === aId);
        if (found) {
          if (typeof found.name === 'object') {
            return found.name.en || found.name.es || Object.values(found.name)[0] || 'Amenity';
          }
          return String(found.name || 'Amenity');
        }
      }
      return 'Amenity';
    }

    // 2. If amenity is a string (ID or name string)
    if (typeof amenity === 'string') {
      if (amenitiesList && amenitiesList.length > 0) {
        const found = amenitiesList.find(a => (a._id || a.id) === amenity);
        if (found) {
          if (typeof found.name === 'object') {
            return found.name.en || found.name.es || Object.values(found.name)[0] || 'Amenity';
          }
          return String(found.name || 'Amenity');
        }
      }

      // If it looks like a 24-character hexadecimal MongoDB ObjectId that couldn't be matched
      if (/^[0-9a-fA-F]{24}$/.test(amenity)) {
        return 'Amenity';
      }

      return amenity;
    }

    return 'Amenity';
  };

  // GET ALL AMENITIES: /admin/amenities
  const fetchAmenities = useCallback(async () => {
    if (!adminUser?.token) return;
    try {
      setAmenitiesLoading(true);
      const res = await axios.get(`${baseUrl}/admin/amenities`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });
      const data = res.data?.data?.amenities || res.data?.amenities || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setAmenitiesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch amenities:', err);
    } finally {
      setAmenitiesLoading(false);
    }
  }, [adminUser?.token, baseUrl]);

  useEffect(() => {
    fetchAmenities();
  }, [fetchAmenities]);

  // 1. GET ALL PROPERTIES WITH PAGINATION: /admin/properties?page=X&limit=Y
  const fetchProperties = useCallback(async (targetPage = currentPage, targetLimit = limit, search = searchTerm) => {
    if (!adminUser?.token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: targetLimit
      };
      if (search && search.trim()) {
        params.search = search.trim();
      }

      const res = await axios.get(`${baseUrl}/admin/properties`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        },
        params
      });

      const rawProps =
        res.data?.data?.properties ||
        res.data?.properties ||
        res.data?.data?.data ||
        (Array.isArray(res.data?.data) ? res.data.data : []) ||
        (Array.isArray(res.data) ? res.data : []);

      const rawPagination = res.data?.data?.pagination || res.data?.pagination || {};

      const totalCount =
        rawPagination.total ??
        rawPagination.totalCount ??
        rawPagination.count ??
        res.data?.data?.total ??
        res.data?.data?.totalProperties ??
        res.data?.data?.totalCount ??
        res.data?.data?.count ??
        res.data?.total ??
        res.data?.totalProperties ??
        res.data?.totalCount ??
        res.data?.count ??
        (Array.isArray(rawProps) ? rawProps.length : 0);

      const totalPagesCount =
        rawPagination.pages ??
        rawPagination.totalPages ??
        res.data?.data?.pages ??
        res.data?.data?.totalPages ??
        res.data?.pages ??
        res.data?.totalPages ??
        (Math.ceil((Number(totalCount) || 0) / targetLimit) || 1);

      const serverPage =
        rawPagination.page ??
        rawPagination.currentPage ??
        res.data?.data?.page ??
        res.data?.data?.currentPage ??
        res.data?.page ??
        res.data?.currentPage ??
        targetPage;

      const serverLimit =
        rawPagination.limit ??
        res.data?.data?.limit ??
        res.data?.limit ??
        targetLimit;

      const paginationData = {
        total: Number(totalCount) || (Array.isArray(rawProps) ? rawProps.length : 0),
        page: Number(serverPage) || targetPage,
        limit: Number(serverLimit) || targetLimit,
        pages: Number(totalPagesCount) || Math.ceil((Number(totalCount) || 0) / targetLimit) || 1
      };

      const mapped = (Array.isArray(rawProps) ? rawProps : []).map((p) => {
        const titleStr = getPropertyTitle(p.title);
        const locStr = getPropertyLocation(p.location);
        const imgUrl = getPropertyImage(p.images, p.image);
        const isActiveState = p.isActive !== false && p.status !== 'Inactive' && p.status !== 'Suspended';
        const propTypeStr = normalizePropertyType(p.propertyType || p.type);
        const pricesObj = extractPrices(p.price, p);
        const primaryNumericPrice = pricesObj.usd || pricesObj.dop || pricesObj.eur || (typeof p.price === 'number' ? p.price : 0);

        return {
          _id: p._id || p.id,
          id: p._id || p.id,
          title: titleStr,
          rawTitle: p.title,
          description: getPropertyDescription(p.description),
          rawDescription: p.description,
          location: locStr,
          rawLocation: p.location,
          portal: p.source || p.portal || 'Admin',
          type: propTypeStr,
          propertyType: propTypeStr,
          listingType: p.listingType || 'BUY',
          price: primaryNumericPrice,
          prices: pricesObj,
          rawPrice: p.price,
          bedrooms: p.bedrooms != null ? p.bedrooms : 2,
          bathrooms: p.bathrooms != null ? p.bathrooms : 2,
          size: p.size || null,
          sizeUnit: p.sizeUnit || 'sq ft',
          furnishedStatus: p.furnishedStatus || '',
          constructionStatus: p.constructionStatus || 'Off-plan',
          isShortTermRentalAllowed: Boolean(p.isShortTermRentalAllowed),
          amenities: p.amenities || [],
          agentDetails: p.agentDetails || null,
          status: isActiveState ? 'Active' : 'Inactive',
          isActive: isActiveState,
          featured: p.featured || false,
          isDuplicate: p.isDuplicate || false,
          scrapedAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
          images: p.images || [],
          image: imgUrl,
          raw: p
        };
      });

      setPropertiesList(mapped);
      setPagination(paginationData);
      setCurrentPage(paginationData.page || targetPage);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
      if (err.response?.status === 401) {
        toast.error('Session token expired. Please log in again.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to fetch properties from server');
      }
      setPropertiesList([]);
    } finally {
      setLoading(false);
    }
  }, [adminUser?.token, baseUrl, currentPage, limit, searchTerm]);

  // Initial Fetch & Parameter Triggers
  useEffect(() => {
    fetchProperties(currentPage, limit, searchTerm);
  }, [adminUser?.token, currentPage, limit]);

  // Handle Search Change with Debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchProperties(1, limit, value);
    }, 350);
  };

  // Handle Page Navigation - Immediately calls fetchProperties for seamless pagination
  const handlePageChange = (newPage) => {
    const maxPages = pagination.pages || Math.ceil((pagination.total || 0) / limit) || 1;
    if (newPage < 1 || newPage > maxPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchProperties(newPage, limit, searchTerm);
  };

  // Handle Limit Change (e.g. 5, 10, 20, 50)
  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimit(newLimit);
    setCurrentPage(1);
    fetchProperties(1, newLimit, searchTerm);
  };

  // 2. GET PROPERTY BY ID: /admin/properties/:id
  const handleInspectProperty = async (prop) => {
    setSelectedProp(prop);
    setSelectedPropDetails(null);
    setSelectedImageIndex(0);
    setDetailLoading(true);
    const propId = prop._id || prop.id;

    try {
      const res = await axios.get(`${baseUrl}/admin/properties/${propId}`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });
      const data = res.data?.data?.property || res.data?.property || res.data?.data || res.data;
      setSelectedPropDetails(data);
    } catch (err) {
      console.error('Failed to load property details:', err);
      if (err.response?.status === 401) {
        toast.error('Unauthorized. Please log in again.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to load property details.');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // 3. STATUS OF PROPERTY BY ID (TOGGLE): PUT /admin/properties/:id/status
  const handleToggleStatus = async (prop) => {
    const propId = prop._id || prop.id;
    try {
      setActionLoading(propId);
      const res = await axios.put(`${baseUrl}/admin/properties/${propId}/status`, {}, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      const nextActive = !prop.isActive;
      const nextStatus = nextActive ? 'Active' : 'Inactive';

      toast.success(res.data?.message || `Property status updated to ${nextStatus}`);

      // Update state locally
      setPropertiesList(prev => prev.map(p => {
        if ((p._id || p.id) === propId) {
          return {
            ...p,
            isActive: nextActive,
            status: nextStatus
          };
        }
        return p;
      }));

      if (selectedProp && (selectedProp._id || selectedProp.id) === propId) {
        setSelectedProp(prev => ({
          ...prev,
          isActive: nextActive,
          status: nextStatus
        }));
      }

      onAddAuditLog('Property', `Toggled property listing "${prop.title}" status to ${nextStatus}`);
    } catch (err) {
      console.error('Failed to toggle property status:', err);
      if (err.response?.status === 401) {
        toast.error('Unauthorized. Please log in again.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to update property status');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFeatured = (prop) => {
    const propId = prop._id || prop.id;
    setPropertiesList(prev => prev.map(p => {
      if ((p._id || p.id) === propId) {
        return { ...p, featured: !p.featured };
      }
      return p;
    }));
    toast.success(`Property marked as ${!prop.featured ? 'Featured' : 'Standard'}`);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormImage(previewUrl);
    }
  };

  // Multiple Image Handler for Add Property
  const handleMultipleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setAddFormImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setAddFormImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (indexToRemove) => {
    setAddFormImageFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setAddFormImagePreviews(prev => {
      const target = prev[indexToRemove];
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const toggleAmenitySelection = (amenityId) => {
    setAddFormSelectedAmenities(prev => {
      if (prev.includes(amenityId)) {
        return prev.filter(id => id !== amenityId);
      } else {
        return [...prev, amenityId];
      }
    });
  };

  const resetAddForm = () => {
    setAddFormEnTitle('');
    setAddFormEsTitle('');
    setAddFormEnDescription('');
    setAddFormEsDescription('');
    setAddFormAddress('');
    setAddFormArea('');
    setAddFormCity('');
    setAddFormState('');
    setAddFormCountry('Dominican Republic');
    setAddFormPincode('');
    setAddFormLatitude('');
    setAddFormLongitude('');
    setAddFormPropertyType('APARTMENT');
    setAddFormListingType('BUY');
    setAddFormConstructionStatus('Off-plan');
    setAddFormIsShortTermRentalAllowed(false);
    setAddFormPriceDop('');
    setAddFormPriceUsd('');
    setAddFormPriceEur('');
    setAddFormBedrooms(2);
    setAddFormBathrooms(2);
    setAddFormSize(1200);
    setAddFormSizeUnit('sq ft');
    setAddFormFurnishedStatus('SEMI_FURNISHED');
    setAddFormSelectedAmenities([]);
    setAddFormOwnerName('');
    setAddFormOwnerPhone('');
    setAddFormOwnerEmail('');
    setAddFormImageFiles([]);
    addFormImagePreviews.forEach(p => {
      if (p.url) URL.revokeObjectURL(p.url);
    });
    setAddFormImagePreviews([]);
    setAddFormTab('en');
  };

  // ADD PROPERTY API: POST /admin/properties/add (multipart/form-data)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!adminUser?.token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    if (!addFormEnTitle.trim()) {
      toast.error('Please enter the English property title.');
      return;
    }

    if (!addFormPriceUsd && !addFormPriceDop && !addFormPriceEur) {
      toast.error('Please enter at least one property price (e.g. USD, DOP, or EUR).');
      return;
    }

    if (!addFormAddress.trim()) {
      toast.error('Please enter the street address.');
      return;
    }

    if (!addFormCity.trim()) {
      toast.error('Please enter the city.');
      return;
    }

    try {
      setAddSubmitting(true);
      const formData = new FormData();

      // Multilingual fields
      formData.append('enTitle', addFormEnTitle.trim());
      formData.append('esTitle', addFormEsTitle.trim() || addFormEnTitle.trim());
      formData.append('enDescription', addFormEnDescription.trim());
      formData.append('esDescription', addFormEsDescription.trim() || addFormEnDescription.trim());

      // Location fields
      formData.append('address', addFormAddress.trim());
      formData.append('area', addFormArea.trim());
      formData.append('city', addFormCity.trim());
      formData.append('state', addFormState.trim());
      formData.append('country', addFormCountry.trim() || 'Dominican Republic');
      if (addFormPincode.trim()) formData.append('pincode', addFormPincode.trim());
      if (addFormLatitude) formData.append('latitude', addFormLatitude);
      if (addFormLongitude) formData.append('longitude', addFormLongitude);

      // Classification & Specs
      formData.append('propertyType', toApiPropertyType(addFormPropertyType));
      formData.append('listingType', addFormListingType);
      formData.append('constructionStatus', addFormConstructionStatus || 'Off-plan');
      formData.append('isShortTermRentalAllowed', addFormIsShortTermRentalAllowed ? 'true' : 'false');

      // Multi-currency price fields: price[dop], price[usd], price[eur]
      if (addFormPriceDop !== '') formData.append('price[dop]', Number(addFormPriceDop));
      if (addFormPriceUsd !== '') formData.append('price[usd]', Number(addFormPriceUsd));
      if (addFormPriceEur !== '') formData.append('price[eur]', Number(addFormPriceEur));
      formData.append('price', Number(addFormPriceUsd || addFormPriceDop || addFormPriceEur || 0));

      formData.append('bedrooms', Number(addFormBedrooms) || 0);
      formData.append('bathrooms', Number(addFormBathrooms) || 0);
      if (addFormSize) formData.append('size', Number(addFormSize));
      formData.append('sizeUnit', addFormSizeUnit || 'sq ft');
      formData.append('furnishedStatus', addFormFurnishedStatus);

      // amenities [“id”,”id”]
      formData.append('amenities', JSON.stringify(addFormSelectedAmenities));

      // Owner details
      if (addFormOwnerName.trim()) formData.append('ownerName', addFormOwnerName.trim());
      if (addFormOwnerPhone.trim()) formData.append('ownerPhone', addFormOwnerPhone.trim());
      if (addFormOwnerEmail.trim()) formData.append('ownerEmail', addFormOwnerEmail.trim());

      // images (file)
      if (addFormImageFiles && addFormImageFiles.length > 0) {
        addFormImageFiles.forEach((file) => {
          formData.append('images', file);
        });
      }

      const res = await axios.post(`${baseUrl}/admin/properties/add`, formData, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      toast.success(res.data?.message || 'Property added successfully!');
      onAddAuditLog('Property', `Added property listing "${addFormEnTitle}" via API`);

      setShowAddModal(false);
      resetAddForm();

      // Refresh list at page 1 to display the newly created property
      setCurrentPage(1);
      fetchProperties(1, limit, searchTerm);
    } catch (err) {
      console.error('Failed to add property:', err);
      toast.error(err.response?.data?.message || 'Failed to add property to server');
    } finally {
      setAddSubmitting(false);
    }
  };

  // Handle Selection of New Images in Edit Modal
  const handleEditNewImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setEditFormNewImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setEditFormNewImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    const target = editFormExistingImages[indexToRemove];
    if (target) {
      setRemovedExistingImages(prev => [...prev, target]);
    }
    setEditFormExistingImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveEditNewImage = (indexToRemove) => {
    setEditFormNewImageFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setEditFormNewImagePreviews(prev => {
      const target = prev[indexToRemove];
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const toggleEditAmenitySelection = (amenityId) => {
    setEditFormSelectedAmenities(prev => {
      if (prev.includes(amenityId)) {
        return prev.filter(id => id !== amenityId);
      } else {
        return [...prev, amenityId];
      }
    });
  };

  // Open Edit Modal and Pre-populate with existing property values
  const handleEditClick = async (prop) => {
    setEditingProp(prop);
    setEditFormTab('en');

    const raw = prop.raw || prop;

    // Multilingual Title
    const titleObj = typeof raw.title === 'object' ? raw.title : {};
    setEditFormEnTitle(titleObj.en || (typeof raw.title === 'string' ? raw.title : prop.title) || '');
    setEditFormEsTitle(titleObj.es || '');

    // Multilingual Description
    const descObj = typeof raw.description === 'object' ? raw.description : {};
    setEditFormEnDescription(descObj.en || (typeof raw.description === 'string' ? raw.description : prop.description) || '');
    setEditFormEsDescription(descObj.es || '');

    // Location
    const locObj = typeof raw.location === 'object' ? raw.location : {};
    setEditFormAddress(locObj.address || raw.address || (typeof raw.location === 'string' ? raw.location : '') || '');
    setEditFormArea(locObj.area || raw.area || '');
    setEditFormCity(locObj.city || raw.city || '');
    setEditFormState(locObj.state || raw.state || '');
    setEditFormCountry(locObj.country || raw.country || 'Dominican Republic');
    setEditFormPincode(locObj.pincode || raw.pincode || '');

    const coords = locObj.coordinates || raw.coordinates || [];
    const lat = locObj.latitude ?? raw.latitude ?? (Array.isArray(coords) && coords.length >= 2 ? coords[1] : '');
    const lng = locObj.longitude ?? raw.longitude ?? (Array.isArray(coords) && coords.length >= 1 ? coords[0] : '');
    setEditFormLatitude(lat !== '' && lat != null ? String(lat) : '');
    setEditFormLongitude(lng !== '' && lng != null ? String(lng) : '');

    // Classification & Specs
    setEditFormPropertyType(toApiPropertyType(raw.propertyType || prop.propertyType || prop.type));
    setEditFormListingType((raw.listingType || prop.listingType || 'BUY').toUpperCase());
    setEditFormConstructionStatus(raw.constructionStatus || prop.constructionStatus || 'Off-plan');
    setEditFormIsShortTermRentalAllowed(Boolean(raw.isShortTermRentalAllowed ?? prop.isShortTermRentalAllowed ?? false));
    
    // Multi-currency Prices
    const prices = extractPrices(raw.price ?? prop.price, raw);
    setEditFormPriceDop(prices.dop != null ? String(prices.dop) : '');
    setEditFormPriceUsd(prices.usd != null ? String(prices.usd) : '');
    setEditFormPriceEur(prices.eur != null ? String(prices.eur) : '');

    setEditFormBedrooms(raw.bedrooms ?? prop.bedrooms ?? 2);
    setEditFormBathrooms(raw.bathrooms ?? prop.bathrooms ?? 2);
    setEditFormSize(raw.size ?? prop.size ?? 1200);
    setEditFormSizeUnit(raw.sizeUnit || prop.sizeUnit || 'sq ft');
    setEditFormFurnishedStatus(raw.furnishedStatus || prop.furnishedStatus || 'SEMI_FURNISHED');

    // Amenities
    const rawAmenities = raw.amenities || prop.amenities || [];
    const extractedIds = rawAmenities.map(a => (typeof a === 'object' ? (a._id || a.id) : a)).filter(Boolean);
    setEditFormSelectedAmenities(extractedIds);

    // Owner / Agent Details
    const agent = raw.agentDetails || prop.agentDetails || {};
    setEditFormOwnerName(raw.ownerName || agent.name || '');
    setEditFormOwnerPhone(raw.ownerPhone || agent.phone || '');
    setEditFormOwnerEmail(raw.ownerEmail || agent.email || '');

    // Existing Images
    const currentImgs = (Array.isArray(raw.images) && raw.images.length > 0)
      ? raw.images.map(img => getPropertyImage([img], prop.image))
      : (prop.images && prop.images.length > 0)
        ? prop.images.map(img => getPropertyImage([img], prop.image))
        : (prop.image ? [prop.image] : []);
    setEditFormExistingImages(currentImgs);
    setRemovedExistingImages([]);

    // Reset new image selections
    setEditFormNewImageFiles([]);
    setEditFormNewImagePreviews([]);

    // Fetch full single property details from API to ensure complete accuracy
    const propId = prop._id || prop.id;
    try {
      const res = await axios.get(`${baseUrl}/admin/properties/${propId}`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });
      const fullData = res.data?.data?.property || res.data?.property || res.data?.data || res.data;
      if (fullData) {
        if (fullData.propertyType || fullData.type) {
          setEditFormPropertyType(toApiPropertyType(fullData.propertyType || fullData.type));
        }
        if (fullData.constructionStatus) {
          setEditFormConstructionStatus(fullData.constructionStatus);
        }
        if (fullData.isShortTermRentalAllowed !== undefined) {
          setEditFormIsShortTermRentalAllowed(Boolean(fullData.isShortTermRentalAllowed));
        }
        if (fullData.price != null) {
          const fullPrices = extractPrices(fullData.price, fullData);
          if (fullPrices.dop != null) setEditFormPriceDop(String(fullPrices.dop));
          if (fullPrices.usd != null) setEditFormPriceUsd(String(fullPrices.usd));
          if (fullPrices.eur != null) setEditFormPriceEur(String(fullPrices.eur));
        }
        if (fullData.title && typeof fullData.title === 'object') {
          if (fullData.title.en) setEditFormEnTitle(fullData.title.en);
          if (fullData.title.es) setEditFormEsTitle(fullData.title.es);
        }
        if (fullData.description && typeof fullData.description === 'object') {
          if (fullData.description.en) setEditFormEnDescription(fullData.description.en);
          if (fullData.description.es) setEditFormEsDescription(fullData.description.es);
        }
        if (fullData.location && typeof fullData.location === 'object') {
          if (fullData.location.address) setEditFormAddress(fullData.location.address);
          if (fullData.location.area) setEditFormArea(fullData.location.area);
          if (fullData.location.city) setEditFormCity(fullData.location.city);
          if (fullData.location.state) setEditFormState(fullData.location.state);
          if (fullData.location.country) setEditFormCountry(fullData.location.country);
          if (fullData.location.pincode) setEditFormPincode(fullData.location.pincode);
        }
        if (fullData.amenities && Array.isArray(fullData.amenities)) {
          const ids = fullData.amenities.map(a => (typeof a === 'object' ? (a._id || a.id) : a)).filter(Boolean);
          if (ids.length > 0) setEditFormSelectedAmenities(ids);
        }
        if (fullData.images && Array.isArray(fullData.images) && fullData.images.length > 0) {
          setEditFormExistingImages(fullData.images.map(img => getPropertyImage([img], prop.image)));
        }
      }
    } catch (err) {
      console.warn('Could not fetch single property details for prefill:', err);
    }
  };

  // EDIT PROPERTY API: PUT /admin/properties/:id (multipart/form-data)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!adminUser?.token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }
    if (!editingProp) return;

    if (!editFormEnTitle.trim()) {
      toast.error('Please enter the English property title.');
      return;
    }
    if (!editFormPriceUsd && !editFormPriceDop && !editFormPriceEur) {
      toast.error('Please enter at least one property price (e.g. USD, DOP, or EUR).');
      return;
    }
    if (!editFormAddress.trim()) {
      toast.error('Please enter the street address.');
      return;
    }
    if (!editFormCity.trim()) {
      toast.error('Please enter the city.');
      return;
    }

    const propId = editingProp._id || editingProp.id;

    try {
      setEditSubmitting(true);
      const formData = new FormData();

      // Multilingual fields
      formData.append('enTitle', editFormEnTitle.trim());
      formData.append('esTitle', editFormEsTitle.trim() || editFormEnTitle.trim());
      formData.append('enDescription', editFormEnDescription.trim());
      formData.append('esDescription', editFormEsDescription.trim() || editFormEnDescription.trim());

      // Location fields
      formData.append('address', editFormAddress.trim());
      formData.append('area', editFormArea.trim());
      formData.append('city', editFormCity.trim());
      formData.append('state', editFormState.trim());
      formData.append('country', editFormCountry.trim() || 'Dominican Republic');
      if (editFormPincode.trim()) formData.append('pincode', editFormPincode.trim());
      if (editFormLatitude) formData.append('latitude', editFormLatitude);
      if (editFormLongitude) formData.append('longitude', editFormLongitude);

      // Classification & Specs
      formData.append('propertyType', toApiPropertyType(editFormPropertyType));
      formData.append('listingType', editFormListingType);
      formData.append('constructionStatus', editFormConstructionStatus || 'Off-plan');
      formData.append('isShortTermRentalAllowed', editFormIsShortTermRentalAllowed ? 'true' : 'false');

      // Multi-currency price fields: price[dop], price[usd], price[eur]
      if (editFormPriceDop !== '') formData.append('price[dop]', Number(editFormPriceDop));
      if (editFormPriceUsd !== '') formData.append('price[usd]', Number(editFormPriceUsd));
      if (editFormPriceEur !== '') formData.append('price[eur]', Number(editFormPriceEur));
      formData.append('price', Number(editFormPriceUsd || editFormPriceDop || editFormPriceEur || 0));

      formData.append('bedrooms', Number(editFormBedrooms) || 0);
      formData.append('bathrooms', Number(editFormBathrooms) || 0);
      if (editFormSize) formData.append('size', Number(editFormSize));
      formData.append('sizeUnit', editFormSizeUnit || 'sq ft');
      formData.append('furnishedStatus', editFormFurnishedStatus);

      // amenities [“id”,”id”]
      formData.append('amenities', JSON.stringify(editFormSelectedAmenities));

      // Owner details
      if (editFormOwnerName.trim()) formData.append('ownerName', editFormOwnerName.trim());
      if (editFormOwnerPhone.trim()) formData.append('ownerPhone', editFormOwnerPhone.trim());
      if (editFormOwnerEmail.trim()) formData.append('ownerEmail', editFormOwnerEmail.trim());

      // Existing images (retained after user removals)
      formData.append('existingImages', JSON.stringify(editFormExistingImages));
      if (removedExistingImages.length > 0) {
        formData.append('removedImages', JSON.stringify(removedExistingImages));
      }

      // images (file)
      if (editFormNewImageFiles && editFormNewImageFiles.length > 0) {
        editFormNewImageFiles.forEach((file) => {
          formData.append('images', file);
        });
      }

      const res = await axios.put(`${baseUrl}/admin/properties/${propId}`, formData, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      toast.success(res.data?.message || 'Property updated successfully!');
      onAddAuditLog('Property', `Updated property listing "${editFormEnTitle}" via API`);

      setEditingProp(null);

      // Refresh listings
      fetchProperties(currentPage, limit, searchTerm);
    } catch (err) {
      console.error('Failed to update property:', err);
      toast.error(err.response?.data?.message || 'Failed to update property on server');
    } finally {
      setEditSubmitting(false);
    }
  };

  // DELETE PROPERTY API: DELETE /admin/properties/:id
  const handleConfirmDelete = async () => {
    if (!propertyToDelete || !adminUser?.token) return;
    const propId = propertyToDelete._id || propertyToDelete.id;
    const propTitle = propertyToDelete.title || 'Property';

    try {
      setIsDeleting(true);
      const res = await axios.delete(`${baseUrl}/admin/properties/${propId}`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      toast.success(res.data?.message || `Property "${propTitle}" deleted successfully`);
      onAddAuditLog('Property', `Permanently deleted property listing "${propTitle}" via API`);

      // Update local state list
      setPropertiesList(prev => prev.filter(p => (p._id || p.id) !== propId));
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));

      if (selectedProp && (selectedProp._id || selectedProp.id) === propId) {
        setSelectedProp(null);
      }
      setPropertyToDelete(null);

      // Refresh list to maintain pagination
      fetchProperties(currentPage, limit, searchTerm);
    } catch (err) {
      console.error('Failed to delete property:', err);
      toast.error(err.response?.data?.message || 'Failed to delete property from server');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTriggerMerge = (prop) => {
    const propId = prop._id || prop.id;
    const counterpart = propertiesList.find(p => (p._id || p.id) !== propId && (p.title.includes(prop.title) || prop.title.includes(p.title) || p.location === prop.location) && p.isDuplicate);
    if (!counterpart) {
      toast.error('No corresponding duplicate detected for this listing.');
      return;
    }
    setMergingProps([prop, counterpart]);
    setMasterSelect('left');
  };

  const handleExecuteMerge = () => {
    if (!mergingProps) return;
    const [left, right] = mergingProps;
    const master = masterSelect === 'left' ? left : right;
    const masterId = master._id || master.id;
    const deletedId = masterSelect === 'left' ? (right._id || right.id) : (left._id || left.id);

    setPropertiesList(prev => prev.filter(p => (p._id || p.id) !== deletedId));
    onAddAuditLog('Property', `Merged duplicate properties. Retained "${master.title}" and discarded alternative record.`);
    toast.success('Properties successfully merged! Duplicate record was removed.');
    setMergingProps(null);
  };

  // Filter listings
  const filteredProperties = propertiesList.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPortal = portalFilter === 'All' || p.portal === portalFilter;
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      const sf = statusFilter.toUpperCase();
      if (sf === 'ACTIVE') {
        matchesStatus = p.status === 'Active' || p.isActive === true;
      } else if (sf === 'INACTIVE') {
        matchesStatus = p.status === 'Inactive' || p.isActive === false;
      } else {
        matchesStatus =
          (p.listingType && p.listingType.toUpperCase() === sf) ||
          (p.status && p.status.toUpperCase() === sf);
      }
    }
    return matchesSearch && matchesPortal && matchesStatus;
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

  // Selected Detail Modal Images Array
  const rawDetailImagesList = (selectedPropDetails?.images && Array.isArray(selectedPropDetails.images) && selectedPropDetails.images.length > 0)
    ? selectedPropDetails.images
    : (selectedPropDetails?.gallery && Array.isArray(selectedPropDetails.gallery) && selectedPropDetails.gallery.length > 0)
      ? selectedPropDetails.gallery
      : (selectedProp?.images && Array.isArray(selectedProp.images) && selectedProp.images.length > 0)
        ? selectedProp.images
        : (selectedProp?.image ? [selectedProp.image] : (selectedPropDetails?.image ? [selectedPropDetails.image] : []));

  const detailImages = rawDetailImagesList.length > 0
    ? rawDetailImagesList.map(img => getPropertyImage(typeof img === 'string' ? [img] : (img?.url ? [img.url] : (img?.path ? [img.path] : [img])), selectedProp?.image))
    : [selectedProp?.image || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80'];

  const currentPreviewImage = detailImages[selectedImageIndex] || detailImages[0] || selectedProp?.image;

  // Interactive Image Slider Controls
  const handlePrevImage = (e) => {
    if (e) e.stopPropagation();
    setSelectedImageIndex(prev => (prev === 0 ? detailImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    if (e) e.stopPropagation();
    setSelectedImageIndex(prev => (prev === detailImages.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation for image slider
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedProp || detailImages.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProp, detailImages.length]);

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="flex-between">
        <div>
          <h2>Property Asset Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Inspect synced and database property listings, review specifications, toggle live status, and manage assets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* View Mode Toggle: Grid or Table List */}
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
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
              style={{ padding: '0.35rem 0.65rem', height: '32px', borderRadius: '6px' }}
              title="Listing Table View"
            >
              <List size={15} />
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => fetchProperties(currentPage, limit, searchTerm)}
            disabled={loading}
            title="Refresh Properties"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {/* <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ gap: '0.5rem' }}>
            <Plus size={16} />
            Manually Add Property
          </button> */}
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
            placeholder="Search location, property name, keywords..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex-align-center" style={{ gap: '0.5rem' }}>
          <select className="form-control form-select" style={{ width: '140px', padding: '0.5rem 2rem 0.5rem 1rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Buy">Buy</option>
            <option value="Rent">Rent</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Loader2 className="animate-spin" size={28} color="var(--primary)" />
            <p style={{ fontSize: '0.9rem', margin: 0 }}>Loading properties from server...</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredProperties.length > 0 ? (
            filteredProperties.map((prop) => {
              const propId = prop._id || prop.id;
              const isActioning = actionLoading === propId;

              return (
                <div key={propId} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* Portal Source Badge */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${prop.portal === 'SuperCasas' ? 'badge-primary' :
                      prop.portal === 'Corotos' ? 'badge-warning' : 'badge-info'
                      }`}>
                      {prop.portal}
                    </span>
                    {prop.listingType && (
                      <span className="badge badge-primary">
                        {prop.listingType}
                      </span>
                    )}
                    {prop.furnishedStatus && (
                      <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                        {formatFurnishedStatus(prop.furnishedStatus)}
                      </span>
                    )}
                  </div>

                  {/* Duplicate Indicator */}
                  {prop.isDuplicate && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                      <span className="badge badge-danger" style={{ cursor: 'pointer', gap: '0.25rem' }} onClick={() => handleTriggerMerge(prop)}>
                        <Layers size={10} />
                        Merge Duplicate
                      </span>
                    </div>
                  )}

                  {/* Property Image */}
                  <div style={{ height: '190px', overflow: 'hidden', background: '#0e1731', position: 'relative' }}>
                    <img
                      src={prop.image}
                      alt={prop.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.5s ease' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    {prop.images && prop.images.length > 1 && (
                      <span
                        className="badge"
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px'
                        }}
                      >
                        <ImageIcon size={12} /> {prop.images.length} Photos
                      </span>
                    )}
                  </div>

                  {/* Property Details */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="flex-between">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {prop.type} {prop.bedrooms ? `• ${prop.bedrooms} beds` : ''} {prop.bathrooms ? `• ${prop.bathrooms} baths` : ''} {prop.furnishedStatus ? `• ${formatFurnishedStatus(prop.furnishedStatus)}` : ''}
                      </span>
                      <button
                        onClick={() => toggleFeatured(prop)}
                        style={{ background: 'none', border: 'none', color: prop.featured ? 'var(--warning)' : 'var(--text-muted)', cursor: 'pointer' }}
                        title={prop.featured ? 'Featured Asset' : 'Mark as Featured'}
                      >
                        <Star size={16} fill={prop.featured ? 'var(--warning)' : 'none'} />
                      </button>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }} className="flex-align-center">
                      {prop.title}
                    </h4>

                    <div className="flex-align-center" style={{ gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prop.location}</span>
                    </div>

                    <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <div>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', display: 'block' }}>PRICE</span>
                        {renderPriceBadges(prop, false)}
                      </div>
                      <span className={`badge ${prop.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {prop.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ background: '#faf8f5', borderTop: '1px solid var(--border-color)', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      className={`btn btn-sm ${prop.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggleStatus(prop)}
                      disabled={isActioning}
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem' }}
                      title={prop.status === 'Active' ? 'Deactivate Property' : 'Activate Property'}
                    >
                      {isActioning ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : prop.status === 'Active' ? (
                        <>
                          <X size={13} />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          Activate
                        </>
                      )}
                    </button>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleInspectProperty(prop)}>
                        Details
                      </button>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => handleEditClick(prop)} title="Edit Property">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon text-danger" onClick={() => setPropertyToDelete(prop)} title="Delete Property">
                        <Trash2 size={13} />
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
        /* TABLE / LISTING FORM VIEW */
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Property Asset</th>
                  <th>Location</th>
                  <th>Type & Deal</th>
                  <th>Bedrooms / Size</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.length > 0 ? (
                  filteredProperties.map((prop) => {
                    const propId = prop._id || prop.id;
                    const isActioning = actionLoading === propId;

                    return (
                      <tr key={propId}>
                        <td>
                          <div className="flex-align-center" style={{ gap: '0.85rem' }}>
                            <img
                              src={prop.image}
                              alt={prop.title}
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
                                <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                                  {prop.portal}
                                </span>
                                {prop.featured && (
                                  <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                                    ★ Featured
                                  </span>
                                )}
                              </div>
                              <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                {prop.title}
                              </p>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Ref: <code>{propId.slice(-6)}</code>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} color="var(--primary)" />
                            <span>{prop.location}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ marginRight: '0.3rem' }}>
                            {prop.type}
                          </span>
                          <span className="badge badge-secondary">
                            {prop.listingType}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {prop.bedrooms != null && <span>🛏️ {prop.bedrooms} Beds </span>}
                          {prop.bathrooms != null && <span>🚿 {prop.bathrooms} Baths</span>}
                          {prop.size && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📐 {Number(prop.size).toLocaleString()} {prop.sizeUnit}</div>}
                          {prop.furnishedStatus && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              🛋️ {formatFurnishedStatus(prop.furnishedStatus)}
                            </div>
                          )}
                        </td>
                        <td>
                          {renderPriceBadges(prop, true)}
                        </td>
                        <td>
                          <span className={`badge ${prop.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                            {prop.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex-align-center" style={{ gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              className={`btn btn-ghost btn-sm btn-icon ${prop.status === 'Active' ? 'text-danger' : 'text-success'}`}
                              onClick={() => handleToggleStatus(prop)}
                              disabled={isActioning}
                              title={prop.status === 'Active' ? 'Deactivate Property' : 'Activate Property'}
                            >
                              {isActioning ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : prop.status === 'Active' ? (
                                <X size={14} />
                              ) : (
                                <Check size={14} />
                              )}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => handleInspectProperty(prop)}
                              title="Inspect Property Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => handleEditClick(prop)}
                              title="Edit Property"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon text-danger"
                              onClick={() => setPropertyToDelete(prop)}
                              title="Delete Property"
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
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                      No properties match your active search or filter selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION TOOLBAR */}
      <div className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.85rem 1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#faf8f5'
      }}>
        {/* Left: Summary and Rows per Page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{fromIndex}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{toIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> properties
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Per page:</span>
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

      {/* DETAIL MODAL (GET /admin/properties/:id) */}
      {selectedProp && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedProp(null)}>
          <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={18} color="var(--primary)" />
                Property Specifications & Telemetry
              </h3>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedProp(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
              {detailLoading ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--primary)' }} />
                  <p style={{ fontSize: '0.85rem' }}>Loading property details from server...</p>
                </div>
              ) : (
                <>
                  {/* Property Banner Image with Interactive Slider */}
                  <div style={{
                    width: '100%',
                    height: '260px',
                    minHeight: '260px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid var(--border-color)',
                    background: '#121826',
                    flexShrink: 0
                  }}>
                    <img
                      key={selectedImageIndex}
                      src={currentPreviewImage}
                      alt={selectedProp.title}
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

                    {/* Source & Status Badges on Top Left */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '0.4rem', zIndex: 3, flexWrap: 'wrap' }}>
                      <span className="badge badge-primary" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                        {selectedProp.portal} Source
                      </span>
                      <span className={`badge ${selectedProp.status === 'Active' ? 'badge-success' : 'badge-danger'}`} style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                        {selectedProp.status}
                      </span>
                      {(selectedPropDetails?.furnishedStatus || selectedProp.furnishedStatus) && (
                        <span className="badge badge-info" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                          {formatFurnishedStatus(selectedPropDetails?.furnishedStatus || selectedProp.furnishedStatus)}
                        </span>
                      )}
                    </div>

                    {/* Interactive Multiple Images Slider Controls */}
                    {detailImages.length > 1 && (
                      <>
                        {/* Previous Button */}
                        <button
                          type="button"
                          onClick={handlePrevImage}
                          aria-label="Previous photo"
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.55)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 4,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.85)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.55)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                        >
                          <ChevronLeft size={20} />
                        </button>

                        {/* Next Button */}
                        <button
                          type="button"
                          onClick={handleNextImage}
                          aria-label="Next photo"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.55)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 4,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.85)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.55)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                        >
                          <ChevronRight size={20} />
                        </button>

                        {/* Bottom Slider Footer (Dots & Counter Pill) */}
                        <div style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '0',
                          right: '0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0 12px',
                          zIndex: 3,
                          pointerEvents: 'none'
                        }}>
                          {/* Slide indicator dots */}
                          <div style={{ display: 'flex', gap: '5px', pointerEvents: 'auto' }}>
                            {detailImages.map((_, dotIdx) => (
                              <button
                                key={dotIdx}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(dotIdx); }}
                                style={{
                                  width: selectedImageIndex === dotIdx ? '20px' : '7px',
                                  height: '7px',
                                  borderRadius: '4px',
                                  background: selectedImageIndex === dotIdx ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  transition: 'all 0.25s ease'
                                }}
                                title={`Slide to photo ${dotIdx + 1}`}
                              />
                            ))}
                          </div>

                          {/* Image Counter Badge */}
                          <span style={{
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(4px)',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            letterSpacing: '0.5px'
                          }}>
                            {selectedImageIndex + 1} / {detailImages.length}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Multiple Images Thumbnail Strip */}
                  {detailImages.length > 1 && (
                    <div style={{
                      display: 'flex',
                      gap: '0.65rem',
                      overflowX: 'auto',
                      padding: '8px 10px',
                      background: '#faf8f5',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      flexShrink: 0,
                      minHeight: '72px',
                      alignItems: 'center',
                      scrollbarWidth: 'thin'
                    }}>
                      {detailImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          style={{
                            width: '78px',
                            height: '56px',
                            minWidth: '78px',
                            minHeight: '56px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            padding: 0,
                            border: selectedImageIndex === idx ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                            boxShadow: selectedImageIndex === idx ? '0 0 0 2px rgba(250, 179, 25, 0.4)' : 'none',
                            opacity: selectedImageIndex === idx ? 1 : 0.65,
                            cursor: 'pointer',
                            flexShrink: 0,
                            background: '#121826',
                            transition: 'all 0.2s ease',
                            display: 'block'
                          }}
                          title={`View photo ${idx + 1}`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Thumbnail ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ flexShrink: 0 }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>
                      {selectedProp.title}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                      <MapPin size={15} color="var(--primary)" />
                      {selectedProp.location}
                    </p>
                  </div>

                  {/* Price & Key Specs Grid */}
                  {(() => {
                    const viewPrices = extractPrices(selectedPropDetails?.price || selectedProp?.price, selectedPropDetails || selectedProp || {});
                    return (
                      <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>LISTING PRICE</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              {viewPrices.usd != null && (
                                <strong style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 700 }}>
                                  ${viewPrices.usd.toLocaleString()}
                                </strong>
                              )}
                              {viewPrices.dop != null && (
                                <strong style={{ fontSize: '0.8125rem', color: '#b47404', fontWeight: 700 }}>
                                  RD$ {viewPrices.dop.toLocaleString()}
                                </strong>
                              )}
                              {viewPrices.eur != null && (
                                <strong style={{ fontSize: '0.8125rem', color: '#0369a1', fontWeight: 700 }}>
                                  €{viewPrices.eur.toLocaleString()}
                                </strong>
                              )}
                              {viewPrices.usd == null && viewPrices.dop == null && viewPrices.eur == null && (
                                <strong style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 700 }}>
                                  $0
                                </strong>
                              )}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>TYPE & DEAL</span>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {normalizePropertyType(selectedPropDetails?.propertyType || selectedProp?.propertyType || selectedProp?.type)} • {(selectedPropDetails?.listingType || selectedProp?.listingType || 'RENT')}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>ROOMS</span>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {selectedPropDetails?.bedrooms != null ? selectedPropDetails.bedrooms : (selectedProp?.bedrooms != null ? selectedProp?.bedrooms : 3)} Beds • {selectedPropDetails?.bathrooms != null ? selectedPropDetails.bathrooms : (selectedProp?.bathrooms != null ? selectedProp?.bathrooms : 2)} Baths
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>AREA / SIZE</span>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {selectedPropDetails?.size ? `${Number(selectedPropDetails.size).toLocaleString()} ${selectedPropDetails.sizeUnit || 'sq ft'}` : (selectedProp?.size ? `${Number(selectedProp?.size).toLocaleString()} ${selectedProp?.sizeUnit || 'sq ft'}` : '1,500 sq ft')}
                            </strong>
                          </div>
                          {/* <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>FURNISHED STATUS</span>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              <span style={{
                                display: 'inline-block',
                                background: 'rgba(250, 179, 25, 0.14)',
                                color: '#b47404',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {formatFurnishedStatus(selectedPropDetails?.furnishedStatus || selectedProp?.furnishedStatus)}
                              </span>
                            </strong>
                          </div> */}
                          {/* <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>CONSTRUCTION</span>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              <span style={{
                                display: 'inline-block',
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: '#1d4ed8',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {selectedPropDetails?.constructionStatus || selectedProp?.constructionStatus || 'Off-plan'}
                              </span>
                            </strong>
                          </div> */}
                          {/* <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>SHORT-TERM RENTAL</span>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              <span style={{
                                display: 'inline-block',
                                background: (selectedPropDetails?.isShortTermRentalAllowed ?? selectedProp?.isShortTermRentalAllowed) ? 'rgba(34, 197, 94, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                color: (selectedPropDetails?.isShortTermRentalAllowed ?? selectedProp?.isShortTermRentalAllowed) ? '#15803d' : '#64748b',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {(selectedPropDetails?.isShortTermRentalAllowed ?? selectedProp?.isShortTermRentalAllowed) ? 'Allowed' : 'Not Allowed'}
                              </span>
                            </strong>
                          </div> */}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Multilingual Description */}
                  {(selectedPropDetails?.description || selectedProp.description) && (
                    <div>
                      <h5 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>
                        Description
                      </h5>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {getPropertyDescription(selectedPropDetails?.description || selectedProp.description)}
                      </p>
                    </div>
                  )}

                  {/* Amenities List */}
                  {((selectedPropDetails?.amenities && selectedPropDetails.amenities.length > 0) || (selectedProp.amenities && selectedProp.amenities.length > 0)) && (
                    <div>
                      <h5 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                        Featured Amenities
                      </h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(selectedPropDetails?.amenities || selectedProp.amenities).map((amenity, idx) => {
                          const name = getAmenityDisplayName(amenity);
                          const aKey = typeof amenity === 'object' ? (amenity._id || amenity.id || idx) : amenity || idx;
                          return (
                            <span
                              key={aKey}
                              style={{
                                fontSize: '0.75rem',
                                background: 'rgba(250, 179, 25, 0.1)',
                                color: '#b47404',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 600
                              }}
                            >
                              ✓ {name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Agent Details */}
                  {(selectedPropDetails?.agentDetails || selectedProp.agentDetails) && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                      <h5 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={14} color="var(--primary)" />
                        Assigned Agent
                      </h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {(selectedPropDetails?.agentDetails?.name || selectedProp.agentDetails?.name) && (
                          <span><strong>Name:</strong> {selectedPropDetails?.agentDetails?.name || selectedProp.agentDetails?.name}</span>
                        )}
                        {(selectedPropDetails?.agentDetails?.phone || selectedProp.agentDetails?.phone) && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Phone size={12} /> {selectedPropDetails?.agentDetails?.phone || selectedProp.agentDetails?.phone}
                          </span>
                        )}
                        {(selectedPropDetails?.agentDetails?.email || selectedProp.agentDetails?.email) && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Mail size={12} /> {selectedPropDetails?.agentDetails?.email || selectedProp.agentDetails?.email}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const p = selectedProp;
                    setSelectedProp(null);
                    handleEditClick(p);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Edit2 size={14} />
                  Edit Property
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-danger"
                  onClick={() => {
                    const p = selectedProp;
                    setPropertyToDelete(p);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Trash2 size={14} />
                  Delete Property
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedProp.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => handleToggleStatus(selectedProp)}
                  disabled={actionLoading === (selectedProp._id || selectedProp.id)}
                >
                  {actionLoading === (selectedProp._id || selectedProp.id) ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Updating Status...
                    </>
                  ) : selectedProp.status === 'Active' ? (
                    'Deactivate Listing'
                  ) : (
                    'Activate Listing'
                  )}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedProp(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MERGE DUPLICATE SPLIT MODAL */}
      {mergingProps && createPortal(
        <div className="modal-overlay" onClick={() => setMergingProps(null)}>
          <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} className="text-danger" />
                Merge Duplicate Property Records
              </h3>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setMergingProps(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                The system detected matching parameters between these listings. Select the core master record to preserve. The alternative listing will be merged and purged from the sync database.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Left Card Option */}
                <div
                  onClick={() => setMasterSelect('left')}
                  style={{
                    background: '#faf8f5',
                    border: '2px solid',
                    borderColor: masterSelect === 'left' ? 'var(--primary)' : 'var(--border-color)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {masterSelect === 'left' && <span className="badge badge-primary" style={{ position: 'absolute', top: '10px', right: '10px' }}>Master Source</span>}
                  <span className="badge badge-info" style={{ marginBottom: '0.5rem' }}>{mergingProps[0].portal}</span>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{mergingProps[0].title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <p><strong>Price:</strong> {formatPriceString(mergingProps[0])}</p>
                    <p><strong>Location:</strong> {mergingProps[0].location}</p>
                    <p><strong>Beds:</strong> {mergingProps[0].bedrooms}</p>
                    {mergingProps[0].furnishedStatus && <p><strong>Furnishing:</strong> {formatFurnishedStatus(mergingProps[0].furnishedStatus)}</p>}
                    <p><strong>Scraped Date:</strong> {mergingProps[0].scrapedAt}</p>
                  </div>
                </div>

                {/* Right Card Option */}
                <div
                  onClick={() => setMasterSelect('right')}
                  style={{
                    background: '#faf8f5',
                    border: '2px solid',
                    borderColor: masterSelect === 'right' ? 'var(--primary)' : 'var(--border-color)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {masterSelect === 'right' && <span className="badge badge-primary" style={{ position: 'absolute', top: '10px', right: '10px' }}>Master Source</span>}
                  <span className="badge badge-warning" style={{ marginBottom: '0.5rem' }}>{mergingProps[1].portal}</span>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{mergingProps[1].title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <p><strong>Price:</strong> {formatPriceString(mergingProps[1])}</p>
                    <p><strong>Location:</strong> {mergingProps[1].location}</p>
                    <p><strong>Beds:</strong> {mergingProps[1].bedrooms}</p>
                    {mergingProps[1].furnishedStatus && <p><strong>Furnishing:</strong> {formatFurnishedStatus(mergingProps[1].furnishedStatus)}</p>}
                    <p><strong>Scraped Date:</strong> {mergingProps[1].scrapedAt}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setMergingProps(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleExecuteMerge}>
                Consolidate & Merge Records
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD NEW PROPERTY MODAL (POST /admin/properties/add) */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => !addSubmitting && setShowAddModal(false)}>
          <form
            className="modal-content"
            style={{ maxWidth: '820px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
            onSubmit={handleAddSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(250, 179, 25, 0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Create Property Listing</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Add asset details, coordinates, platform amenities, and upload multiple high-res photos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !addSubmitting && setShowAddModal(false)}
                disabled={addSubmitting}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="modal-body" style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* 1. Multilingual Titles & Descriptions */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    1. Multilingual Title & Overview
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${addFormTab === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '2px 10px', fontSize: '0.75rem', height: '26px' }}
                      onClick={() => setAddFormTab('en')}
                    >
                      🇺🇸 English (EN)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${addFormTab === 'es' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '2px 10px', fontSize: '0.75rem', height: '26px' }}
                      onClick={() => setAddFormTab('es')}
                    >
                      🇩🇴 Español (ES)
                    </button>
                  </div>
                </div>

                {addFormTab === 'en' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>English Title (enTitle) *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Ocean View Luxury Villa in Las Terrenas"
                        value={addFormEnTitle}
                        onChange={(e) => setAddFormEnTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>English Description (enDescription)</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Describe key architectural features, sea view, natural light, security..."
                        value={addFormEnDescription}
                        onChange={(e) => setAddFormEnDescription(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Título en Español (esTitle)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Villa de Lujo con Vista al Mar en Las Terrenas"
                        value={addFormEsTitle}
                        onChange={(e) => setAddFormEsTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Descripción en Español (esDescription)</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Describa los atributos arquitectónicos, vistas panorámicas, piscina..."
                        value={addFormEsDescription}
                        onChange={(e) => setAddFormEsDescription(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Classification & Pricing */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
                  2. Classification & Multi-Currency Pricing
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Property Type *</label>
                    <select
                      className="form-control form-select"
                      value={toApiPropertyType(addFormPropertyType)}
                      onChange={(e) => setAddFormPropertyType(e.target.value)}
                    >
                      <option value="APARTMENT">Apartment</option>
                      <option value="HOUSE">House</option>
                      <option value="LAND">Land/Solar (Terreno)</option>
                      <option value="OFFICE">Office</option>
                      <option value="COMMERCIAL">Commercial Local</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Listing Type *</label>
                    <select
                      className="form-control form-select"
                      value={addFormListingType}
                      onChange={(e) => setAddFormListingType(e.target.value)}
                    >
                      <option value="BUY">BUY</option>
                      <option value="RENT">RENT</option>
                    </select>
                  </div>

                  {/* <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Construction Status *</label>
                    <select
                      className="form-control form-select"
                      value={addFormConstructionStatus}
                      onChange={(e) => setAddFormConstructionStatus(e.target.value)}
                      required
                    >
                      <option value="Off-plan">Off-plan</option>
                      <option value="Brand New">Brand New</option>
                      <option value="Resale">Resale</option>
                    </select>
                  </div> */}

                  {/* <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Furnished Status *</label>
                    <select
                      className="form-control form-select"
                      value={addFormFurnishedStatus}
                      onChange={(e) => setAddFormFurnishedStatus(e.target.value)}
                    >
                      <option value="FULLY_FURNISHED">Fully Furnished</option>
                      <option value="SEMI_FURNISHED">Semi Furnished</option>
                      <option value="UNFURNISHED">Unfurnished</option>
                    </select>
                  </div> */}

                  {/* <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Short-Term Rental</label>
                    <select
                      className="form-control form-select"
                      value={addFormIsShortTermRentalAllowed ? 'true' : 'false'}
                      onChange={(e) => setAddFormIsShortTermRentalAllowed(e.target.value === 'true')}
                    >
                      <option value="false">No (Not Allowed)</option>
                      <option value="true">Yes (Allowed)</option>
                    </select>
                  </div> */}
                </div>

                {/* Pricing Fields: DOP, USD, EUR */}
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Property Pricing in Multi-Currency (price[dop], price[usd], price[eur])
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#b47404' }}>DOP (RD$)</span> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>price[dop]</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 5500000"
                      value={addFormPriceDop}
                      onChange={(e) => setAddFormPriceDop(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>USD ($) *</span> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>price[usd]</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 95000"
                      value={addFormPriceUsd}
                      onChange={(e) => setAddFormPriceUsd(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#0369a1' }}>EUR (€)</span> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>price[eur]</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 88000"
                      value={addFormPriceEur}
                      onChange={(e) => setAddFormPriceEur(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Specs: Bedrooms, Bathrooms, Size */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
                  3. Space & Layout Specifications
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Bedrooms</label>
                    <input
                      type="number"
                      className="form-control"
                      value={addFormBedrooms}
                      onChange={(e) => setAddFormBedrooms(parseInt(e.target.value, 10) || 0)}
                      min={0}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Bathrooms</label>
                    <input
                      type="number"
                      className="form-control"
                      value={addFormBathrooms}
                      onChange={(e) => setAddFormBathrooms(parseInt(e.target.value, 10) || 0)}
                      min={0}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Size Area</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 1500"
                      value={addFormSize}
                      onChange={(e) => setAddFormSize(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Size Unit</label>
                    <select
                      className="form-control form-select"
                      value={addFormSizeUnit}
                      onChange={(e) => setAddFormSizeUnit(e.target.value)}
                    >
                      <option value="sq ft">sq ft</option>
                      <option value="sq m">sq m</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Location Details */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
                  4. Location & Geographic Coordinates
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Address (Street & Number) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Av. Francisco Alberto Caamaño Deñó #10"
                      value={addFormAddress}
                      onChange={(e) => setAddFormAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Area / Sector *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Piantini"
                      value={addFormArea}
                      onChange={(e) => setAddFormArea(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>City *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Santo Domingo"
                      value={addFormCity}
                      onChange={(e) => setAddFormCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>State / Province *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Distrito Nacional"
                      value={addFormState}
                      onChange={(e) => setAddFormState(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Country</label>
                    <input
                      type="text"
                      className="form-control"
                      value={addFormCountry}
                      onChange={(e) => setAddFormCountry(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Pincode / Postal Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 10107"
                      value={addFormPincode}
                      onChange={(e) => setAddFormPincode(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Latitude</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 18.471861"
                      value={addFormLatitude}
                      onChange={(e) => setAddFormLatitude(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Longitude</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. -69.939224"
                      value={addFormLongitude}
                      onChange={(e) => setAddFormLongitude(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Amenities (Live GET /admin/amenities) */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    5. Amenities ({addFormSelectedAmenities.length} selected)
                  </span>
                  {amenitiesList.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                        onClick={() => {
                          const allIds = amenitiesList.map(a => a._id || a.id).filter(Boolean);
                          setAddFormSelectedAmenities(allIds);
                        }}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                        onClick={() => setAddFormSelectedAmenities([])}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {amenitiesLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    <Loader2 size={14} className="animate-spin" />
                    Loading available amenities...
                  </div>
                ) : amenitiesList.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                    {amenitiesList.map((amenity) => {
                      const aId = amenity._id || amenity.id;
                      const aName = typeof amenity.name === 'object'
                        ? (amenity.name.en || amenity.name.es || Object.values(amenity.name)[0])
                        : (amenity.name || 'Amenity');
                      const isSelected = addFormSelectedAmenities.includes(aId);

                      return (
                        <button
                          key={aId}
                          type="button"
                          onClick={() => toggleAmenitySelection(aId)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.2s ease',
                            background: isSelected ? 'var(--primary)' : '#ffffff',
                            color: isSelected ? '#121826' : 'var(--text-primary)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                            boxShadow: isSelected ? '0 2px 6px rgba(250, 179, 25, 0.35)' : 'none'
                          }}
                        >
                          {isSelected ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
                          {aName}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    No system amenities configured. (Endpoint: /admin/amenities)
                  </p>
                )}
              </div>

              {/* 6. Owner / Agent Info */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
                  6. Owner / Representative Details
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Owner Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Carlos Santana"
                      value={addFormOwnerName}
                      onChange={(e) => setAddFormOwnerName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Contact Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. +1 (809) 555-0199"
                      value={addFormOwnerPhone}
                      onChange={(e) => setAddFormOwnerPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. carlos@realty.do"
                      value={addFormOwnerEmail}
                      onChange={(e) => setAddFormOwnerEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 7. Property Images (Multiple File Upload) */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      7. Property Photo Gallery
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Upload multiple images. They will display seamlessly in the interactive property slider.
                    </span>
                  </div>
                  <label
                    className="btn btn-secondary btn-sm"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
                  >
                    <Upload size={14} />
                    Choose Files
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleMultipleImagesChange}
                    />
                  </label>
                </div>

                {/* Selected Images Grid Previews */}
                {addFormImagePreviews.length > 0 ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: '0.75rem',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '4px'
                  }}>
                    {addFormImagePreviews.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          height: '90px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: '#ffffff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          title="Remove photo"
                        >
                          <X size={12} />
                        </button>
                        <span style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          padding: '2px 4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    border: '2px dashed rgba(10, 31, 57, 0.15)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)'
                  }}>
                    <ImageIcon size={30} style={{ margin: '0 auto 0.4rem', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>
                      No photos attached yet. Click <strong>Choose Files</strong> to select multiple property images.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', background: '#faf8f5' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
                disabled={addSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={addSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {addSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting Property...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Property Listing
                  </>
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* EDIT PROPERTY MODAL (PUT /admin/properties/:id) */}
      {editingProp && createPortal(
        <div className="modal-overlay" onClick={() => !editSubmitting && setEditingProp(null)}>
          <form
            className="modal-content"
            style={{ maxWidth: '820px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
            onSubmit={handleEditSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Edit Property Listing</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Update multilingual info, location, specs, amenities, and append new property images.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !editSubmitting && setEditingProp(null)}
                disabled={editSubmitting}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="modal-body" style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* 1. Multilingual Titles & Descriptions */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    1. Multilingual Title & Overview
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${editFormTab === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '2px 10px', fontSize: '0.75rem', height: '26px' }}
                      onClick={() => setEditFormTab('en')}
                    >
                      🇺🇸 English (EN)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${editFormTab === 'es' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '2px 10px', fontSize: '0.75rem', height: '26px' }}
                      onClick={() => setEditFormTab('es')}
                    >
                      🇩🇴 Español (ES)
                    </button>
                  </div>
                </div>

                {editFormTab === 'en' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>English Title (enTitle) *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Ocean View Luxury Villa"
                        value={editFormEnTitle}
                        onChange={(e) => setEditFormEnTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>English Description (enDescription)</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Describe key architectural features, views, security..."
                        value={editFormEnDescription}
                        onChange={(e) => setEditFormEnDescription(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Título en Español (esTitle)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Villa de Lujo con Vista al Mar"
                        value={editFormEsTitle}
                        onChange={(e) => setEditFormEsTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Descripción en Español (esDescription)</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Describa los atributos arquitectónicos, vistas panorámicas..."
                        value={editFormEsDescription}
                        onChange={(e) => setEditFormEsDescription(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Classification & Pricing */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
                  2. Classification & Multi-Currency Pricing
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Property Type *</label>
                    <select
                      className="form-control form-select"
                      value={toApiPropertyType(editFormPropertyType)}
                      onChange={(e) => setEditFormPropertyType(e.target.value)}
                    >
                      <option value="APARTMENT">Apartment</option>
                      <option value="HOUSE">House</option>
                      <option value="LAND">Land/Solar (Terreno)</option>
                      <option value="OFFICE">Office</option>
                      <option value="COMMERCIAL">Commercial Local</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Listing Type *</label>
                    <select
                      className="form-control form-select"
                      value={editFormListingType}
                      onChange={(e) => setEditFormListingType(e.target.value)}
                    >
                      <option value="BUY">BUY</option>
                      <option value="RENT">RENT</option>
                    </select>
                  </div>

                  {/* <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Construction Status *</label>
                    <select
                      className="form-control form-select"
                      value={editFormConstructionStatus}
                      onChange={(e) => setEditFormConstructionStatus(e.target.value)}
                      required
                    >
                      <option value="Off-plan">Off-plan</option>
                      <option value="Brand New">Brand New</option>
                      <option value="Resale">Resale</option>
                    </select>
                  </div> */}

                  {/* <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Furnished Status *</label>
                    <select
                      className="form-control form-select"
                      value={editFormFurnishedStatus}
                      onChange={(e) => setEditFormFurnishedStatus(e.target.value)}
                    >
                      <option value="FULLY_FURNISHED">Fully Furnished</option>
                      <option value="SEMI_FURNISHED">Semi Furnished</option>
                      <option value="UNFURNISHED">Unfurnished</option>
                    </select>
                  </div> */}

                  {/* <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Short-Term Rental</label>
                    <select
                      className="form-control form-select"
                      value={editFormIsShortTermRentalAllowed ? 'true' : 'false'}
                      onChange={(e) => setEditFormIsShortTermRentalAllowed(e.target.value === 'true')}
                    >
                      <option value="false">No (Not Allowed)</option>
                      <option value="true">Yes (Allowed)</option>
                    </select>
                  </div> */}
                </div>

                {/* Pricing Fields: DOP, USD, EUR */}
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Property Pricing in Multi-Currency (price[dop], price[usd], price[eur])
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#b47404' }}>DOP (RD$)</span> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>price[dop]</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 5500000"
                      value={editFormPriceDop}
                      onChange={(e) => setEditFormPriceDop(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>USD ($) *</span> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>price[usd]</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 95000"
                      value={editFormPriceUsd}
                      onChange={(e) => setEditFormPriceUsd(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#0369a1' }}>EUR (€)</span> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>price[eur]</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 88000"
                      value={editFormPriceEur}
                      onChange={(e) => setEditFormPriceEur(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Space & Layout Specifications */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
                  3. Space & Layout Specifications
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Bedrooms</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editFormBedrooms}
                      onChange={(e) => setEditFormBedrooms(parseInt(e.target.value, 10) || 0)}
                      min={0}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Bathrooms</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editFormBathrooms}
                      onChange={(e) => setEditFormBathrooms(parseInt(e.target.value, 10) || 0)}
                      min={0}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Size Area</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 1500"
                      value={editFormSize}
                      onChange={(e) => setEditFormSize(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Size Unit</label>
                    <select
                      className="form-control form-select"
                      value={editFormSizeUnit}
                      onChange={(e) => setEditFormSizeUnit(e.target.value)}
                    >
                      <option value="sq ft">sq ft</option>
                      <option value="sq m">sq m</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Location Details */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
                  4. Location & Geographic Coordinates
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Address (Street & Number) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Av. Francisco Alberto Caamaño Deñó #10"
                      value={editFormAddress}
                      onChange={(e) => setEditFormAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Area / Sector *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Piantini"
                      value={editFormArea}
                      onChange={(e) => setEditFormArea(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>City *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Santo Domingo"
                      value={editFormCity}
                      onChange={(e) => setEditFormCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>State / Province *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Distrito Nacional"
                      value={editFormState}
                      onChange={(e) => setEditFormState(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Country</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormCountry}
                      onChange={(e) => setEditFormCountry(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Pincode / Postal Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 10107"
                      value={editFormPincode}
                      onChange={(e) => setEditFormPincode(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Latitude</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 18.471861"
                      value={editFormLatitude}
                      onChange={(e) => setEditFormLatitude(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Longitude</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. -69.939224"
                      value={editFormLongitude}
                      onChange={(e) => setEditFormLongitude(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Amenities Selection */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    5. Amenities ({editFormSelectedAmenities.length} selected)
                  </span>
                  {amenitiesList.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                        onClick={() => {
                          const allIds = amenitiesList.map(a => a._id || a.id).filter(Boolean);
                          setEditFormSelectedAmenities(allIds);
                        }}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                        onClick={() => setEditFormSelectedAmenities([])}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {amenitiesList.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                    {amenitiesList.map((amenity) => {
                      const aId = amenity._id || amenity.id;
                      const aName = typeof amenity.name === 'object'
                        ? (amenity.name.en || amenity.name.es || Object.values(amenity.name)[0])
                        : (amenity.name || 'Amenity');
                      const isSelected = editFormSelectedAmenities.includes(aId);

                      return (
                        <button
                          key={aId}
                          type="button"
                          onClick={() => toggleEditAmenitySelection(aId)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.2s ease',
                            background: isSelected ? 'var(--primary)' : '#ffffff',
                            color: isSelected ? '#121826' : 'var(--text-primary)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                            boxShadow: isSelected ? '0 2px 6px rgba(250, 179, 25, 0.35)' : 'none'
                          }}
                        >
                          {isSelected ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
                          {aName}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    No system amenities configured.
                  </p>
                )}
              </div>

              {/* 6. Owner / Agent Details */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
                  6. Owner / Representative Details
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Owner Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Carlos Santana"
                      value={editFormOwnerName}
                      onChange={(e) => setEditFormOwnerName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Contact Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. +1 (809) 555-0199"
                      value={editFormOwnerPhone}
                      onChange={(e) => setEditFormOwnerPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. carlos@realty.do"
                      value={editFormOwnerEmail}
                      onChange={(e) => setEditFormOwnerEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 7. Property Photo Gallery (Existing & New) */}
              <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      7. Property Photo Gallery
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      View current photos and attach additional images.
                    </span>
                  </div>
                  <label
                    className="btn btn-secondary btn-sm"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
                  >
                    <Upload size={14} />
                    Add More Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleEditNewImagesChange}
                    />
                  </label>
                </div>

                {/* Unified Photo Gallery Grid (Server Active + New Uploads) */}
                {(editFormExistingImages.length > 0 || editFormNewImagePreviews.length > 0) ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                    gap: '0.85rem',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    padding: '4px'
                  }}>
                    {/* Active Photos on Server with Delete Button */}
                    {editFormExistingImages.map((imgUrl, idx) => (
                      <div
                        key={`existing-${idx}`}
                        style={{
                          position: 'relative',
                          height: '98px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '2px solid rgba(10, 31, 57, 0.12)',
                          boxShadow: 'var(--shadow-sm)',
                          background: '#ffffff'
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Existing ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80';
                          }}
                        />
                        {/* Server Photo Badge */}
                        <span style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          background: 'rgba(10, 31, 57, 0.75)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          Server #{idx + 1}
                        </span>
                        {/* Remove from server button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.92)',
                            color: '#ffffff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                            transition: 'all 0.2s ease',
                            padding: 0
                          }}
                          title="Delete this photo from property"
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#dc2626'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.92)'; }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {/* New Upload Previews with Remove Button */}
                    {editFormNewImagePreviews.map((item, idx) => (
                      <div
                        key={`new-${idx}`}
                        style={{
                          position: 'relative',
                          height: '98px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '2px solid var(--primary)',
                          boxShadow: 'var(--shadow-sm)',
                          background: '#ffffff'
                        }}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {/* New Upload Badge */}
                        <span style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          background: 'rgba(16, 185, 129, 0.9)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          New
                        </span>
                        {/* Remove staged image button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveEditNewImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.92)',
                            color: '#ffffff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                            transition: 'all 0.2s ease',
                            padding: 0
                          }}
                          title="Remove staged photo"
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#dc2626'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.92)'; }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    border: '2px dashed rgba(10, 31, 57, 0.15)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)'
                  }}>
                    <ImageIcon size={30} style={{ margin: '0 auto 0.4rem', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>
                      No photos attached to this property. Click <strong>Add More Photos</strong> above to attach photos.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', background: '#faf8f5' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingProp(null)}
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {editSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save Property Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* DELETE PROPERTY CONFIRMATION MODAL (DELETE /admin/properties/:id) */}
      {propertyToDelete && createPortal(
        <div className="modal-overlay" onClick={() => !isDeleting && setPropertyToDelete(null)}>
          <div
            className="modal-content animate-slide-up"
            style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Danger Accent */}
            <div style={{
              background: '#fef2f2',
              borderBottom: '1px solid #fee2e2',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#991b1b', fontWeight: 700 }}>
                  Confirm Property Deletion
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#b91c1c' }}>
                  This action is permanent and cannot be undone.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !isDeleting && setPropertyToDelete(null)}
                disabled={isDeleting}
                style={{ color: '#991b1b' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this property listing from the database?
              </p>

              {/* Property Summary Card Preview */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.85rem',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'center'
              }}>
                <img
                  src={propertyToDelete.image}
                  alt={propertyToDelete.title}
                  style={{
                    width: '64px',
                    height: '64px',
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
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 0.25rem 0',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {propertyToDelete.title}
                  </h4>
                  <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    📍 {propertyToDelete.location}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                      {formatPriceString(propertyToDelete)}
                    </strong>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                      {normalizePropertyType(propertyToDelete.type || propertyToDelete.propertyType)}
                    </span>
                    <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                      {propertyToDelete.listingType}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              background: '#faf8f5',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPropertyToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  fontWeight: 600,
                  borderRadius: '6px'
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting Property...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Yes, Delete Property
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
