import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart2, TrendingUp, Sparkles } from "lucide-react";
import VolumeAnalyzer from "@/components/reports/VolumeAnalyzer";
import PerformanceDashboard from "@/components/reports/PerformanceDashboard";
import AIInsights from "@/components/reports/AIInsights";

export default function Reports() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Dispute.list("-created_date", 1000)
      .then(d => { setDisputes(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const tabs = [
    { id: "volume", label: "Volume Analyzer", icon: BarChart2, desc: "Trends, YoY comparison & forecast" },
    { id: "performance", label: "Performance Dashboard", icon: TrendingUp, desc: "Win rates, recovery & benchmarks" },
    { id: "ai", label: "AI Insights & Predictions", icon: Sparkles, desc: "Smart analysis & recommendations" },
  ];

  return (
    <div className="p-6 space-y-5 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Performance Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Analytics, insights, and forecasting across all disputes</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading dispute data…</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="volume" className="space-y-5">
          <TabsList className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1 h-auto gap-1 flex flex-wrap">
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium data-[state=active]:bg-[#0D50B8] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-500 hover:text-slate-700 transition-all">
                <t.icon className="w-4 h-4" />
                <span>{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="volume" className="mt-0">
            <VolumeAnalyzer disputes={disputes} />
          </TabsContent>
          <TabsContent value="performance" className="mt-0">
            <PerformanceDashboard disputes={disputes} />
          </TabsContent>
          <TabsContent value="ai" className="mt-0">
            <AIInsights disputes={disputes} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}