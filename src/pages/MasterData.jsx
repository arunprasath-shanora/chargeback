import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Eye, RefreshCw } from "lucide-react";
import DisputeDetail from "@/components/disputes/DisputeDetail";
import StatusUpdateModal from "@/components/masterdata/StatusUpdateModal";

const disputeStatusColors = {
  new: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  awaiting_decision: "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  not_fought: "bg-slate-100 text-slate-600",
};

const DISPUTE_STATUS_LABEL = {
  new: "New", in_progress: "In Progress", submitted: "Submitted",
  awaiting_decision: "Awaiting Decision", won: "Won", lost: "Lost", not_fought: "Not Fought",
};

const invStatusColors = {
  received: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  converted: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-600",
};

export default function MasterData() {
  const [disputes, setDisputes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("disputes");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.Dispute.list("-created_date", 1000),
      base44.entities.InventoryItem.list("-created_date", 1000),
      base44.entities.Project.list(),
      base44.auth.me(),
    ]).then(([d, inv, p, u]) => {
      setDisputes(d);
      setInventory(inv);
      setProjects(p);
      setCurrentUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // --- Disputes filter ---
  const filteredDisputes = disputes.filter(d => {
    const matchSearch = !search ||
      d.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      d.cardholder_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.reason_code?.toLowerCase().includes(search.toLowerCase()) ||
      d.sub_unit_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.business_unit?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchProject = projectFilter === "all" || d.project_id === projectFilter;
    return matchSearch && matchStatus && matchProject;
  });

  // --- Inventory filter ---
  const filteredInventory = inventory.filter(i => {
    const matchSearch = !search ||
      i.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      i.merchant_id?.toLowerCase().includes(search.toLowerCase()) ||
      i.reason_code?.toLowerCase().includes(search.toLowerCase()) ||
      i.sub_unit_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    const matchProject = projectFilter === "all" || i.project_id === projectFilter;
    return matchSearch && matchStatus && matchProject;
  });

  const exportDisputesCSV = () => {
    const headers = ["Case ID","Status","Project","Sub Unit","Processor","Card Network","Currency","CB Amount","USD Amount","Reason Code","Reason Category","CB Date","SLA Deadline","Fought Decision","Assigned To"];
    const rows = filteredDisputes.map(d => [
      d.case_id, d.status, projects.find(p=>p.id===d.project_id)?.name||"", d.sub_unit_name, d.processor,
      d.card_network, d.chargeback_currency, d.chargeback_amount, d.chargeback_amount_usd,
      d.reason_code, d.reason_category, d.chargeback_date, d.sla_deadline, d.fought_decision, d.assigned_to
    ]);
    downloadCSV([headers,...rows], "disputes_master.csv");
  };

  const exportInventoryCSV = () => {
    const headers = ["Case ID","Status","Project","Sub Unit","Merchant ID","Processor","Card Network","Currency","CB Amount","Reason Code","Reason Category","Transaction Date","CB Date","Due Date","Assigned To","Source"];
    const rows = filteredInventory.map(i => [
      i.case_id, i.status, projects.find(p=>p.id===i.project_id)?.name||"", i.sub_unit_name, i.merchant_id,
      i.processor, i.card_network, i.currency, i.chargeback_amount, i.reason_code, i.reason_category,
      i.transaction_date, i.chargeback_date, i.due_date, i.assigned_to, i.source
    ]);
    downloadCSV([headers,...rows], "inventory_master.csv");
  };

  const downloadCSV = (data, filename) => {
    const csv = data.map(r => r.map(v => `"${v??""}"` ).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => { setSearch(""); setStatusFilter("all"); setProjectFilter("all"); };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Data</h1>
          <p className="text-slate-500 text-sm mt-1">Central repository of all disputes and inventory across all statuses</p>
        </div>
        <Button
          className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          onClick={() => setShowStatusModal(true)}
        >
          <RefreshCw className="w-4 h-4" />
          Update Processor Status
          {disputes.filter(d => d.status === "awaiting_decision").length > 0 && (
            <span className="bg-white text-purple-700 text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
              {disputes.filter(d => d.status === "awaiting_decision").length}
            </span>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: "disputes", label: `Disputes (${disputes.length})` },
          { id: "inventory", label: `Inventory (${inventory.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); resetFilters(); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white text-[#0D50B8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 py-8 text-center">Loading...</p>
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search case ID, reason code, sub unit..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {activeTab === "disputes"
                  ? Object.entries(DISPUTE_STATUS_LABEL).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)
                  : ["received","assigned","converted","expired"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)
                }
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={activeTab === "disputes" ? exportDisputesCSV : exportInventoryCSV} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <span className="text-xs text-slate-400">
              {activeTab === "disputes" ? filteredDisputes.length : filteredInventory.length} records
            </span>
          </div>

          {/* Disputes Table */}
          {activeTab === "disputes" && (
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
                      {filteredDisputes.length === 0 ? (
                        <tr><td colSpan={14} className="px-4 py-10 text-center text-slate-400">No disputes found</td></tr>
                      ) : filteredDisputes.map(d => (
                        <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedDispute(d)}>
                          <td className="px-4 py-3 font-medium text-[#0D50B8]">{d.case_id}</td>
                          <td className="px-4 py-3">
                            <Badge className={`${disputeStatusColors[d.status] || "bg-slate-100 text-slate-600"} text-xs border-0`}>
                              {DISPUTE_STATUS_LABEL[d.status] || d.status}
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
          )}

          {/* Inventory Table */}
          {activeTab === "inventory" && (
            <Card className="border-slate-100">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Case ID","Status","Sub Unit","Merchant ID","Processor","Card Network","Currency","CB Amount","Reason Code","Reason Category","Transaction Date","CB Date","Due Date","Assigned To","Source"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.length === 0 ? (
                        <tr><td colSpan={15} className="px-4 py-10 text-center text-slate-400">No inventory items found</td></tr>
                      ) : filteredInventory.map(i => (
                        <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700">{i.case_id}</td>
                          <td className="px-4 py-3">
                            <Badge className={`${invStatusColors[i.status] || "bg-slate-100 text-slate-600"} text-xs border-0`}>
                              {i.status?.charAt(0).toUpperCase() + i.status?.slice(1) || "—"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{i.sub_unit_name || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{i.merchant_id || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{i.processor || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{i.card_network || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{i.currency || "—"}</td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{i.chargeback_amount?.toLocaleString() || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{i.reason_code || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{i.reason_category || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{i.transaction_date || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{i.chargeback_date || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{i.due_date || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{i.assigned_to || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{i.source || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <StatusUpdateModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        awaitingDisputes={disputes.filter(d => d.status === "awaiting_decision")}
        onDone={() => load()}
      />
    </div>
  );
}