import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Eye, RefreshCw, ShieldOff } from "lucide-react";
import DisputeDetail from "@/components/disputes/DisputeDetail";
import StatusUpdateModal from "@/components/masterdata/StatusUpdateModal";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

const DISPUTE_STATUS_COLORS = {
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



const STATUS_SUMMARY_CARDS = [
  { key: "won",               label: "Won",               bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  num: "text-green-800" },
  { key: "lost",              label: "Lost",              bg: "bg-red-50",    border: "border-red-200",    text: "text-red-600",    num: "text-red-700" },
  { key: "not_fought",        label: "Not Fought",        bg: "bg-slate-50",  border: "border-slate-200",  text: "text-slate-500",  num: "text-slate-700" },
  { key: "awaiting_decision", label: "Awaiting Decision", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", num: "text-purple-800" },
  { key: "submitted",         label: "Submitted",         bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", num: "text-indigo-800" },
  { key: "in_progress",       label: "In Progress",       bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-600",   num: "text-blue-800" },
  { key: "new",               label: "New",               bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-600", num: "text-yellow-800" },
];

const today = new Date();
const MTD_START = format(startOfMonth(today), "yyyy-MM-dd");
const MTD_END   = format(today, "yyyy-MM-dd");

function isInRange(dateStr, from, to) {
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    return isWithinInterval(d, { start: parseISO(from), end: parseISO(to) });
  } catch { return false; }
}

export default function MasterData() {
  const [disputes, setDisputes]       = useState([]);
  const [projects, setProjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateField, setDateField]     = useState("chargeback_date"); // or "created_date"
  const [dateFrom, setDateFrom]       = useState(MTD_START);
  const [dateTo, setDateTo]           = useState(MTD_END);
  const [evidenceMap, setEvidenceMap] = useState({});  // dispute_id → [evidence]
  const [customFields, setCustomFields] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Dispute.list("-chargeback_date", 2000),
      base44.entities.Project.list(),
      base44.auth.me(),
      base44.entities.DisputeEvidence.list(),
      base44.entities.CustomField.filter({ status: "active" }),
    ]).then(([d, p, u, ev, cf]) => {
      setDisputes(d);
      setProjects(p);
      setCurrentUser(u);
      setCustomFields(cf);
      // Build evidence map keyed by dispute_id
      const map = {};
      ev.forEach(e => {
        if (!map[e.dispute_id]) map[e.dispute_id] = [];
        map[e.dispute_id].push(e);
      });
      setEvidenceMap(map);
      setLoading(false);
      setAuthChecked(true);
    }).catch(() => { setLoading(false); setAuthChecked(true); });
  };

  useEffect(() => { load(); }, []);

  // ── Access control ──────────────────────────────────────────────────
  const isAllowed = authChecked && currentUser &&
    (currentUser.role === "super_admin" || currentUser.role === "admin");

  // ── Combined filtered data (memoised for performance) ───────────────
  const filteredDisputes = useMemo(() => disputes.filter(d => {
    const matchSearch = !search ||
      d.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      d.cardholder_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.reason_code?.toLowerCase().includes(search.toLowerCase()) ||
      d.sub_unit_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus  = statusFilter === "all" || d.status === statusFilter;
    const matchProject = projectFilter === "all" || d.project_id === projectFilter;
    const matchDate    = !dateFrom || !dateTo || isInRange(
      dateField === "chargeback_date" ? d.chargeback_date : d.created_date,
      dateFrom, dateTo
    );
    return matchSearch && matchStatus && matchProject && matchDate;
  }), [disputes, search, statusFilter, projectFilter, dateFrom, dateTo, dateField]);



  // ── Status summary counts (from filtered disputes) ──────────────────
  const statusCounts = useMemo(() => {
    const counts = {};
    filteredDisputes.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return counts;
  }, [filteredDisputes]);

  // ── CSV export helpers ───────────────────────────────────────────────
  const downloadCSV = (data, filename) => {
    const csv = data.map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportAll = () => {
    const cfHeaders = customFields.map(cf => cf.field_name);
    const dHeaders = [
      // Case
      "Case ID","Status","Project","Business Unit","Sub Unit","Processor","Merchant ID","DBA Name","Merchant Alias","Fought Decision","Not Fought Reason","Not Fought Notes","Missing Evidence","Assigned To","SLA Deadline","Resolution Date","Recovery Amount","Case Type",
      // Chargeback
      "CB Date","CB Amount","CB Currency","CB Amount USD","Reason Code","Reason Category","ARN Number","Cardholder Name",
      // Card & Auth
      "Card Network","Card Type","Card BIN First6","Card Last4","Auth Code","Auth Date","Auth Amount","Auth Type","AVS Match","CVV Match","3D Secure",
      // Transaction
      "Transaction ID","Transaction Date","Transaction Amount","Transaction Currency","Transaction Country","Transaction State","Billing Zip",
      // Customer & Order
      "Customer ID","Customer Name","Customer Email","Customer Phone","Customer IP","Customer Type","Product Name","Product Type","Sale Type","Service Start","Service End","Cancellation Date","Customer Contact Date",
      // Custom fields
      ...cfHeaders,
      // Evidence
      "Evidence Count","Evidence Types","Evidence Files",
      // Notes
      "Notes","Created Date",
    ];
    const dRows = filteredDisputes.map(d => {
      const evList = evidenceMap[d.id] || [];
      const cfValues = customFields.map(cf => d.custom_fields?.[cf.field_key] ?? "");
      return [
        d.case_id, DISPUTE_STATUS_LABEL[d.status] || d.status,
        projects.find(p => p.id === d.project_id)?.name || "",
        d.business_unit, d.sub_unit_name, d.processor, d.merchant_id, d.dba_name, d.merchant_alias,
        d.fought_decision, d.not_fought_reason, d.not_fought_notes, d.missing_evidence,
        d.assigned_to, d.sla_deadline, d.resolution_date, d.recovery_amount, d.case_type,
        d.chargeback_date, d.chargeback_amount, d.chargeback_currency, d.chargeback_amount_usd,
        d.reason_code, d.reason_category, d.arn_number, d.cardholder_name,
        d.card_network, d.card_type, d.card_bin_first6, d.card_last4,
        d.authorization_code, d.authorization_date, d.authorization_amount, d.authorization_type,
        d.avs_match, d.cvv_match, d.three_d_secure,
        d.transaction_id, d.transaction_date, d.transaction_amount, d.transaction_currency,
        d.transaction_country, d.transaction_state, d.billing_zip_code,
        d.customer_id, d.customer_name, d.customer_email, d.customer_phone, d.customer_ip,
        d.customer_type, d.product_name, d.product_type, d.sale_type,
        d.service_start_date, d.service_end_date, d.cancellation_date, d.customer_contact_date,
        ...cfValues,
        evList.length,
        [...new Set(evList.map(e => e.evidence_type))].join("; "),
        evList.map(e => e.file_name).join("; "),
        d.notes, d.created_date,
      ];
    });
    downloadCSV([dHeaders, ...dRows], `disputes_master_${dateFrom}_${dateTo}.csv`);
  };

  // ── Access denied ───────────────────────────────────────────────────
  if (authChecked && !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-16 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Access Restricted</h2>
        <p className="text-slate-500 text-sm max-w-xs">Master Data is only accessible to Super Admin and Admin users.</p>
      </div>
    );
  }

  // ── Dispute detail drill-down ────────────────────────────────────────
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Data</h1>
          <p className="text-slate-500 text-sm mt-1">Combined disputes &amp; inventory — Super Admin / Admin only</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-1.5" onClick={exportAll}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2" onClick={() => setShowStatusModal(true)}>
            <RefreshCw className="w-4 h-4" />
            Update Processor Status
            {disputes.filter(d => d.status === "awaiting_decision").length > 0 && (
              <span className="bg-white text-purple-700 text-xs font-bold rounded-full px-1.5 py-0.5 leading-none ml-1">
                {disputes.filter(d => d.status === "awaiting_decision").length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Status summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STATUS_SUMMARY_CARDS.map(({ key, label, bg, border, text, num }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              className={`${bg} ${border} border rounded-xl p-3 text-left transition-all hover:shadow-md ${statusFilter === key ? "ring-2 ring-[#0D50B8]" : ""}`}
            >
              <p className={`text-2xl font-bold ${num}`}>{statusCounts[key] || 0}</p>
              <p className={`text-xs font-medium mt-0.5 ${text}`}>{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center bg-white border border-slate-100 rounded-xl px-4 py-3">
        {/* Date field selector */}
        <Select value={dateField} onValueChange={setDateField}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="chargeback_date">Chargeback Date</SelectItem>
            <SelectItem value="created_date">Submitted Date</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <span className="text-slate-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>

        {/* MTD quick reset */}
        <Button variant="outline" size="sm" onClick={() => { setDateFrom(MTD_START); setDateTo(MTD_END); }}
          className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
          Reset to MTD
        </Button>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search case ID, reason code..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Project */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <span className="text-xs text-slate-400 whitespace-nowrap">
          {filteredDisputes.length} disputes
        </span>
      </div>

      {loading ? (
        <p className="text-slate-400 py-12 text-center">Loading...</p>
      ) : (
        <div className="space-y-6">
          {/* ── Disputes Table ── */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Disputes <span className="text-slate-400 font-normal normal-case">({filteredDisputes.length})</span>
            </h2>
            <Card className="border-slate-100">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: "2800px" }}>
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {/* Case */}
                        {["Case ID","Status","Project","Business Unit","Sub Unit","Processor","Merchant ID","DBA Name","Decision","Not Fought Reason","Missing Evid.","Assigned To","SLA Deadline","Resolution Date","Recovery Amt","Case Type",
                        // Chargeback
                        "CB Date","CB Amount","CB Currency","CB USD","Reason Code","Reason Category","ARN","Cardholder",
                        // Card & Auth
                        "Card Network","Card Type","BIN First6","Last4","Auth Code","Auth Date","Auth Amt","AVS","CVV","3DS",
                        // Transaction
                        "Txn ID","Txn Date","Txn Amount","Txn Currency","Txn Country","Txn State","Billing Zip",
                        // Customer
                        "Cust ID","Cust Name","Cust Email","Cust Phone","Cust IP","Cust Type",
                        // Order
                        "Product Name","Product Type","Sale Type","Service Start","Service End","Cancellation","Cust Contact Date",
                        // Custom fields
                        ...customFields.map(cf => cf.field_name),
                        // Evidence
                        "Evidence","Notes",""].map((h, i) => (
                          <th key={i} className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDisputes.length === 0 ? (
                        <tr><td colSpan={60} className="px-4 py-10 text-center text-slate-400">No disputes in this date range</td></tr>
                      ) : filteredDisputes.map(d => {
                        const evList = evidenceMap[d.id] || [];
                        return (
                        <tr key={d.id} className="border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer" onClick={() => setSelectedDispute(d)}>
                          {/* Case */}
                          <td className="px-3 py-2.5 font-medium text-[#0D50B8] whitespace-nowrap">{d.case_id}</td>
                          <td className="px-3 py-2.5">
                            <Badge className={`${DISPUTE_STATUS_COLORS[d.status] || "bg-slate-100 text-slate-600"} text-xs border-0 whitespace-nowrap`}>
                              {DISPUTE_STATUS_LABEL[d.status] || d.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{projects.find(p => p.id === d.project_id)?.name || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{d.business_unit || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{d.sub_unit_name || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{d.processor || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.merchant_id || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.dba_name || "—"}</td>
                          <td className="px-3 py-2.5">
                            {d.fought_decision
                              ? <Badge className={`${d.fought_decision === "fought" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"} text-xs border-0 whitespace-nowrap`}>{d.fought_decision === "fought" ? "Fought" : "Not Fought"}</Badge>
                              : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.not_fought_reason || "—"}</td>
                          <td className="px-3 py-2.5 text-center">
                            {d.missing_evidence === "Yes" ? <Badge className="bg-red-100 text-red-700 text-xs border-0">Yes</Badge> : <span className="text-slate-300 text-xs">No</span>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{d.assigned_to || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.sla_deadline || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.resolution_date || "—"}</td>
                          <td className="px-3 py-2.5 text-emerald-700 font-medium whitespace-nowrap">{d.recovery_amount != null ? `$${d.recovery_amount.toLocaleString()}` : "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xs">{d.case_type || "—"}</td>
                          {/* Chargeback */}
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.chargeback_date || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-700 font-medium whitespace-nowrap">{d.chargeback_amount?.toLocaleString() || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.chargeback_currency || "—"}</td>
                          <td className="px-3 py-2.5 text-emerald-700 font-medium whitespace-nowrap">{d.chargeback_amount_usd ? `$${d.chargeback_amount_usd.toLocaleString()}` : "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.reason_code || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.reason_category || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.arn_number || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{d.cardholder_name || "—"}</td>
                          {/* Card & Auth */}
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{d.card_network || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.card_type || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.card_bin_first6 || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.card_last4 || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.authorization_code || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.authorization_date || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.authorization_amount?.toLocaleString() || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.avs_match || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.cvv_match || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.three_d_secure || "—"}</td>
                          {/* Transaction */}
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.transaction_id || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.transaction_date || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-700 font-medium">{d.transaction_amount?.toLocaleString() || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.transaction_currency || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.transaction_country || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.transaction_state || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{d.billing_zip_code || "—"}</td>
                          {/* Customer */}
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.customer_id || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{d.customer_name || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.customer_email || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.customer_phone || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.customer_ip || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.customer_type || "—"}</td>
                          {/* Order */}
                          <td className="px-3 py-2.5 text-slate-600">{d.product_name || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.product_type || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{d.sale_type || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.service_start_date || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.service_end_date || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.cancellation_date || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{d.customer_contact_date || "—"}</td>
                          {/* Custom fields */}
                          {customFields.map(cf => (
                            <td key={cf.id} className="px-3 py-2.5 text-slate-600 text-xs">{d.custom_fields?.[cf.field_key] ?? "—"}</td>
                          ))}
                          {/* Evidence */}
                          <td className="px-3 py-2.5">
                            {evList.length === 0 ? (
                              <span className="text-slate-300 text-xs">None</span>
                            ) : (
                              <div className="space-y-0.5 min-w-[180px]">
                                {evList.map((ev, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <Badge className="bg-indigo-50 text-indigo-700 text-xs border-0 whitespace-nowrap">{ev.evidence_type || "Other"}</Badge>
                                    <a href={ev.file_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-[#0D50B8] hover:underline truncate max-w-[120px]">{ev.file_name}</a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          {/* Notes */}
                          <td className="px-3 py-2.5 text-slate-400 text-xs max-w-[200px]">
                            {d.notes ? <span className="line-clamp-2">{d.notes}</span> : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setSelectedDispute(d); }}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>


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