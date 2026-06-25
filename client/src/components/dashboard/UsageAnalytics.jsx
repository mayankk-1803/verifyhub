import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ClayWidget, ClayButton } from '../Claymorphic';
import { RefreshCw, Terminal, CheckCircle2, BarChart3, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

export default function UsageAnalytics({ COLORS }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/analytics');
      if (res.data.success) {
        setAnalyticsData(res.data);
      } else {
        throw new Error('Failed to load analytics.');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px] border border-slate-200 bg-white rounded-[24px] shadow-sm text-center">
        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <h4 className="text-base font-bold text-slate-800 font-display">Loading Analytics Portal</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">Retrieving API usage data, latencies, and service distributions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-16 min-h-[400px] border border-red-200 bg-red-50/20 rounded-[24px] text-center max-w-xl mx-auto gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-650">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900 font-display">Failed to Load Usage Analytics</h4>
          <p className="text-xs text-slate-650 mt-1">{error}</p>
        </div>
        <ClayButton variant="primary" onClick={fetchAnalytics} className="flex items-center gap-2 py-2 px-5 text-xs font-semibold mt-2">
          <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching Analytics
        </ClayButton>
      </div>
    );
  }

  const {
    trafficHistory = analyticsData?.trends || [],
    apiDistribution = analyticsData?.distribution || [],
    totalRequests = 0,
    successRate = 0,
    avgLatency = 0
  } = analyticsData || {};

  const hasData = totalRequests > 0;

  return (
    <div className="flex flex-col gap-8 w-full text-left">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold font-display text-slate-900">Consumption Performance Graphs</h3>
        <ClayButton variant="secondary" onClick={fetchAnalytics} className="flex items-center gap-2 py-2 px-4 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
        </ClayButton>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ClayWidget title="Total Requests Volume" value={totalRequests} icon={BarChart3} color="primary" />
        <ClayWidget title="Avg Gateway Latency" value={`${avgLatency} ms`} icon={Terminal} color="secondary" />
        <ClayWidget title="Gateway Success Rate" value={`${successRate}%`} icon={CheckCircle2} color="accent" />
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Daily volume Area chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm min-h-[350px]">
          <span className="block text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider">Requests Traffic (Last 7 Days)</span>
          <div className="w-full h-[280px]">
            {hasData && trafficHistory && trafficHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={10} fontWeight="600" />
                  <YAxis stroke="#64748B" fontSize={10} fontWeight="600" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A' }} />
                  <Area type="monotone" dataKey="calls" stroke="#7C5CFF" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-4">
                No API traffic recorded yet. Generate an API key and start testing APIs.
              </div>
            )}
          </div>
        </div>

        {/* Service distribution pie chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col justify-between items-center min-h-[350px]">
          <span className="block text-xs font-semibold text-slate-500 uppercase w-full text-left tracking-wider">API Distribution</span>
          <div className="w-full h-[200px] flex items-center justify-center">
            {hasData && apiDistribution && apiDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={apiDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {apiDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-4">
                No API traffic recorded yet. Generate an API key and start testing APIs.
              </div>
            )}
          </div>
          {/* Labels legend */}
          <div className="grid grid-cols-2 gap-4 text-[10px] w-full pt-4 border-t border-slate-100 text-slate-550 font-semibold">
            {hasData && apiDistribution && apiDistribution.map((d, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
