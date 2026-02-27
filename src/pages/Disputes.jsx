import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, ArrowUpDown, ArrowUp, ArrowDown, X, SlidersHorizontal } from "lucide-react";
import DisputeDetail from "@/components/disputes/DisputeDetail";

const statusColors = {
  new: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
};

const foughtColors = {
  fought: "bg-blue-50 text-blue-700",
  not_fought: "bg-slate-100 text-slate-600",
};

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300 inline" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 ml-1 text-[#0D50B8] inline" />
    : <ArrowDown className="w-3 h-3 ml-1 text-[#0D50B8] inline" />;
}

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [foughtFilter, setFoughtFilter] = useState("all");
  const [processorFilter, setProcessorFilter] = useState("all");
  const [cardNetworkFilter, setCardNetworkFilter] = useState("all");
  const [reasonCodeFilter, setReasonCodeFilter] = useState("all");
  const [analystFilter, setAnalystFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState("");

  // Sorting
  const [sortField, setSortField] = useState("created_date");
  const [sortDir, setSortDir] = useState("desc");

  const load = () => {
    Promise.all([
      base44.entities.Dispute.filter({ status: "new" }, "-created_date", 500),
      base44.entities.Dispute.filter({ status: "in_progress" }, "-created_date", 500),
      base44.entities.Project.list(),
      base44.auth.me(),
      base44.entities.User.list(),
    ]).then(([dnew, dinprog, p, u, userList]) => {
      setDisputes([...dnew, ...dinprog]);
      setProjects(p);
      setCurrentUser(u);
      setUsers(userList);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const isAnalyst = currentUser?.role === "analyst";

  // Derive unique filter options from data
  const processors = useMemo(() => [...new Set(disputes.map(d => d.processor).filter(Boolean))].sort(), [disputes]);
  const cardNetworks = useMemo(() => [...new Set(disputes.map(d => d.card_network).filter(Boolean))].sort(), [disputes]);
  const reasonCodes = useMemo(() => [...new Set(disputes.map(d => d.reason_code).filter(Boolean))].sort(), [disputes]);

  // Analyst list: analyst role sees only themselves; others see all unique assigned_to values
  const analystOptions = useMemo(() => {
    if (isAnalyst) {
      return currentUser?.email ? [currentUser.email] : [];
    }
    return [...new Set(disputes.map(d => d.assigned_to).filter(Boolean))].sort();
  }, [disputes, isAnalyst, currentUser]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = disputes.filter(d => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        d.case_id?.toLowerCase().includes(q) ||
        d.cardholder_name?.toLowerCase().includes(q) ||
        d.reason_code?.toLowerCase().includes(q) ||
        d.business_unit?.toLowerCase().includes(q) ||
        d.customer_name?.toLowerCase().includes(q) ||
        d.customer_email?.toLowerCase().includes(q) ||
        d.processor?.toLowerCase().includes(q) ||
        d.card_network?.toLowerCase().includes(q) ||
        d.arn_number?.toLowerCase().includes(q) ||
        d.assigned_to?.toLowerCase().includes(q) ||
        d.sub_unit_name?.toLowerCase().includes(q);

      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      const matchProject = projectFilter === "all" || d.project_id === projectFilter;
      const matchFought = foughtFilter === "all" || d.fought_decision === foughtFilter;
      const matchProcessor = processorFilter === "all" || d.processor === processorFilter;
      const matchNetwork = cardNetworkFilter === "all" || d.card_network === cardNetworkFilter;
      const matchReason = reasonCodeFilter === "all" || d.reason_code === reasonCodeFilter;
      const matchAnalyst = analystFilter === "all" || d.assigned_to === analystFilter;
      const matchDeadline = !deadlineFilter || d.sla_deadline === deadlineFilter;

      // Analysts only see their own disputes
      const matchSelf = !isAnalyst || d.assigned_to === currentUser?.email;

      return matchSearch && matchStatus && matchProject && matchFought &&
        matchProcessor && matchNetwork && matchReason && matchAnalyst &&
        matchDeadline && matchSelf;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [disputes, search, statusFilter, projectFilter, foughtFilter, processorFilter, cardNetworkFilter, reasonCodeFilter, analystFilter, deadlineFrom, deadlineTo, sortField, sortDir, isAnalyst, currentUser]);

  const activeFilterCount = [
    statusFilter !== "all", projectFilter !== "all", foughtFilter !== "all",
    processorFilter !== "all", cardNetworkFilter !== "all", reasonCodeFilter !== "all",
    analystFilter !== "all", deadlineFrom, deadlineTo
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter("all"); setProjectFilter("all"); setFoughtFilter("all");
    setProcessorFilter("all"); setCardNetworkFilter("all"); setReasonCodeFilter("all");
    setAnalystFilter("all"); setDeadlineFrom(""); setDeadlineTo("");
  };

  const thClass = "text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-[#0D50B8] transition-colors";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Disputes</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} dispute{filtered.length !== 1 ? "s" : ""} shown</p>
        </div>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 pr-4"
            placeholder="Search case ID, cardholder, ARN, reason, analyst..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${activeFilterCount > 0 ? "border-[#0D50B8] text-[#0D50B8]" : ""}`}
          onClick={() => setShowFilters(f => !f)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-[#0D50B8] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeFilterCount}</span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear all
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Project</label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Processor</label>
            <Select value={processorFilter} onValueChange={setProcessorFilter}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="All Processors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processors</SelectItem>
                {processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Card Network</label>
            <Select value={cardNetworkFilter} onValueChange={setCardNetworkFilter}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="All Networks" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                {cardNetworks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Reason Code</label>
            <Select value={reasonCodeFilter} onValueChange={setReasonCodeFilter}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="All Reason Codes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reason Codes</SelectItem>
                {reasonCodes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Fought Decision</label>
            <Select value={foughtFilter} onValueChange={setFoughtFilter}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="All Decisions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Decisions</SelectItem>
                <SelectItem value="fought">Fought</SelectItem>
                <SelectItem value="not_fought">Not Fought</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              {isAnalyst ? "Assigned To (You)" : "Assigned Analyst"}
            </label>
            <Select value={analystFilter} onValueChange={setAnalystFilter} disabled={isAnalyst}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="All Analysts" /></SelectTrigger>
              <SelectContent>
                {!isAnalyst && <SelectItem value="all">All Analysts</SelectItem>}
                {analystOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">SLA Deadline From</label>
            <input
              type="date"
              value={deadlineFrom}
              onChange={e => setDeadlineFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D50B8]/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">SLA Deadline To</label>
            <input
              type="date"
              value={deadlineTo}
              onChange={e => setDeadlineTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D50B8]/30"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className={thClass} onClick={() => handleSort("case_id")}>Case ID <SortIcon field="case_id" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("arn_number")}>ARN <SortIcon field="arn_number" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("case_type")}>Case Type <SortIcon field="case_type" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("sub_unit_name")}>Sub Unit <SortIcon field="sub_unit_name" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("processor")}>Processor <SortIcon field="processor" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass}>Decision</th>
                  <th className={thClass} onClick={() => handleSort("status")}>Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("card_network")}>Card Network <SortIcon field="card_network" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("chargeback_currency")}>Currency <SortIcon field="chargeback_currency" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("chargeback_amount")}>Dispute Amt <SortIcon field="chargeback_amount" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("chargeback_amount_usd")}>USD Amt <SortIcon field="chargeback_amount_usd" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("reason_code")}>Reason Code <SortIcon field="reason_code" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("sla_deadline")}>SLA Deadline <SortIcon field="sla_deadline" sortField={sortField} sortDir={sortDir} /></th>
                  <th className={thClass} onClick={() => handleSort("assigned_to")}>Assigned To <SortIcon field="assigned_to" sortField={sortField} sortDir={sortDir} /></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={15} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={15} className="px-4 py-10 text-center text-slate-400">No disputes found</td></tr>
                ) : filtered.map(d => {
                  const isOverdue = d.sla_deadline && d.sla_deadline < new Date().toISOString().split("T")[0];
                  return (
                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedDispute(d)}>
                      <td className="px-4 py-3 font-medium text-[#0D50B8] whitespace-nowrap">{d.case_id}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{d.arn_number || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.case_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.sub_unit_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.processor || "—"}</td>
                      <td className="px-4 py-3">
                        {d.fought_decision ? (
                          <Badge className={`${foughtColors[d.fought_decision]} text-xs border-0`}>
                            {d.fought_decision === "fought" ? "Fought" : "Not Fought"}
                          </Badge>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusColors[d.status] || "bg-slate-100 text-slate-700"} text-xs border-0`}>
                          {d.status?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.card_network || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-medium whitespace-nowrap">{d.chargeback_currency || "—"}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{d.chargeback_amount?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-3 text-emerald-700 font-medium whitespace-nowrap">{d.chargeback_amount_usd ? `$${d.chargeback_amount_usd?.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{d.reason_code || "—"}</td>
                      <td className={`px-4 py-3 whitespace-nowrap font-medium ${isOverdue ? "text-red-600" : "text-slate-500"}`}>
                        {d.sla_deadline || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{d.assigned_to || "—"}</td>
                      <td className="px-4 py-3">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setSelectedDispute(d); }}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}