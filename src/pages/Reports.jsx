import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart2, TrendingUp, Sparkles, RefreshCw, Filter, X, FileText } from "lucide-react";
import VolumeAnalyzer from "@/components/reports/VolumeAnalyzer";
import PerformanceDashboard from "@/components/reports/PerformanceDashboard";
import AIInsights from "@/components/reports/AIInsights";
import CustomReports from "@/components/reports/CustomReports";

const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export default function Reports() {
  const [disputes, setDisputes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Shared filters
  const [filterProject, setFilterProject] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterRC, setFilterRC] = useState("all");
  const [filterProcessor, setFilterProcessor] = useState("all");
  const [filterNetwork, setFilterNetwork] = useState("all");

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Dispute.list("-created_date", 2000),
      base44.entities.Project.list(),
    ]).then(([d, p]) => {
      setDisputes(d);
      setProjects(p);
      setLoading(false);
      setLastRefreshed(new Date());
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Derive filter options from data
  const reasonCodes = useMemo(() => [...new Set(disputes.map(d => d.reason_category).filter(Boolean))].sort(), [disputes]);
  const processors = useMemo(() => [...new Set(disputes.map(d => d.processor).filter(Boolean))].sort(), [disputes]);
  const networks = useMemo(() => [...new Set(disputes.map(d => d.card_network).filter(Boolean))].sort(), [disputes]);

  // Apply shared filters to all tabs
  const filteredDisputes = useMemo(() => {
    return disputes.filter(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (filterProject !== "all" && d.project_id !== filterProject) return false;
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo + "T23:59:59")) return false;
      if (filterRC !== "all" && d.reason_category !== filterRC) return false;
      if (filterProcessor !== "all" && d.processor !== filterProcessor) return false;
      if (filterNetwork !== "all" && d.card_network !== filterNetwork) return false;
      return true;
    });
  }, [disputes, filterProject, dateFrom, dateTo, filterRC, filterProcessor, filterNetwork]);

  const hasActiveFilters = filterProject !== "all" || dateFrom || dateTo || filterRC !== "all" || filterProcessor !== "all" || filterNetwork !== "all";

  const clearFilters = () => {
    setFilterProject("all"); setDateFrom(""); setDateTo("");
    setFilterRC("all"); setFilterProcessor("all"); setFilterNetwork("all");
  };

  const tabs = [
    { id: "volume", label: "Volume Analyzer", icon: BarChart2 },
    { id: "performance", label: "Performance Dashboard", icon: TrendingUp },
    { id: "ai", label: "AI Insights & Predictions", icon: Sparkles },
    { id: "custom", label: "Custom Reports", icon: FileText },
  ];

  const FilterBar = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">Filters</span>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            className="ml-auto flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-medium px-2 py-0.5 rounded-lg hover:bg-red-50 transition-all">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Project */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">Project</label>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-9 text-xs border-slate-200">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Date From */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">CB Date From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        {/* Date To */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">CB Date To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        {/* Reason Code */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">Reason Code</label>
          <Select value={filterRC} onValueChange={setFilterRC}>
            <SelectTrigger className="h-9 text-xs border-slate-200">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reason Codes</SelectItem>
              {reasonCodes.map(rc => <SelectItem key={rc} value={rc}>{rc}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Processor */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">Processor</label>
          <Select value={filterProcessor} onValueChange={setFilterProcessor}>
            <SelectTrigger className="h-9 text-xs border-slate-200">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Processors</SelectItem>
              {processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Card Network */}
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1">Card Network</label>
          <Select value={filterNetwork} onValueChange={setFilterNetwork}>
            <SelectTrigger className="h-9 text-xs border-slate-200">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Networks</SelectItem>
              {networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {hasActiveFilters && (
        <p className="text-[11px] text-blue-600 mt-2.5 font-medium">
          Showing {filteredDisputes.length.toLocaleString()} of {disputes.length.toLocaleString()} disputes
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-5 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Project Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Analytics, insights, and forecasting across all disputes</p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-[11px] text-slate-400">
              Last refreshed: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && disputes.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading dispute data…</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="volume" className="space-y-4">
          <TabsList className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1 h-auto gap-1 flex flex-wrap">
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium data-[state=active]:bg-[#0D50B8] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-500 hover:text-slate-700 transition-all">
                <t.icon className="w-4 h-4" />
                <span>{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="volume" className="mt-0 space-y-4">
            <FilterBar />
            <VolumeAnalyzer disputes={filteredDisputes} />
          </TabsContent>

          <TabsContent value="performance" className="mt-0 space-y-4">
            <FilterBar />
            <PerformanceDashboard disputes={filteredDisputes} />
          </TabsContent>

          <TabsContent value="ai" className="mt-0 space-y-4">
            <FilterBar />
            <AIInsights disputes={filteredDisputes} />
          </TabsContent>

          <TabsContent value="custom" className="mt-0 space-y-4">
            <FilterBar />
            <CustomReports disputes={filteredDisputes} />
          </TabsContent>

          <TabsContent value="anomaly" className="mt-0 space-y-4">
            <FilterBar />
            <AnomalyDetection disputes={filteredDisputes} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}