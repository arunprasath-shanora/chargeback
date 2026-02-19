import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Package, ArrowUpRight } from "lucide-react";

const statusColors = {
  new: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-violet-100 text-violet-700",
  pending: "bg-orange-100 text-orange-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

const statusDot = {
  new: "bg-amber-400",
  in_progress: "bg-blue-500",
  submitted: "bg-violet-500",
  pending: "bg-orange-400",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

export default function Dashboard() {
  const [disputes, setDisputes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Dispute.list("-created_date", 50),
      base44.entities.InventoryItem.list("-created_date", 50),
    ]).then(([d, i]) => {
      setDisputes(d);
      setInventory(i);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = {
    total: disputes.length,
    new: disputes.filter(d => d.status === "new").length,
    inProgress: disputes.filter(d => d.status === "in_progress").length,
    won: disputes.filter(d => d.status === "won").length,
    lost: disputes.filter(d => d.status === "lost").length,
    submitted: disputes.filter(d => d.status === "submitted").length,
    inventoryReceived: inventory.filter(i => i.status === "received").length,
  };

  const winRate = (stats.won + stats.lost) > 0
    ? Math.round((stats.won / (stats.won + stats.lost)) * 100)
    : 0;

  const statCards = [
    {
      label: "Total Disputes", value: stats.total, icon: FileText,
      gradient: "from-blue-500 to-blue-600", shadow: "shadow-blue-200",
      trend: null,
    },
    {
      label: "New Cases", value: stats.new, icon: AlertCircle,
      gradient: "from-amber-400 to-amber-500", shadow: "shadow-amber-200",
      trend: null,
    },
    {
      label: "In Progress", value: stats.inProgress, icon: Clock,
      gradient: "from-violet-500 to-violet-600", shadow: "shadow-violet-200",
      trend: null,
    },
    {
      label: "Won", value: stats.won, icon: TrendingUp,
      gradient: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200",
      trend: null,
    },
    {
      label: "Lost", value: stats.lost, icon: TrendingDown,
      gradient: "from-red-500 to-red-600", shadow: "shadow-red-200",
      trend: null,
    },
    {
      label: "Win Rate", value: `${winRate}%`, icon: CheckCircle,
      gradient: "from-teal-500 to-teal-600", shadow: "shadow-teal-200",
      highlight: true,
    },
    {
      label: "New Inventory", value: stats.inventoryReceived, icon: Package,
      gradient: "from-indigo-500 to-indigo-600", shadow: "shadow-indigo-200",
      trend: null,
    },
  ];

  const recentDisputes = disputes.slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's happening with your chargebacks today.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-500 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Live · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card rounded-2xl p-4 flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg ${s.shadow}`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                {loading ? <span className="text-slate-300">—</span> : s.value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Win Rate Banner */}
      {!loading && (stats.won + stats.lost) > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-blue-200">
          <div>
            <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Overall Performance</p>
            <p className="text-white text-2xl font-bold mt-1">{winRate}% Win Rate</p>
            <p className="text-blue-200 text-xs mt-0.5">{stats.won} won out of {stats.won + stats.lost} resolved disputes</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.submitted}</p>
              <p className="text-blue-200 text-xs">Submitted</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
              <p className="text-blue-200 text-xs">In Progress</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Disputes Table */}
      <div className="main-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Recent Disputes</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest {recentDisputes.length} cases</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Case ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason Code</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">SLA Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-300 text-sm">Loading...</td></tr>
              ) : recentDisputes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No disputes yet</p>
                  </td>
                </tr>
              ) : recentDisputes.map((d) => (
                <tr key={d.id} className="transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-semibold text-slate-800">{d.case_id}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[d.status] || "bg-slate-100 text-slate-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot[d.status] || "bg-slate-400"}`} />
                      {d.status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700 font-medium">
                    {d.dispute_currency} {d.dispute_amount?.toLocaleString() || "—"}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{d.reason_code || "—"}</td>
                  <td className="px-6 py-3.5">
                    {d.sla_deadline ? (
                      <span className={`text-xs font-medium ${new Date(d.sla_deadline) < new Date() ? "text-red-500" : "text-slate-500"}`}>
                        {d.sla_deadline}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}