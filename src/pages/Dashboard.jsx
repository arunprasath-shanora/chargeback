import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Package, DollarSign } from "lucide-react";

const STATUS_COLORS = {
  new:         { pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",  dot: "bg-amber-400" },
  in_progress: { pill: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",    dot: "bg-blue-500" },
  submitted:   { pill: "bg-violet-50 text-violet-700 ring-1 ring-violet-200", dot: "bg-violet-500" },
  pending:     { pill: "bg-orange-50 text-orange-700 ring-1 ring-orange-200", dot: "bg-orange-400" },
  won:         { pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  lost:        { pill: "bg-red-50 text-red-600 ring-1 ring-red-200",       dot: "bg-red-500" },
};

export default function Dashboard() {
  const [disputes, setDisputes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Dispute.list("-created_date", 50),
      base44.entities.InventoryItem.list("-created_date", 50),
    ]).then(([d, i]) => { setDisputes(d); setInventory(i); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = {
    total:             disputes.length,
    new:               disputes.filter(d => d.status === "new").length,
    inProgress:        disputes.filter(d => d.status === "in_progress").length,
    won:               disputes.filter(d => d.status === "won").length,
    lost:              disputes.filter(d => d.status === "lost").length,
    submitted:         disputes.filter(d => d.status === "submitted").length,
    inventoryReceived: inventory.filter(i => i.status === "received").length,
  };

  const winRate = (stats.won + stats.lost) > 0
    ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : 0;

  const recoveredUSD = disputes
    .filter(d => d.status === "won" && d.dispute_amount_usd)
    .reduce((sum, d) => sum + (d.dispute_amount_usd || 0), 0);

  const formatUSD = (n) => n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  const statCards = [
    { label: "Total Disputes",  value: stats.total,             icon: FileText,    accent: "#0D50B8", light: "#EEF4FF" },
    { label: "New Cases",       value: stats.new,               icon: AlertCircle, accent: "#D97706", light: "#FFFBEB" },
    { label: "In Progress",     value: stats.inProgress,        icon: Clock,       accent: "#7C3AED", light: "#F5F3FF" },
    { label: "Won",             value: stats.won,               icon: TrendingUp,  accent: "#059669", light: "#ECFDF5" },
    { label: "Lost",            value: stats.lost,              icon: TrendingDown,accent: "#DC2626", light: "#FEF2F2" },
    { label: "Win Rate",        value: `${winRate}%`,           icon: CheckCircle, accent: "#0891B2", light: "#ECFEFF" },
    { label: "New Inventory",   value: stats.inventoryReceived, icon: Package,     accent: "#4F46E5", light: "#EEF2FF" },
    { label: "Recovered (USD)", value: loading ? "—" : formatUSD(recoveredUSD), icon: DollarSign, accent: "#059669", light: "#ECFDF5" },
  ];

  const recent = disputes.slice(0, 8);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Chargeback management overview</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-500 shadow-sm self-start">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-chip p-4 flex flex-col gap-3 cursor-default">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.light }}>
              <s.icon className="w-4.5 h-4.5 w-5 h-5" style={{ color: s.accent }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                {loading ? <span className="text-slate-200 text-lg">—</span> : s.value}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Win Rate Banner */}
      {!loading && (stats.won + stats.lost) > 0 && (
        <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "linear-gradient(120deg, #0D50B8 0%, #1a6fde 100%)", boxShadow: "0 8px 30px rgba(13,80,184,0.25)" }}>
          <div>
            <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest">Performance Summary</p>
            <p className="text-white text-3xl font-bold mt-1 tracking-tight">{winRate}% Win Rate</p>
            <p className="text-blue-200 text-xs mt-0.5">{stats.won} won · {stats.lost} lost out of {stats.won + stats.lost} resolved</p>
          </div>
          <div className="flex gap-8 sm:gap-10">
            {[
              { label: "Submitted", value: stats.submitted },
              { label: "In Progress", value: stats.inProgress },
              { label: "New Cases", value: stats.new },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-bold text-white">{item.value}</p>
                <p className="text-blue-200 text-[11px] mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Disputes Table */}
      <div className="app-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Recent Disputes</h2>
            <p className="text-xs text-slate-400 mt-0.5">{recent.length} most recent cases</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Case ID</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason Code</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">SLA Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-300 text-sm">Loading...</td></tr>
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No disputes yet</p>
                  </td>
                </tr>
              ) : recent.map((d) => {
                const sc = STATUS_COLORS[d.status] || { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                const isUrgent = d.sla_deadline && new Date(d.sla_deadline) < new Date();
                return (
                  <tr key={d.id}>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{d.case_id}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${sc.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {d.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-700">
                      {d.dispute_currency} {d.dispute_amount?.toLocaleString() || "—"}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{d.reason_code || "—"}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-medium ${isUrgent ? "text-red-500 font-semibold" : "text-slate-500"}`}>
                        {d.sla_deadline || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}