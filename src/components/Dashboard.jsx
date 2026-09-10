import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../context/StateContext';
import { getCookie } from '../utils/cookies';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users,
  Building,
  Home,
  FileText,
  BrainCircuit,
  Database,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  RefreshCw,
  Loader2,
  Search,
  Zap,
  CheckCircle2,
  Globe,
  MapPin,
  Bot,
  BarChart3,
  PieChart,
  Table as TableIcon,
  Flame,
  AlertTriangle,
  Layers
} from 'lucide-react';

export default function Dashboard() {
  const {
    adminUser,
    portalSyncState,
    handleTriggerSyncStart: onTriggerManualSync
  } = useStateContext();

  const navigate = useNavigate();
  const onNavigate = (tabId) => navigate('/' + tabId);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Live Dashboard API State
  const [dashboardData, setDashboardData] = useState(null);
  const [searchAnalyticsData, setSearchAnalyticsData] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Time Range & Filter Controls for Dashboard Analytics
  const [timeRange, setTimeRange] = useState('7d');
  const [leadsFilter, setLeadsFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [searchViewTab, setSearchViewTab] = useState('locations'); // 'locations' | 'unmet'
  const [searchDisplayMode, setSearchDisplayMode] = useState('bars'); // 'bars' | 'donut' | 'table'
  const [hoveredLocationItem, setHoveredLocationItem] = useState(null);
  const [hoveredLeadIndex, setHoveredLeadIndex] = useState(null);
  const [hoveredSearchIndex, setHoveredSearchIndex] = useState(null);
  const [hoveredAiIndex, setHoveredAiIndex] = useState(null);
  const [hoveredLeadStatus, setHoveredLeadStatus] = useState(null);
  const [hoveredAiStatus, setHoveredAiStatus] = useState(null);

  // Fetch Dashboard Stats & Search Analytics from Backend APIs
  const fetchDashboardData = useCallback(async (isManual = false) => {
    const token = adminUser?.token ||
      getCookie('token') ||
      getCookie('klever_auth_data')?.data?.accessToken ||
      getCookie('klever_auth_data')?.data?.token ||
      getCookie('klever_auth_data')?.token;

    if (!token) {
      setLoading(false);
      setSearchLoading(false);
      return;
    }

    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setSearchLoading(true);
      }

      const headers = {
        Authorization: `Bearer ${token}`
      };

      // 1. Parallel fetch for Dashboard Metrics, Search Analytics & Recent Audit Logs (5 items)
      const [dashResult, searchResult, logsResult] = await Promise.allSettled([
        axios.get(`${baseUrl}/admin/dashboard`, { headers }).catch(async (err1) => {
          if (err1.response?.status === 404) {
            return axios.get(`${baseUrl}/admin/dashboard/metrics`, { headers });
          }
          throw err1;
        }),
        axios.get(`${baseUrl}/admin/search-analytics`, { headers }),
        axios.get(`${baseUrl}/admin/logs`, {
          headers,
          params: { page: 1, limit: 5 }
        }).catch(async (errLogs) => {
          if (errLogs.response?.status === 405) {
            return axios.delete(`${baseUrl}/admin/logs`, {
              headers,
              params: { page: 1, limit: 5 }
            });
          }
          throw errLogs;
        })
      ]);

      // Process /admin/dashboard response
      if (dashResult.status === 'fulfilled') {
        const responseData = dashResult.value.data?.data || dashResult.value.data || {};
        setDashboardData(responseData);
      } else {
        console.error('Failed to fetch dashboard metrics:', dashResult.reason);
        setDashboardData({});
      }

      // Process /admin/search-analytics response
      if (searchResult.status === 'fulfilled') {
        const sData = searchResult.value.data?.data || searchResult.value.data || {};
        setSearchAnalyticsData(sData);
      } else {
        console.warn('Failed to fetch search analytics from /admin/search-analytics:', searchResult.reason);
      }

      // Process /admin/logs response (recent 5)
      if (logsResult.status === 'fulfilled') {
        const logsData = logsResult.value.data;
        let fetchedLogs = [];
        if (Array.isArray(logsData?.data?.logs)) {
          fetchedLogs = logsData.data.logs;
        } else if (Array.isArray(logsData?.logs)) {
          fetchedLogs = logsData.logs;
        } else if (Array.isArray(logsData?.data)) {
          fetchedLogs = logsData.data;
        } else if (Array.isArray(logsData)) {
          fetchedLogs = logsData;
        }
        setRecentLogs(fetchedLogs.slice(0, 5));
      } else {
        console.warn('Failed to fetch recent logs for dashboard:', logsResult.reason);
      }

      if (isManual) {
        toast.success('Dashboard & search analytics refreshed');
      }
    } catch (err) {
      console.error('Error in fetchDashboardData:', err);
      if (isManual) {
        toast.error(err.response?.data?.message || 'Failed to refresh analytics');
      }
    } finally {
      setLoading(false);
      setSearchLoading(false);
      setRefreshing(false);
    }
  }, [adminUser?.token, baseUrl]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Helper to format percentage change and trend badge
  const formatTrendData = (metricObj, fallbackCount, fallbackChange, defaultLabel) => {
    if (metricObj && typeof metricObj === 'object' && ('total' in metricObj || 'percentageChange' in metricObj)) {
      const total = Number(metricObj.total) || 0;
      const pct = metricObj.percentageChange;
      const trend = metricObj.trend || (pct > 0 ? 'increase' : pct < 0 ? 'decrease' : 'neutral');

      const numPct = typeof pct === 'number' ? pct : parseFloat(pct);
      const isDecrease = trend === 'decrease' || (!isNaN(numPct) && numPct < 0);
      const isIncrease = trend === 'increase' || (!isNaN(numPct) && numPct > 0);

      let badgeText = '';
      if (!isNaN(numPct)) {
        badgeText = `${numPct > 0 ? '+' : ''}${numPct}%`;
      } else if (pct !== undefined && pct !== null) {
        badgeText = `${pct}%`;
      }

      return {
        total,
        hasTrend: Boolean(badgeText),
        badgeText,
        trend: isDecrease ? 'decrease' : isIncrease ? 'increase' : 'neutral',
        subText: isDecrease ? 'decrease vs last month' : isIncrease ? 'increase vs last month' : 'no change',
        defaultLabel
      };
    }

    const total = Number(fallbackCount) || 0;
    return {
      total,
      hasTrend: false,
      badgeText: '',
      trend: 'neutral',
      subText: '',
      defaultLabel: fallbackChange || defaultLabel
    };
  };

  // 1. Users Metrics
  const usersMetric = formatTrendData(
    dashboardData?.users,
    dashboardData?.totalUsers ?? dashboardData?.usersCount ?? dashboardData?.totalBuyers ?? dashboardData?.buyers ?? 0,
    dashboardData?.userGrowth || dashboardData?.usersGrowth || dashboardData?.usersChange,
    'Registered buyers & tenants'
  );

  // 2. Agents / Realtors Metrics
  const agentsMetric = formatTrendData(
    dashboardData?.agents || dashboardData?.realtors,
    dashboardData?.totalRealtors ?? dashboardData?.totalAgents ?? dashboardData?.verifiedRealtors ?? dashboardData?.verifiedAgents ?? 0,
    dashboardData?.realtorGrowth || dashboardData?.realtorsGrowth || dashboardData?.agentsGrowth || dashboardData?.realtorsChange,
    'Verified partner realtors'
  );

  // 3. Properties Metrics
  const propertiesMetric = formatTrendData(
    dashboardData?.properties || dashboardData?.listings,
    dashboardData?.totalProperties ?? dashboardData?.propertiesCount ?? dashboardData?.totalListings ?? dashboardData?.listingsCount ?? 0,
    dashboardData?.propertiesChange || dashboardData?.listingsChange || dashboardData?.propertiesGrowth,
    'Active database listings'
  );

  // 4. Leads Metrics
  const leadsMetric = formatTrendData(
    dashboardData?.leads,
    dashboardData?.totalLeads ?? dashboardData?.leadsCount ?? dashboardData?.leadsGenerated ?? dashboardData?.totalLeadsGenerated ?? 0,
    dashboardData?.leadsChange || dashboardData?.leadsGrowth || dashboardData?.conversionRate,
    'Client inquiries & leads'
  );

  const cards = [
    {
      id: 'users',
      label: 'Total Buyers / Tenants',
      value: usersMetric.total,
      metricData: usersMetric,
      icon: Users,
      color: 'var(--primary)',
      gradient: 'linear-gradient(135deg, rgba(250, 179, 25, 0.08) 0%, rgba(250, 179, 25, 0.01) 100%)',
      borderColor: 'rgba(250, 179, 25, 0.2)',
      route: 'users'
    },
    {
      id: 'realtors',
      label: 'Verified Realtors',
      value: agentsMetric.total,
      metricData: agentsMetric,
      icon: Building,
      color: 'var(--success)',
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.01) 100%)',
      borderColor: 'rgba(16, 185, 129, 0.2)',
      route: 'realtors'
    },
    {
      id: 'properties',
      label: 'Property Listings',
      value: propertiesMetric.total,
      metricData: propertiesMetric,
      icon: Home,
      color: 'var(--info)',
      gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.01) 100%)',
      borderColor: 'rgba(6, 182, 212, 0.2)',
      route: 'properties'
    },
    {
      id: 'leads',
      label: 'Leads Generated',
      value: leadsMetric.total,
      metricData: leadsMetric,
      icon: FileText,
      color: 'var(--warning)',
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.01) 100%)',
      borderColor: 'rgba(245, 158, 11, 0.2)',
      route: 'realtors'
    }
  ];

  // ================= LIVE DASHBOARD METRICS: LEAD STATUSES & AI SEARCH ANALYTICS =================
  const leadStatusesData = useMemo(() => {
    const raw = dashboardData?.leadStatuses || dashboardData?.leadsStatus || {};
    const pending = Number(raw.pending ?? 12);
    const contacted = Number(raw.contacted ?? 1);
    const qualified = Number(raw.qualified ?? 2);
    const won = Number(raw.won ?? 0);
    const lost = Number(raw.lost ?? 0);
    const total = Number(raw.total) || (pending + contacted + qualified + won + lost) || 15;

    const calcPct = (val) => (total > 0 ? ((val / total) * 100).toFixed(1) : '0.0');

    return {
      total,
      pending,
      contacted,
      qualified,
      won,
      lost,
      items: [
        { key: 'pending', label: 'Pending Inquiry', count: pending, pct: calcPct(pending), color: '#fab319', bg: 'rgba(250, 179, 25, 0.08)', border: 'rgba(250, 179, 25, 0.25)' },
        { key: 'contacted', label: 'Contacted', count: contacted, pct: calcPct(contacted), color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.25)' },
        { key: 'qualified', label: 'Qualified Prospect', count: qualified, pct: calcPct(qualified), color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)' },
        { key: 'won', label: 'Won / Converted', count: won, pct: calcPct(won), color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.25)' },
        { key: 'lost', label: 'Lost / Dropped', count: lost, pct: calcPct(lost), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)' }
      ]
    };
  }, [dashboardData]);

  const aiSearchAnalytics = useMemo(() => {
    const raw = dashboardData?.AIUserSearchAnalytics ||
      dashboardData?.aiUserSearchAnalytics ||
      dashboardData?.aiSearchAnalytics ||
      {};

    const totalAiSearches = Number(raw.totalAiSearches ?? raw.totalSearches ?? raw.total ?? 75);
    const successRateStr = String(raw.successRate ?? '89.33%');
    const failureRateStr = String(raw.failureRate ?? '10.67%');

    const successNum = parseFloat(successRateStr) || 89.33;
    const failureNum = parseFloat(failureRateStr) || 10.67;

    const successCount = Math.round((totalAiSearches * successNum) / 100);
    const failureCount = Math.max(0, totalAiSearches - successCount);

    return {
      totalAiSearches,
      successRate: successRateStr.includes('%') ? successRateStr : `${successNum}%`,
      failureRate: failureRateStr.includes('%') ? failureRateStr : `${failureNum}%`,
      successNum,
      failureNum,
      successCount,
      failureCount,
      items: [
        { key: 'success', label: 'Successful Matches', count: successCount, pct: successNum.toFixed(1), color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)' },
        { key: 'failure', label: 'Unmet / Zero Match', count: failureCount, pct: failureNum.toFixed(1), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)' }
      ]
    };
  }, [dashboardData]);

  // ================= 1. LEADS DATA & GRAPH =================
  const leadsChartData = useMemo(() => [
    { day: 'Mon', leads: 18, aiMatches: 8, direct: 10 },
    { day: 'Tue', leads: 24, aiMatches: 14, direct: 10 },
    { day: 'Wed', leads: 32, aiMatches: 20, direct: 12 },
    { day: 'Thu', leads: 28, aiMatches: 16, direct: 12 },
    { day: 'Fri', leads: 45, aiMatches: 29, direct: 16 },
    { day: 'Sat', leads: 52, aiMatches: 34, direct: 18 },
    { day: 'Sun', leads: 38, aiMatches: 24, direct: 14 }
  ], []);

  const leadsList = useMemo(() => [
    {
      id: 'lead-101',
      name: 'Carlos Mendez',
      email: 'carlos.m@gmail.com',
      property: 'Luxury Beachfront Villa • Cap Cana',
      price: '$1,250,000',
      category: 'villa',
      realtor: 'Elena Rostova',
      source: 'AI Semantic Search',
      status: 'Qualified',
      statusColor: 'badge-success',
      time: '10 mins ago'
    },
    {
      id: 'lead-102',
      name: 'Sophie Dubois',
      email: 's.dubois@expat.fr',
      property: 'Modern High-Rise Condo • Piantini, SD',
      price: '$280,000',
      category: 'condo',
      realtor: 'Marcus Sterling',
      source: 'Direct Portal',
      status: 'In Discussion',
      statusColor: 'badge-info',
      time: '25 mins ago'
    },
    {
      id: 'lead-103',
      name: 'Juan & Maria Santana',
      email: 'santana.fam@outlook.com',
      property: 'Oceanview Penthouse • Las Terrenas',
      price: '$650,000',
      category: 'penthouse',
      realtor: 'Sofia Ramirez',
      source: 'WhatsApp Feed',
      status: 'New Inquiry',
      statusColor: 'badge-warning',
      time: '1 hour ago'
    },
    {
      id: 'lead-104',
      name: 'David Richardson',
      email: 'david.r@investrealty.us',
      property: 'Commercial Development Plot • Punta Cana',
      price: '$2,100,000',
      category: 'land',
      realtor: 'Carlos Vega',
      source: 'Realtor Network',
      status: 'Converted',
      statusColor: 'badge-primary',
      time: '3 hours ago'
    },
    {
      id: 'lead-105',
      name: 'Isabella Rossi',
      email: 'i.rossi@luxuryre.it',
      property: 'Golf Front Villa • Casa de Campo',
      price: '$1,850,000',
      category: 'villa',
      realtor: 'Elena Rostova',
      source: 'AI Matchmaker',
      status: 'Qualified',
      statusColor: 'badge-success',
      time: '5 hours ago'
    }
  ], []);

  const filteredLeads = useMemo(() => {
    if (leadsFilter === 'all') return leadsList;
    return leadsList.filter(l => l.category === leadsFilter);
  }, [leadsFilter, leadsList]);

  // Location Name Capitalization Helper
  const formatLocationName = (str) => {
    if (!str || typeof str !== 'string') return 'General';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // ================= 2. SEARCH ACTIVITY DATA & GRAPH (Live /admin/search-analytics) =================
  // 1. Top Locations from API (data.topLocations)
  const topLocationsList = useMemo(() => {
    const raw = searchAnalyticsData?.topLocations;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const totalCount = raw.reduce((sum, item) => sum + (Number(item.count) || 0), 0) || 1;
    const maxCount = Math.max(...raw.map(item => Number(item.count) || 0), 1);
    const palette = [
      { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', grad: 'linear-gradient(90deg, #f59e0b, #fbbf24)' },
      { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)', grad: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
      { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', grad: 'linear-gradient(90deg, #10b981, #34d399)' },
      { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.35)', grad: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' },
      { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.35)', grad: 'linear-gradient(90deg, #ec4899, #f472b6)' },
      { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.35)', grad: 'linear-gradient(90deg, #06b6d4, #22d3ee)' },
      { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)', grad: 'linear-gradient(90deg, #f97316, #fb923c)' },
      { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.35)', grad: 'linear-gradient(90deg, #6366f1, #818cf8)' },
      { color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.35)', grad: 'linear-gradient(90deg, #14b8a6, #2dd4bf)' },
      { color: '#84cc16', bg: 'rgba(132, 204, 22, 0.12)', border: 'rgba(132, 204, 22, 0.35)', grad: 'linear-gradient(90deg, #84cc16, #a3e635)' }
    ];
    return raw.map((item, idx) => {
      const count = Number(item.count) || 0;
      const share = Math.round((count / totalCount) * 100);
      const relativePercent = Math.round((count / maxCount) * 100);
      const pal = palette[idx % palette.length];
      return {
        id: `loc-${idx}`,
        location: item.location || '',
        formattedLocation: formatLocationName(item.location),
        count,
        share,
        relativePercent,
        color: pal.color,
        bg: pal.bg,
        border: pal.border,
        grad: pal.grad
      };
    });
  }, [searchAnalyticsData]);

  // 2. Zero-Result Unmet Searches from API (data.zeroResultSearches)
  const zeroResultList = useMemo(() => {
    const raw = searchAnalyticsData?.zeroResultSearches;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const maxUnmet = Math.max(...raw.map(item => Number(item.unmetSearches) || 0), 1);
    const totalUnmet = raw.reduce((sum, item) => sum + (Number(item.unmetSearches) || 0), 0) || 1;
    return raw.map((item, idx) => {
      const unmetSearches = Number(item.unmetSearches) || 0;
      const share = Math.round((unmetSearches / totalUnmet) * 100);
      const relativePercent = Math.round((unmetSearches / maxUnmet) * 100);
      return {
        id: `zero-${idx}`,
        location: item.location || '',
        formattedLocation: formatLocationName(item.location),
        unmetSearches,
        share,
        relativePercent
      };
    });
  }, [searchAnalyticsData]);

  // 3. Daily Volume Timeline from API (data.dailyVolume)
  const searchTimelineData = useMemo(() => {
    const raw = searchAnalyticsData?.dailyVolume;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw.map(item => {
      let label = item.date || 'Today';
      if (item.date) {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      }
      return {
        date: item.date || '',
        day: label,
        count: Number(item.count) || 0
      };
    });
  }, [searchAnalyticsData]);

  // 4. Search Summary Metrics (computed strictly from API data)
  const searchSummary = useMemo(() => {
    const totalSearches = searchAnalyticsData?.totalSearches ?? 0;
    const todaySearches = searchAnalyticsData?.todaySearches ?? 0;
    const totalDailyVolume = searchTimelineData.reduce((sum, d) => sum + d.count, 0);
    const totalTopLocationsCount = topLocationsList.reduce((sum, d) => sum + d.count, 0);
    const totalUnmetSearches = zeroResultList.reduce((sum, d) => sum + d.unmetSearches, 0);
    const topLocation = topLocationsList[0]?.formattedLocation || topLocationsList[0]?.location || 'N/A';
    const topCount = topLocationsList[0]?.count || 0;
    const topShare = topLocationsList[0]?.share || 0;

    return {
      totalSearches,
      todaySearches,
      totalDailyVolume,
      totalTopLocationsCount,
      totalTopLocations: topLocationsList.length,
      totalUnmetSearches,
      totalZeroResultLocations: zeroResultList.length,
      topLocation,
      topCount,
      topShare
    };
  }, [searchAnalyticsData, searchTimelineData, topLocationsList, zeroResultList]);

  // Filtered Top Locations for Search Input
  const filteredTopLocations = useMemo(() => {
    if (!searchFilter.trim()) return topLocationsList;
    const q = searchFilter.toLowerCase();
    return topLocationsList.filter(item =>
      item.location.toLowerCase().includes(q) || item.formattedLocation.toLowerCase().includes(q)
    );
  }, [topLocationsList, searchFilter]);

  // Filtered Zero-Result Searches for Search Input
  const filteredZeroResults = useMemo(() => {
    if (!searchFilter.trim()) return zeroResultList;
    const q = searchFilter.toLowerCase();
    return zeroResultList.filter(item =>
      item.location.toLowerCase().includes(q) || item.formattedLocation.toLowerCase().includes(q)
    );
  }, [zeroResultList, searchFilter]);

  // ================= 3. AI USAGE DATA & GRAPH =================
  const aiUsageTimeline = useMemo(() => [
    { day: 'Mon', prompts: 840, tokens: '1.2M', accuracy: 94.2 },
    { day: 'Tue', prompts: 1120, tokens: '1.6M', accuracy: 95.0 },
    { day: 'Wed', prompts: 1450, tokens: '2.1M', accuracy: 94.8 },
    { day: 'Thu', prompts: 1320, tokens: '1.9M', accuracy: 95.4 },
    { day: 'Fri', prompts: 1780, tokens: '2.5M', accuracy: 96.1 },
    { day: 'Sat', prompts: 2140, tokens: '3.1M', accuracy: 95.8 },
    { day: 'Sun', prompts: 1960, tokens: '2.8M', accuracy: 96.5 }
  ], []);

  const aiRecentInteractions = useMemo(() => [
    {
      id: 'ai-act-1',
      type: 'Semantic Property Search',
      user: 'Guest (Punta Cana Explorer)',
      query: '"Quiet 3 bed villa with pool walking distance to beach under 800k"',
      result: 'Found 6 matched properties with 96% relevance score',
      model: 'GPT-4o',
      latency: '1.04s',
      status: 'Success'
    },
    {
      id: 'ai-act-2',
      type: 'Listing Description Generator',
      user: 'Elena Rostova (Realtor)',
      query: '"Generate luxury English/Spanish listing copy for 4BDR Cap Cana Villa"',
      result: 'Generated 280-word bilingual marketing copy with SEO tags',
      model: 'GPT-4o',
      latency: '1.42s',
      status: 'Success'
    },
    {
      id: 'ai-act-3',
      type: 'Conversational Advisory',
      user: 'Sophie Dubois (Expat Buyer)',
      query: '"What are property tax laws (CONFOTUR) for foreigners in DR?"',
      result: 'Provided 15-year tax exemption summary and eligible projects',
      model: 'GPT-4o',
      latency: '1.15s',
      status: 'Success'
    },
    {
      id: 'ai-act-4',
      type: 'Automated Lead Qualification',
      user: 'System Bot',
      query: '"Score lead intent for inquiry #L-9482 (Budget $1.2M Cash)"',
      result: 'High Priority Lead (Score 94/100) assigned to Elena Rostova',
      model: 'GPT-4o',
      latency: '0.85s',
      status: 'Success'
    }
  ], []);

  // ================= 4. DATA SYNCHRONIZATION DATA =================
  const syncPortalsList = useMemo(() => [
    {
      id: 'p-1',
      name: 'SuperCasas Feed',
      type: 'REST API Feed',
      interval: 'Hourly',
      lastSync: '12 mins ago',
      syncedCount: '1,245',
      duration: '12s',
      errorRate: '0.0%',
      status: 'Active',
      badgeClass: 'badge-success'
    },
    {
      id: 'p-2',
      name: 'Corotos Scraper',
      type: 'HTML Parser Scraper',
      interval: 'Daily',
      lastSync: '45 mins ago',
      syncedCount: '752',
      duration: '34s',
      errorRate: '0.0%',
      status: 'Active',
      badgeClass: 'badge-success'
    },
    {
      id: 'p-3',
      name: 'InDominicana API',
      type: 'GraphQL Feed',
      interval: 'Hourly',
      lastSync: '18 mins ago',
      syncedCount: '480',
      duration: '8s',
      errorRate: '0.0%',
      status: 'Active',
      badgeClass: 'badge-success'
    },
    {
      id: 'p-4',
      name: 'DR-MLS Direct Sync',
      type: 'RESO Web API',
      interval: 'Real-time',
      lastSync: 'Just now',
      syncedCount: '915',
      duration: '4s',
      errorRate: '0.0%',
      status: 'Active',
      badgeClass: 'badge-success'
    }
  ], []);

  const syncRunHistory = useMemo(() => [
    {
      id: 'srun-1',
      time: 'Today 10:45 AM',
      feed: 'SuperCasas Feed',
      imported: '14 new listings',
      updated: '32 price updates',
      duration: '12s',
      status: 'Success'
    },
    {
      id: 'srun-2',
      time: 'Today 09:30 AM',
      feed: 'Corotos Scraper',
      imported: '8 new listings',
      updated: '19 price updates',
      duration: '28s',
      status: 'Success'
    },
    {
      id: 'srun-3',
      time: 'Today 08:15 AM',
      feed: 'InDominicana API',
      imported: '22 new listings',
      updated: '45 price updates',
      duration: '9s',
      status: 'Success'
    }
  ], []);

  // Logs to display: either from API response or context fallback
  const displayLogs = (Array.isArray(dashboardData?.recentLogs) && dashboardData.recentLogs.length > 0)
    ? dashboardData.recentLogs
    : (Array.isArray(dashboardData?.logs) && dashboardData.logs.length > 0)
      ? dashboardData.logs
      : recentLogs;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '2rem',
        background: 'linear-gradient(to right, rgba(245, 244, 220, 0.15), rgba(228, 223, 193, 0.5))',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(244, 97%, 75%)', fontWeight: 600 }}>
              <Sparkles size={18} />
              <span>Dominican Republic Real Estate Network</span>
            </div>
            <h2>Admin Overview & Operations Center</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Live real-time telemetry, lead pipelines, search patterns, AI query processing, and automated MLS property feed synchronization.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchDashboardData(true)}
              disabled={loading || refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title="Refresh dashboard metrics"
            >
              <RefreshCw size={14} className={refreshing ? 'spin-anim' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const m = card.metricData;
          return (
            <div
              key={card.id || idx}
              className="glass-panel"
              onClick={() => onNavigate(card.route)}
              style={{
                background: card.gradient,
                border: `1px solid ${card.borderColor}`,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(10, 31, 57, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex-between">
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{card.label}</span>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: card.color }}>
                  <Icon size={20} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '2.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {loading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6, fontSize: '1.5rem' }}>
                      <Loader2 size={24} className="spin-anim" />
                      0
                    </span>
                  ) : (
                    card.value.toLocaleString()
                  )}
                </h3>

                <div className="flex-align-center" style={{ gap: '0.45rem', marginTop: '0.5rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                  {m.hasTrend ? (
                    <>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: m.trend === 'decrease' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: m.trend === 'decrease' ? 'var(--danger)' : 'var(--success)',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}>
                        {m.trend === 'decrease' ? (
                          <TrendingDown size={13} />
                        ) : (
                          <TrendingUp size={13} />
                        )}
                        {m.badgeText}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {m.subText}
                      </span>
                    </>
                  ) : (
                    <div className="flex-align-center" style={{ gap: '0.35rem', color: 'var(--text-muted)' }}>
                      <TrendingUp size={12} style={{ color: card.color }} />
                      <span>{m.defaultLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= 2-COLUMN SECTION (COL-6): LEADS STATUSES & AI SEARCH ANALYTICS ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>

        {/* COL-6 (LEFT): LEADS STATUSES & PIPELINE */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <FileText size={19} className="text-warning" />
                  Lead Statuses & Pipeline
                </h3>
                <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                  <CheckCircle2 size={10} /> Live API
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Real-time inquiry capture volume & conversion status breakdown.
              </p>
            </div>
          </div>

          {/* Donut Chart + Breakdown Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'center' }}>
            {/* SVG Donut */}
            <div style={{ width: '210px', height: '210px', position: 'relative', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 240 240" width="100%" height="100%" style={{ overflow: 'visible', transform: 'rotate(-90deg)' }}>
                <circle cx="120" cy="120" r="84" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="26" />
                {(() => {
                  const circumference = 2 * Math.PI * 84;
                  let acc = 0;
                  return leadStatusesData.items.map((item) => {
                    const pct = (Number(item.pct) || 0) / 100;
                    if (pct <= 0) return null;
                    const strokeDash = `${pct * circumference} ${circumference * (1 - pct)}`;
                    const strokeOffset = -(acc * circumference);
                    acc += pct;
                    const isHovered = hoveredLeadStatus === item.key;
                    return (
                      <circle
                        key={item.key}
                        cx="120"
                        cy="120"
                        r="84"
                        fill="none"
                        stroke={item.color}
                        strokeWidth={isHovered ? 32 : 26}
                        strokeDasharray={strokeDash}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="butt"
                        style={{
                          transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                          cursor: 'pointer',
                          filter: isHovered ? `drop-shadow(0 0 8px ${item.color})` : 'none'
                        }}
                        onMouseEnter={() => setHoveredLeadStatus(item.key)}
                        onMouseLeave={() => setHoveredLeadStatus(null)}
                      />
                    );
                  });
                })()}
              </svg>
              {/* Donut Center Overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                textAlign: 'center',
                padding: '0.5rem'
              }}>
                {hoveredLeadStatus ? (
                  <>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: leadStatusesData.items.find(i => i.key === hoveredLeadStatus)?.color || 'var(--text-primary)', lineHeight: 1 }}>
                      {leadStatusesData.items.find(i => i.key === hoveredLeadStatus)?.count}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                      {leadStatusesData.items.find(i => i.key === hoveredLeadStatus)?.pct}%
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {loading ? '...' : leadStatusesData.total}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                      Total Leads
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Status Breakdown Pills & Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {leadStatusesData.items.map((item) => {
                const isHovered = hoveredLeadStatus === item.key;
                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHoveredLeadStatus(item.key)}
                    onMouseLeave={() => setHoveredLeadStatus(null)}
                    style={{
                      background: isHovered ? item.bg : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${isHovered ? item.border : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      padding: '0.42rem 0.75rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex-between">
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: item.color }} />
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: item.color }}>
                        {item.count} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>({item.pct}%)</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginTop: '0.35rem', overflow: 'hidden' }}>
                      <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COL-6 (RIGHT): AI USER SEARCH ANALYTICS & INTELLIGENCE */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <BrainCircuit size={19} className="text-success" />
                  AI User Search Analytics
                </h3>
                <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                  <Bot size={10} /> GPT-4o
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                LLM query parsing accuracy and match telemetry.
              </p>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.55rem' }}>
              {aiSearchAnalytics.successRate} Success
            </span>
          </div>

          {/* Donut Chart + Success/Failure Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'center' }}>
            {/* SVG Donut */}
            <div style={{ width: '210px', height: '210px', position: 'relative', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 240 240" width="100%" height="100%" style={{ overflow: 'visible', transform: 'rotate(-90deg)' }}>
                <circle cx="120" cy="120" r="84" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="26" />
                {(() => {
                  const circumference = 2 * Math.PI * 84;
                  let acc = 0;
                  return aiSearchAnalytics.items.map((item) => {
                    const pct = (Number(item.pct) || 0) / 100;
                    if (pct <= 0) return null;
                    const strokeDash = `${pct * circumference} ${circumference * (1 - pct)}`;
                    const strokeOffset = -(acc * circumference);
                    acc += pct;
                    const isHovered = hoveredAiStatus === item.key;
                    return (
                      <circle
                        key={item.key}
                        cx="120"
                        cy="120"
                        r="84"
                        fill="none"
                        stroke={item.color}
                        strokeWidth={isHovered ? 32 : 26}
                        strokeDasharray={strokeDash}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="butt"
                        style={{
                          transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                          cursor: 'pointer',
                          filter: isHovered ? `drop-shadow(0 0 8px ${item.color})` : 'none'
                        }}
                        onMouseEnter={() => setHoveredAiStatus(item.key)}
                        onMouseLeave={() => setHoveredAiStatus(null)}
                      />
                    );
                  });
                })()}
              </svg>
              {/* Donut Center Overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                textAlign: 'center',
                padding: '0.5rem'
              }}>
                {hoveredAiStatus ? (
                  <>
                    <span style={{ fontSize: '1.7rem', fontWeight: 800, color: aiSearchAnalytics.items.find(i => i.key === hoveredAiStatus)?.color || 'var(--text-primary)', lineHeight: 1 }}>
                      {aiSearchAnalytics.items.find(i => i.key === hoveredAiStatus)?.count}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                      {aiSearchAnalytics.items.find(i => i.key === hoveredAiStatus)?.pct}%
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>
                      {loading ? '...' : aiSearchAnalytics.successRate}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                      Success Rate
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* AI Breakdown & Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {aiSearchAnalytics.items.map((item) => {
                const isHovered = hoveredAiStatus === item.key;
                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHoveredAiStatus(item.key)}
                    onMouseLeave={() => setHoveredAiStatus(null)}
                    style={{
                      background: isHovered ? item.bg : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${isHovered ? item.border : 'var(--border-color)'}`,
                      borderRadius: '10px',
                      padding: '0.9rem 1.1rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex-between">
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: item.color }}>
                        {item.count} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>({item.pct}%)</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginTop: '0.45rem', overflow: 'hidden' }}>
                      <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: SEARCH ACTIVITY (GRAPH & LISTING) ================= */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header Bar: Title, Search, View Mode Toggle & Report Link */}
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Search size={20} className="text-info" />
                Search Analytics & Location Demand
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.45rem' }}>
                <CheckCircle2 size={11} /> API Connected
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Real-time buyer location searches and unmet inventory demand from <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>/admin/search-analytics</code>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* View Mode Switcher (Bar Graph | Donut Chart | Data Table) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(10, 31, 57, 0.05)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              gap: '2px'
            }}>
              {[
                { id: 'bars', label: 'Bar Graph', icon: BarChart3 },
                { id: 'donut', label: 'Distribution', icon: PieChart },
                { id: 'table', label: 'Table', icon: TableIcon }
              ].map((mode) => {
                const Icon = mode.icon;
                const isActive = searchDisplayMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSearchDisplayMode(mode.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 700 : 500,
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={`${mode.label} View`}
                  >
                    <Icon size={13} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Location Search Filter */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter locations..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  padding: '0.35rem 0.85rem 0.35rem 2rem',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.7)',
                  width: '180px'
                }}
              />
            </div>

            <button onClick={() => onNavigate('reports')} className="btn btn-ghost btn-sm" style={{ gap: '0.35rem' }}>
              Search Report <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Live Search KPI Mini-Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.5)', padding: '0.9rem 1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div className="flex-between" style={{ marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Searches</span>
              <Search size={14} className="text-primary" />
            </div>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--primary)' }}>
              {searchLoading ? '...' : (searchSummary.totalSearches || 0).toLocaleString()}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              All location inquiries recorded
            </span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.5)', padding: '0.9rem 1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div className="flex-between" style={{ marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Today's Inquiries</span>
              <Zap size={14} className="text-warning" />
            </div>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--warning)' }}>
              {searchLoading ? '...' : (searchSummary.todaySearches || 0).toLocaleString()}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Inquiries recorded today
            </span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.5)', padding: '0.9rem 1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div className="flex-between" style={{ marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>#1 Top Location</span>
              <MapPin size={14} style={{ color: '#059669' }} />
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: '#059669', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {searchLoading ? '...' : (topLocationsList[0]?.formattedLocation || 'N/A')}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {topLocationsList[0] ? `${topLocationsList[0].count} searches (${topLocationsList[0].share}% share)` : 'No data'}
            </span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.5)', padding: '0.9rem 1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div className="flex-between" style={{ marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Unmet Inquiries</span>
              <Flame size={14} className="text-danger" />
            </div>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--danger)' }}>
              {searchLoading ? '...' : zeroResultList.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>locations</span>
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Zero available inventory
            </span>
          </div>
        </div>

        {/* Subtabs Switcher: Top Locations vs Zero Result Searches */}
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setSearchViewTab('locations')}
              className={`btn btn-sm ${searchViewTab === 'locations' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', borderRadius: '8px' }}
            >
              <MapPin size={13} />
              <span>Top Locations ({topLocationsList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchViewTab('unmet')}
              className={`btn btn-sm ${searchViewTab === 'unmet' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.9rem',
                borderRadius: '8px',
                background: searchViewTab === 'unmet' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                color: searchViewTab === 'unmet' ? '#dc2626' : 'var(--text-secondary)',
                border: searchViewTab === 'unmet' ? '1px solid rgba(239, 68, 68, 0.35)' : 'none'
              }}
            >
              <Flame size={13} />
              <span>Zero Result Searches ({zeroResultList.length})</span>
            </button>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {searchViewTab === 'locations'
              ? `Displaying ${filteredTopLocations.length} locations by search demand`
              : `Displaying ${filteredZeroResults.length} zero-result search locations`
            }
          </span>
        </div>

        {/* ================= VIEW CONTENT ================= */}
        {searchViewTab === 'locations' ? (
          <>
            {/* 1. BAR GRAPH MODE */}
            {searchDisplayMode === 'bars' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Visual Comparative Vertical SVG Bar Chart (Top 6 Locations) */}
                {filteredTopLocations.length > 0 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div className="flex-between">
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <BarChart3 size={15} className="text-primary" />
                        Location Search Volume Comparison
                      </span>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        Relative demand scale
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${Math.min(filteredTopLocations.length, 6)}, 1fr)`,
                      gap: '1rem',
                      alignItems: 'end',
                      height: '160px',
                      paddingTop: '1.5rem',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      {filteredTopLocations.slice(0, 6).map((item, idx) => {
                        const isHovered = hoveredLocationItem === item.id;
                        const barHeight = Math.max(item.relativePercent || 15, 12);
                        return (
                          <div
                            key={item.id || idx}
                            onMouseEnter={() => setHoveredLocationItem(item.id)}
                            onMouseLeave={() => setHoveredLocationItem(null)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'flex-end',
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                          >
                            {/* Value tooltip on hover / active */}
                            <div style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              color: item.color,
                              marginBottom: '6px',
                              transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                              transition: 'transform 0.15s ease'
                            }}>
                              {item.count}
                            </div>

                            {/* Animated Column Bar */}
                            <div style={{
                              width: '100%',
                              maxWidth: '44px',
                              height: `${barHeight}%`,
                              background: item.grad || item.color,
                              borderRadius: '8px 8px 0 0',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: isHovered ? `0 4px 16px ${item.color}66` : '0 2px 6px rgba(0,0,0,0.06)',
                              filter: isHovered ? 'brightness(1.1)' : 'none'
                            }} />

                            {/* City Label Below */}
                            <div style={{
                              marginTop: '8px',
                              fontSize: '0.75rem',
                              fontWeight: isHovered ? 700 : 600,
                              color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '80px'
                            }}>
                              {item.formattedLocation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ranked Horizontal Demand Bars List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.75rem' }}>
                  {filteredTopLocations.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {searchFilter ? `No locations matching "${searchFilter}"` : 'No location search data available'}
                    </div>
                  ) : (
                    filteredTopLocations.map((item, idx) => {
                      const isHovered = hoveredLocationItem === item.id;
                      const isTop3 = idx < 3;
                      return (
                        <div
                          key={item.id || idx}
                          onMouseEnter={() => setHoveredLocationItem(item.id)}
                          onMouseLeave={() => setHoveredLocationItem(null)}
                          style={{
                            background: isHovered ? item.bg : 'rgba(255, 255, 255, 0.65)',
                            border: `1px solid ${isHovered ? item.border : 'var(--border-color)'}`,
                            borderRadius: '10px',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          {/* Row 1: Rank, Name, Count & Share */}
                          <div className="flex-between">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                background: isTop3
                                  ? (idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : '#ffedd5')
                                  : 'rgba(10, 31, 57, 0.05)',
                                color: isTop3
                                  ? (idx === 0 ? '#b45309' : idx === 1 ? '#475569' : '#c2410c')
                                  : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                #{idx + 1}
                              </span>

                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.formattedLocation}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: item.bg,
                                color: item.color,
                                border: `1px solid ${item.border}`
                              }}>
                                {item.count} searches
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                {item.share}%
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Proportional Gradient Progress Bar */}
                          <div style={{ width: '100%', height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${item.share}%`,
                              height: '100%',
                              background: item.grad || item.color,
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

            {/* 2. DONUT / RADIAL DISTRIBUTION MODE */}
            {searchDisplayMode === 'donut' && (
              <div className="animate-fade-in" style={{
                display: 'grid',
                gridTemplateColumns: '260px 1fr',
                gap: '1.75rem',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.5rem'
              }} className="grid-cols-2">
                
                {/* Left: SVG Donut Chart */}
                <div style={{ width: '230px', height: '230px', position: 'relative', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 240 240" width="100%" height="100%" style={{ overflow: 'visible', transform: 'rotate(-90deg)' }}>
                    <circle cx="120" cy="120" r="85" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="26" />
                    {(() => {
                      const circumference = 2 * Math.PI * 85;
                      let acc = 0;
                      return filteredTopLocations.map((item) => {
                        const pct = (Number(item.share) || 0) / 100;
                        if (pct <= 0) return null;
                        const strokeDash = `${pct * circumference} ${circumference * (1 - pct)}`;
                        const strokeOffset = -(acc * circumference);
                        acc += pct;
                        const isHovered = hoveredLocationItem === item.id;
                        return (
                          <circle
                            key={item.id}
                            cx="120"
                            cy="120"
                            r="85"
                            fill="none"
                            stroke={item.color}
                            strokeWidth={isHovered ? 32 : 26}
                            strokeDasharray={strokeDash}
                            strokeDashoffset={strokeOffset}
                            strokeLinecap="butt"
                            style={{
                              transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                              cursor: 'pointer',
                              filter: isHovered ? `drop-shadow(0 0 8px ${item.color})` : 'none'
                            }}
                            onMouseEnter={() => setHoveredLocationItem(item.id)}
                            onMouseLeave={() => setHoveredLocationItem(null)}
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* Donut Center Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    textAlign: 'center',
                    padding: '0.5rem'
                  }}>
                    {hoveredLocationItem ? (
                      (() => {
                        const activeItem = filteredTopLocations.find(i => i.id === hoveredLocationItem);
                        return (
                          <>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: activeItem?.color || 'var(--text-primary)', lineHeight: 1.1 }}>
                              {activeItem?.count}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {activeItem?.formattedLocation}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {activeItem?.share}% share
                            </span>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                          {searchSummary.totalSearches || 0}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '3px' }}>
                          Total Searches
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Location Legend Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                  {filteredTopLocations.map((item) => {
                    const isHovered = hoveredLocationItem === item.id;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredLocationItem(item.id)}
                        onMouseLeave={() => setHoveredLocationItem(null)}
                        style={{
                          background: isHovered ? item.bg : 'rgba(255,255,255,0.4)',
                          border: `1px solid ${isHovered ? item.border : 'var(--border-color)'}`,
                          borderRadius: '8px',
                          padding: '0.6rem 0.85rem',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <div className="flex-between">
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                            {item.formattedLocation}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: item.color }}>
                            {item.count} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>({item.share}%)</span>
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', marginTop: '0.35rem', overflow: 'hidden' }}>
                          <div style={{ width: `${item.share}%`, height: '100%', background: item.color, borderRadius: '2px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {/* 3. TABLE MODE */}
            {searchDisplayMode === 'table' && (
              <div className="table-container animate-fade-in" style={{ maxHeight: '50vh', overflowY: 'auto', position: 'relative' }}>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ width: '60px', position: 'sticky', top: 0, background: '#f8fafc' }}>#</th>
                      <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Location</th>
                      <th style={{ width: '120px', position: 'sticky', top: 0, background: '#f8fafc' }}>Count</th>
                      <th style={{ width: '220px', position: 'sticky', top: 0, background: '#f8fafc' }}>Market Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopLocations.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          {searchFilter ? `No locations matching "${searchFilter}"` : 'No top locations data available'}
                        </td>
                      </tr>
                    ) : (
                      filteredTopLocations.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <MapPin size={14} style={{ color: item.color }} />
                              {item.formattedLocation}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.count} searches
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${item.share}%`, height: '100%', background: item.grad || item.color, borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, minWidth: '32px' }}>{item.share}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* ================= ZERO RESULT SEARCHES (UNMET DEMAND) ================= */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Unmet Demand Highlight Box */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              padding: '0.85rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Flame size={18} className="text-danger" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)' }}>
                    High-Demand Locations with Zero Matching Inventory
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Users actively searched for listings in these locations, but found 0 results. Consider onboarding properties here.
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 9px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}>
                {zeroResultList.length} Unmet Areas
              </span>
            </div>

            {/* Zero-Result Search Visual Cards / Table */}
            {searchDisplayMode === 'table' ? (
              <div className="table-container" style={{ maxHeight: '50vh', overflowY: 'auto', position: 'relative' }}>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ width: '60px', position: 'sticky', top: 0, background: '#f8fafc' }}>#</th>
                      <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Unmet Location</th>
                      <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Zero-Result Queries</th>
                      <th style={{ width: '180px', position: 'sticky', top: 0, background: '#f8fafc' }}>Demand Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredZeroResults.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          {searchFilter ? `No zero-result searches matching "${searchFilter}"` : 'No zero-result searches recorded'}
                        </td>
                      </tr>
                    ) : (
                      filteredZeroResults.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <Search size={14} className="text-danger" />
                              {item.formattedLocation}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#dc2626' }}>
                            {item.unmetSearches} missed searches
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${item.share}%`, height: '100%', background: '#ef4444', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#dc2626' }}>{item.share}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Graphical Visual Cards for Unmet Searches */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {filteredZeroResults.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchFilter ? `No zero-result searches matching "${searchFilter}"` : 'No zero-result searches recorded'}
                  </div>
                ) : (
                  filteredZeroResults.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.65)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '10px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}
                    >
                      <div className="flex-between">
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                          {item.formattedLocation}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          border: '1px solid rgba(239, 68, 68, 0.25)'
                        }}>
                          {item.unmetSearches} missed
                        </span>
                      </div>

                      <div style={{ width: '100%', height: '5px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.share}%`, height: '100%', background: 'linear-gradient(90deg, #f87171, #ef4444)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

      </div>



      {/* ================= SECTION 4: DATA SYNCHRONIZATION STATUS ================= */}
      {/* <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} className="text-info" />
              Data Synchronization & Feed Scraper Status
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Automated listing sync pipelines, Dominican real estate portals, and MLS feed health status.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`badge ${portalSyncState.isSyncing ? 'badge-warning' : 'badge-success'}`} style={{ padding: '0.4rem 0.75rem' }}>
              <span style={{
                width: '7px',
                height: '7px',
                background: 'currentColor',
                borderRadius: '50%',
                display: 'inline-block',
                marginRight: '0.35rem'
              }} className={portalSyncState.isSyncing ? 'pulse-glow' : ''} />
              {portalSyncState.isSyncing ? 'Syncing Feeds in Background...' : 'All 4 Portals Connected & Healthy'}
            </span>
            <button
              onClick={portalSyncState.isSyncing ? null : onTriggerManualSync}
              className="btn btn-primary btn-sm"
              disabled={portalSyncState.isSyncing}
              style={{ gap: '0.4rem' }}
            >
              <Database size={14} />
              {portalSyncState.isSyncing ? 'Syncing...' : 'Trigger Full Sync'}
            </button>
          </div>
        </div>

        <div className="grid-cols-4">
          <div style={{ background: 'rgba(255,255,255,0.4)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Feed Listings</span>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>3,392</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Across 4 sources</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.4)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sync Success Rate</span>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--success)' }}>
              {portalSyncState.successRate || 100}%
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>0 sync failures today</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.4)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last Full Sync</span>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={15} className="text-muted-color" />
              {portalSyncState.lastSyncTime || '12 mins ago'}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Auto interval: 60m</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.4)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Data Freshness</span>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--info)' }}>Real-Time</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Delta sync active</span>
          </div>
        </div>

        <div>
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Active Portals & Feed Connectors</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-healing enabled</span>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Portal / Feed Provider</th>
                  <th>Integration Type</th>
                  <th>Sync Schedule</th>
                  <th>Last Sync Time</th>
                  <th>Listings Indexed</th>
                  <th>Avg Duration</th>
                  <th>Error Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {syncPortalsList.map((portal) => (
                  <tr key={portal.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Globe size={14} className="text-info" />
                        {portal.name}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{portal.type}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{portal.interval}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{portal.lastSync}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{portal.syncedCount} items</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{portal.duration}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{portal.errorRate}</td>
                    <td>
                      <span className={`badge ${portal.badgeClass}`}>{portal.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Recent Scraping & Import Runs</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Execution audit</span>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Run Timestamp</th>
                  <th>Source Connector</th>
                  <th>New Items Added</th>
                  <th>Existing Records Updated</th>
                  <th>Run Duration</th>
                  <th>Result Status</th>
                </tr>
              </thead>
              <tbody>
                {syncRunHistory.map((run) => (
                  <tr key={run.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{run.time}</td>
                    <td style={{ fontWeight: 600 }}>{run.feed}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{run.imported}</td>
                    <td style={{ color: 'var(--info)', fontWeight: 500 }}>{run.updated}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{run.duration}</td>
                    <td>
                      <span className="badge badge-success">{run.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div> */}

      {/* Quick Navigation Panel */}
      {/* <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1.125rem' }}>Quick Actions & Navigation Control</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => onNavigate('users')}
            style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={16} className="text-primary" />
              Review User Registrations
            </span>
            <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => onNavigate('realtors')}
            style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Building size={16} className="text-warning" />
              Check Realtor Verifications
            </span>
            <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => onNavigate('properties')}
            style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Home size={16} className="text-info" />
              Manage Property Listings
            </span>
            <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => onNavigate('portals')}
            style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Database size={16} className="text-info" />
              Monitor Portals & Scrapers
            </span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div> */}

      {/* Bottom Row: Recent Audit Trail / Log events */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} className="text-warning" />
              Recent Administrative Actions & Security Audit Trail
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
              Latest 4 system audit events, admin operations, and user registrations.
            </p>
          </div>
          <button onClick={() => onNavigate('logs')} className="btn btn-ghost btn-sm" style={{ gap: '0.35rem', color: 'var(--primary)', fontWeight: 600 }}>
            <span>View Full Trail</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Timestamp</th>
                <th style={{ width: '180px' }}>Operator</th>
                <th style={{ width: '90px' }}>Action</th>
                <th style={{ width: '120px' }}>Module</th>
                <th>Action Details (Endpoint)</th>
                <th style={{ width: '120px' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading && recentLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <Loader2 size={18} className="animate-spin text-primary" />
                      <span style={{ fontSize: '0.825rem' }}>Loading recent audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : recentLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                    No recent administrative actions recorded.
                  </td>
                </tr>
              ) : (
                recentLogs.slice(0, 4).map((log, index) => {
                  const id = log._id || log.id || `dash-log-${index}`;
                  const operatorName = log.userId?.name || log.userId?.email || log.user || log.operator || 'Admin';
                  const operatorRole = log.userId?.role || '';
                  const action = (log.action || log.type || 'activity').toLowerCase();
                  const moduleName = log.module || log.category || 'General';
                  const endpoint = log.endpoint || log.path || '';
                  const statusCode = log.statusCode || log.status || null;
                  const ip = log.ipAddress || log.ip || '127.0.0.1';

                  let formattedDate = 'Recent';
                  let relativeTime = '';
                  if (log.createdAt || log.timestamp) {
                    try {
                      const d = new Date(log.createdAt || log.timestamp);
                      if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const diffMs = Date.now() - d.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        if (diffMins < 1) relativeTime = 'Just now';
                        else if (diffMins < 60) relativeTime = `${diffMins}m ago`;
                        else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
                      }
                    } catch (e) {
                      formattedDate = String(log.createdAt || log.timestamp);
                    }
                  }

                  const isCreate = action.includes('create') || action.includes('add') || action.includes('post');
                  const isEdit = action.includes('edit') || action.includes('update') || action.includes('put') || action.includes('patch');
                  const isDelete = action.includes('delete') || action.includes('remove');

                  const actionBadgeStyle = isCreate
                    ? { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.3)' }
                    : isEdit
                    ? { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.3)' }
                    : isDelete
                    ? { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' }
                    : { bg: 'rgba(10, 31, 57, 0.06)', color: 'var(--text-secondary)', border: 'var(--border-color)' };

                  return (
                    <tr key={id}>
                      {/* Timestamp */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {formattedDate}
                          </span>
                          {relativeTime && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {relativeTime}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Operator */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--primary-glow)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            <Users size={12} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {operatorName}
                            </span>
                            {operatorRole && (
                              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                {operatorRole}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td>
                        <span style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: actionBadgeStyle.bg,
                          color: actionBadgeStyle.color,
                          border: `1px solid ${actionBadgeStyle.border}`,
                          textTransform: 'uppercase',
                          display: 'inline-block'
                        }}>
                          {action}
                        </span>
                      </td>

                      {/* Module */}
                      <td>
                        <span className={`badge ${
                          moduleName === 'Security' || moduleName === 'Danger' ? 'badge-danger' :
                          moduleName === 'Sync' ? 'badge-info' :
                          moduleName === 'Settings' || moduleName === 'Notification' ? 'badge-warning' : 'badge-primary'
                        }`} style={{ fontSize: '0.7rem' }}>
                          {moduleName}
                        </span>
                      </td>

                      {/* Endpoint & Status */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          {endpoint ? (
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              background: 'rgba(10, 31, 57, 0.04)',
                              border: '1px solid var(--border-color)',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              wordBreak: 'break-all'
                            }}>
                              {endpoint}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {log.details || log.description || 'API Action'}
                            </span>
                          )}
                          {statusCode && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: statusCode >= 200 && statusCode < 300
                                ? 'rgba(16, 185, 129, 0.12)'
                                : statusCode >= 400
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(245, 158, 11, 0.12)',
                              color: statusCode >= 200 && statusCode < 300
                                ? '#059669'
                                : statusCode >= 400
                                ? '#dc2626'
                                : '#b45309',
                              border: `1px solid ${
                                statusCode >= 200 && statusCode < 300
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : statusCode >= 400
                                  ? 'rgba(239, 68, 68, 0.25)'
                                  : 'rgba(245, 158, 11, 0.25)'
                              }`
                            }}>
                              {statusCode}
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
                          {ip}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
