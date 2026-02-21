import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Search, Download, Eye } from "lucide-react";
import DisputeDetail from "@/components/disputes/DisputeDetail";

const COLORS = ["#0D50B8", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

const statusColors = {
  new: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  awaiting_decision: "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  not_fought: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL = {
  new: "New",
  in_progress: "In Progress",
  submitted: "Submitted",
  awaiting_decision: "Awaiting Decision",
  won: "Won",
  lost: "Lost",
  not_fought: "Not Fought",
};

export default function Reports() {
  const [disputes, setDisputes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const load = () => {
    Promise.all([
      base44.entities.Dispute.list("-created_date", 500),
      base44.entities.Project.list(),
      base44.auth.me(),
    ]).then(([d, p, u]) => {
      setDisputes(d);
      setProjects(p);
      setCurrentUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredData = disputes.filter(d => {
    const matchSearch = !search ||
      d.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      d.cardholder_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.reason_code?.toLowerCase().includes(search.toLowerCase()) ||
      d.business_unit?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchProject = projectFilter === "all" || d.project_id === projectFilter;
    return matchSearch && matchStatus && matchProject;
  });

  const statusData = ["new","in_progress","submitted","awaiting_decision","won","lost","not_fought"].map(s => ({
    name: STATUS_LABEL[s],
    count: disputes.filter(d => d.status === s).length,
  })).filter(s => s.count > 0);

  const reasonData = disputes.reduce((acc, d) => {
    if (d.reason_category) acc[d.reason_category] = (acc[d.reason_category] || 0) + 1;
    return acc;
  }, {});
  const reasonChartData = Object.entries(reasonData).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,value]) => ({name,value}));

  const handleExportCSV = () => {
    const headers = ["Case ID","Status","Project","Sub Unit","Processor","Card Network","Currency","CB Amount","CB Amount USD","Reason Code","Reason Category","Chargeback Date","SLA Deadline","Fought Decision","Assigned To"];
    const rows = filteredData.map(d => [
      d.case_id, d.status, projects.find(p=>p.id===d.project_id)?.name||"", d.sub_unit_name, d.processor,
      d.card_network, d.chargeback_currency, d.chargeback_amount, d.chargeback_amount_usd,
      d.reason_code, d.reason_category, d.chargeback_date, d.sla_deadline, d.fought_decision, d.assigned_to
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v??""}"` ).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "disputes_data.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedDispute) {
    return (
      <DisputeDetail
        dispute={selectedDispute}
        projects={projects}
        currentUser={currentUser}
        onBack={() => { setSelectedDispute(null); load(); }}
        onUpdate={(updated) => setSelectedDispute(updated)}
      />
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Analytics, insights and full dispute data</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[{ id: "analytics", label: "Analytics" }, { id: "data", label: "Data" }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white text-[#0D50B8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 py-8 text-center">Loading...</p>
      ) : activeTab === "analytics" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-100">
            <CardHeader><CardTitle className="text-base font-semibold text-slate-800">Disputes by Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0D50B8" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader><CardTitle className="text-base font-semibold text-slate-800">Disputes by Reason Category</CardTitle></CardHeader>
            <CardContent>
              {reasonChartData.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-sm">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={reasonChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                      label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {reasonChartData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* DATA TAB */
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search case ID, cardholder, reason..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <span className="text-xs text-slate-400">{filteredData.length} records</span>
          </div>

          <Card className="border-slate-100">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Case ID","Status","Sub Unit","Processor","Card Network","Currency","CB Amount","USD Amount","Reason Code","CB Date","SLA Deadline","Decision","Assigned To",""].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr><td colSpan={14} className="px-4 py-10 text-center text-slate-400">No disputes found</td></tr>
                    ) : filteredData.map(d => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedDispute(d)}>
                        <td className="px-4 py-3 font-medium text-[#0D50B8]">{d.case_id}</td>
                        <td className="px-4 py-3">
                          <Badge className={`${statusColors[d.status] || "bg-slate-100 text-slate-600"} text-xs border-0`}>
                            {STATUS_LABEL[d.status] || d.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{d.sub_unit_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{d.processor || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{d.card_network || "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{d.chargeback_currency || "—"}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{d.chargeback_amount?.toLocaleString() || "—"}</td>
                        <td className="px-4 py-3 text-emerald-700 font-medium">{d.chargeback_amount_usd ? `$${d.chargeback_amount_usd?.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{d.reason_code || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{d.chargeback_date || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{d.sla_deadline || "—"}</td>
                        <td className="px-4 py-3">
                          {d.fought_decision ? (
                            <Badge className={`${d.fought_decision === "fought" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"} text-xs border-0`}>
                              {d.fought_decision === "fought" ? "Fought" : "Not Fought"}
                            </Badge>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{d.assigned_to || "—"}</td>
                        <td className="px-4 py-3">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setSelectedDispute(d); }}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}