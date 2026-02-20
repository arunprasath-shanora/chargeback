import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTION_COLORS = {
  view:           "bg-slate-100 text-slate-600",
  create:         "bg-green-100 text-green-700",
  update:         "bg-blue-100 text-blue-700",
  delete:         "bg-red-100 text-red-700",
  login:          "bg-emerald-100 text-emerald-700",
  logout:         "bg-gray-100 text-gray-600",
  export:         "bg-violet-100 text-violet-700",
  password_reset: "bg-amber-100 text-amber-700",
  role_change:    "bg-purple-100 text-purple-700",
};

const STATUS_COLORS = {
  success: "bg-emerald-50 text-emerald-700",
  failed:  "bg-red-50 text-red-600",
  denied:  "bg-orange-50 text-orange-700",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    base44.entities.AuditLog.list("-created_date", 200)
      .then(l => { setLogs(l); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource_type?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || l.action === filterAction;
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchAction && matchStatus;
  });

  const exportCSV = () => {
    const headers = ["Timestamp", "User", "Role", "Action", "Resource", "Resource ID", "Details", "Status"];
    const rows = filtered.map(l => [
      l.created_date, l.user_email, l.user_role, l.action,
      l.resource_type, l.resource_id, `"${l.details || ""}"`, l.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit_log_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0D50B8]" /> Audit Log
          </h1>
          <p className="text-slate-500 text-sm mt-1">PCI DSS Req 10 & ISMS ISO 27001 A.12.4 — All system activity is recorded</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Compliance banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex flex-wrap gap-6 text-xs text-blue-700">
        <span><strong>PCI DSS Req 10:</strong> All access to cardholder data logged</span>
        <span><strong>Req 7:</strong> Role-based access control enforced</span>
        <span><strong>Req 8:</strong> Unique user IDs &amp; password policy</span>
        <span><strong>ISO 27001 A.9:</strong> Access control management</span>
        <span><strong>ISO 27001 A.12.4:</strong> Logging &amp; monitoring active</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search user, resource, details..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {["view","create","update","delete","login","logout","export","password_reset","role_change"].map(a => (
              <SelectItem key={a} value={a}>{a.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-100">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Timestamp", "User", "Role", "Action", "Resource", "Details", "Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No audit logs found</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap font-mono">
                    {l.created_date ? new Date(l.created_date).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-700">{l.user_email || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{l.user_role || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[l.action] || "bg-slate-100 text-slate-600"}`}>
                      {l.action?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {l.resource_type}{l.resource_id ? <span className="text-slate-400 ml-1 font-mono">#{l.resource_id.slice(0,8)}</span> : ""}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">{l.details || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[l.status] || "bg-slate-100 text-slate-600"}`}>
                      {l.status || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}