import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle, Package } from "lucide-react";

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

  const winRate = stats.total > 0
    ? Math.round((stats.won / (stats.won + stats.lost || 1)) * 100)
    : 0;

  const statCards = [
    { label: "Total Disputes", value: stats.total, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "New", value: stats.new, icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Won", value: stats.won, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Lost", value: stats.lost, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    { label: "Win Rate", value: `${winRate}%`, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Inventory (New)", value: stats.inventoryReceived, icon: Package, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const statusColors = {
    new: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    submitted: "bg-indigo-100 text-indigo-800",
    pending: "bg-orange-100 text-orange-800",
    won: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800",
  };

  const recentDisputes = disputes.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your chargeback disputes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-slate-100">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{loading ? "—" : s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Disputes */}
      <Card className="border-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">Recent Disputes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Case ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">SLA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : recentDisputes.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No disputes yet</td></tr>
                ) : recentDisputes.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{d.case_id}</td>
                    <td className="px-6 py-3">
                      <Badge className={`${statusColors[d.status] || "bg-slate-100 text-slate-700"} text-xs font-medium border-0`}>
                        {d.status?.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{d.dispute_currency} {d.dispute_amount?.toLocaleString()}</td>
                    <td className="px-6 py-3 text-slate-500 max-w-[200px] truncate">{d.reason_code || "—"}</td>
                    <td className="px-6 py-3 text-slate-500">{d.sla_deadline || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}