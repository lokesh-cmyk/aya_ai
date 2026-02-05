// components/analytics/AnalyticsDashboard.tsx
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Clock, MessageSquare, Download, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { Line, Pie, Cell } from 'recharts';
import { LineChart as RechartsLine, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Date preset options
type DatePreset = '7d' | '30d' | '90d' | 'ytd' | 'custom';

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: 'custom', label: 'Custom' },
];

function getPresetDates(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: Date;

  switch (preset) {
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start: start.toISOString().split('T')[0], end };
}

// Skeleton Loading Component
function AnalyticsSkeleton() {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-10 bg-gray-200 rounded-xl w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-xl w-24 animate-pulse"></div>
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart Skeleton */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="h-80 bg-gray-100 rounded-xl animate-pulse"></div>
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                <div className="h-2 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <div className="h-6 bg-gray-200 rounded w-36 mb-4 animate-pulse"></div>
          <div className="flex items-center justify-center h-48">
            <div className="w-40 h-40 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [activePreset, setActivePreset] = useState<DatePreset>('30d');
  const [dateRange, setDateRange] = useState(getPresetDates('30d'));
  const [showCustomDates, setShowCustomDates] = useState(false);

  const { data: analytics, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      const res = await fetch(`/api/analytics?${params}`, {
        next: { revalidate: 120 },
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    staleTime: 60000,
  });

  // Handle preset changes
  const handlePresetChange = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset === 'custom') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
      setDateRange(getPresetDates(preset));
    }
  };

  // Handle custom date changes
  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setActivePreset('custom');
    setShowCustomDates(true);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    const exportToast = toast.loading(`Exporting ${format.toUpperCase()}...`);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        format,
      });

      const res = await fetch(`/api/analytics/export?${params}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${dateRange.start}-to-${dateRange.end}.${format}`;
      a.click();
      toast.success(`${format.toUpperCase()} exported successfully`, { id: exportToast });
    } catch (err) {
      toast.error(`Failed to export ${format.toUpperCase()}`, { id: exportToast });
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Analytics refreshed');
  };

  // Transform data for combined chart
  const combinedChartData = useMemo(() => {
    if (!analytics?.dailyVolume || !analytics?.messagesByChannel) return [];

    const totalChannelMessages = analytics.messagesByChannel.reduce(
      (sum: number, item: any) => sum + item._count.id,
      0
    );

    const dateMap = new Map();
    analytics.dailyVolume.forEach((item: any) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      dateMap.set(dateKey, {
        date: dateKey,
        volume: item.count,
        channelTotal: 0,
      });
    });

    const totalVolume = analytics.dailyVolume.reduce((sum: number, item: any) => sum + item.count, 0);

    dateMap.forEach((value) => {
      const proportion = totalVolume > 0 ? value.volume / totalVolume : 0;
      value.channelTotal = Math.round(totalChannelMessages * proportion);
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [analytics]);

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="bg-red-50 rounded-full p-4 mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load analytics</h2>
          <p className="text-gray-500 mb-4">There was an error fetching your analytics data</p>
          <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  const channelColors: Record<string, string> = {
    SMS: '#3b82f6',
    WHATSAPP: '#10b981',
    EMAIL: '#ef4444',
    TWITTER: '#0ea5e9',
    FACEBOOK: '#6366f1',
    SLACK: '#e11d48',
    INSTAGRAM: '#ec4899',
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Analytics Dashboard</h1>
            <p className="text-sm text-gray-500">Track your message performance and insights</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Presets */}
            <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-gray-200/50">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activePreset === preset.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range (shown when custom is selected) */}
            {showCustomDates && (
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm border border-gray-200/50">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="px-2 py-1 border-0 bg-transparent text-sm text-gray-700 focus:outline-none"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="px-2 py-1 border-0 bg-transparent text-sm text-gray-700 focus:outline-none"
                />
              </div>
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefetching}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Export Button */}
            <div className="relative group">
              <Button variant="outline" size="sm" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <div className="absolute right-0 mt-2 w-36 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 hidden group-hover:block z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-4 py-2.5 hover:bg-gray-50/80 text-sm rounded-t-xl transition-all"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-4 py-2.5 hover:bg-gray-50/80 text-sm rounded-b-xl transition-all"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 lg:p-6 border border-white/20 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1 font-medium">Total Messages</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{analytics?.summary?.totalMessages?.toLocaleString() || 0}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-sm">
              <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 lg:p-6 border border-white/20 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1 font-medium">Avg Response Time</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {Math.round((analytics?.summary?.avgResponseTime || 0) / 60)}m
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-sm">
              <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 lg:p-6 border border-white/20 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1 font-medium">Active Channels</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{analytics?.summary?.channels || 0}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-sm">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Combined Chart */}
      <div className="mb-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 lg:p-6 border border-white/20">
          <div className="mb-4 lg:mb-6">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-1">Message Analytics Overview</h3>
            <p className="text-sm text-gray-500">Message volume over time and channel distribution</p>
          </div>
          {combinedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <RechartsLine data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                <Line
                  type="monotone"
                  dataKey="volume"
                  name="Message Volume"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="channelTotal"
                  name="Channel Distribution"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                  strokeDasharray="5 5"
                />
              </RechartsLine>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400">
              No data available for the selected period
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
        {/* Message Status */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 lg:p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Status Breakdown</h3>
          {analytics?.messagesByStatus?.length > 0 ? (
            <div className="space-y-4">
              {analytics.messagesByStatus.map((item: any) => {
                const total = analytics.messagesByStatus.reduce((sum: number, s: any) => sum + s._count.id, 0);
                const percentage = ((item._count.id / total) * 100).toFixed(1);

                const statusColors: Record<string, string> = {
                  SENT: 'bg-blue-500',
                  DELIVERED: 'bg-green-500',
                  READ: 'bg-purple-500',
                  FAILED: 'bg-red-500',
                  SCHEDULED: 'bg-yellow-500',
                };

                return (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{item.status}</span>
                      <span className="text-sm text-gray-600 font-semibold">{item._count.id} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200/50 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${statusColors[item.status] || 'bg-gray-500'} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400">
              No status data available
            </div>
          )}
        </div>

        {/* Inbound vs Outbound */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 lg:p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Direction</h3>
          {analytics?.messagesByDirection?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={analytics.messagesByDirection.map((item: any) => ({
                    name: item.direction,
                    value: item._count.id,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.messagesByDirection.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#10b981'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">
              No direction data available
            </div>
          )}
        </div>
      </div>

      {/* Channel Performance Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden mb-6">
        <div className="p-5 lg:p-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-transparent">
          <h3 className="text-lg font-semibold text-gray-900">Channel Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Avg Delivery</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-gray-200/50">
              {analytics?.channelMetrics?.length > 0 ? (
                analytics.channelMetrics.map((metric: any) => (
                  <tr key={metric.channel} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: channelColors[metric.channel] || '#9ca3af' }}
                        />
                        <span className="text-sm font-medium text-gray-900">{metric.channel}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {metric.totalMessages?.toLocaleString()}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 lg:w-20 bg-gray-200/50 rounded-full h-2 mr-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${metric.successRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 font-medium">{metric.successRate?.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium hidden lg:table-cell">
                      {metric.avgDeliveryTime?.toFixed(2)}s
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        metric.successRate > 95 ? 'bg-green-100 text-green-800' :
                        metric.successRate > 80 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {metric.successRate > 95 ? 'Excellent' : metric.successRate > 80 ? 'Good' : 'Needs Attention'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No channel data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Contacts */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-transparent">
          <h3 className="text-lg font-semibold text-gray-900">Top Contacts by Message Volume</h3>
        </div>
        <div className="p-5 lg:p-6">
          {analytics?.topContacts?.length > 0 ? (
            <div className="space-y-3">
              {analytics.topContacts.slice(0, 10).map((contact: any, index: number) => (
                <div key={contact.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/50 transition-colors duration-150">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-400 w-6">{index + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                      {(contact.name || contact.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {contact.name || contact.phone || contact.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{contact._count.messages} messages</p>
                    </div>
                  </div>
                  <div className="w-24 lg:w-32 bg-gray-200/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(contact._count.messages / analytics.topContacts[0]._count.messages) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No contact data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
