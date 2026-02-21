import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, ArrowRightLeft, Upload, Zap, AlertTriangle, RefreshCw, Download, Pencil, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import InventoryUploadModal from "@/components/inventory/InventoryUploadModal";
import InventoryAddModal from "@/components/inventory/InventoryAddModal";
import ApiInfoModal from "@/components/inventory/ApiInfoModal";
import { auditLog } from "@/components/security/auditLogger";

const statusColors = {
  received:  "bg-yellow-100 text-yellow-800",
  assigned:  "bg-blue-100 text-blue-800",
  converted: "bg-green-100 text-green-800",
  expired:   "bg-red-100 text-red-800",
};

const networkColors = {
  Visa:               "bg-blue-100 text-blue-800",
  Mastercard:         "bg-orange-100 text-orange-800",
  "American Express": "bg-sky-100 text-sky-800",
  Discover:           "bg-amber-100 text-amber-800",
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showApi, setShowApi] = useState(false);

  // Assign / Convert dialog
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [projectUsers, setProjectUsers] = useState([]); // analysts for selected project

  // Edit due date
  const [editDueDateItem, setEditDueDateItem] = useState(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [savingDueDate, setSavingDueDate] = useState(false);

  // Bulk assign
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkProject, setBulkProject] = useState("");
  const [bulkAnalyst, setBulkAnalyst] = useState("");
  const [bulkProjectUsers, setBulkProjectUsers] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.InventoryItem.list("-created_date", 500),
      base44.entities.Project.filter({ status: "active" }),
    ]).then(([d, p]) => {
      setItems(d);
      setProjects(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      i.case_id?.toLowerCase().includes(q) ||
      i.reason_code?.toLowerCase().includes(q) ||
      i.arn_number?.toLowerCase().includes(q) ||
      i.processor?.toLowerCase().includes(q) ||
      i.sub_unit_name?.toLowerCase().includes(q);
    // By default ("all"), hide converted items — they've moved to Disputes
    const matchStatus = statusFilter === "all"
      ? i.status !== "converted"
      : i.status === statusFilter;
    const matchProject = projectFilter === "all" || i.project_id === projectFilter;
    const matchNetwork = networkFilter === "all" || i.card_network === networkFilter;
    return matchSearch && matchStatus && matchProject && matchNetwork;
  });

  // Summary counts
  const counts = { received: 0, assigned: 0, converted: 0, expired: 0 };
  items.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });

  const loadProjectUsers = async (projId) => {
    if (!projId) { setProjectUsers([]); return; }
    const project = projects.find(p => p.id === projId);
    const assignedEmails = project?.assigned_users || [];
    if (assignedEmails.length === 0) { setProjectUsers([]); return; }
    // Fetch users and filter to those assigned to this project
    const allUsers = await base44.entities.User.list();
    setProjectUsers(allUsers.filter(u => assignedEmails.includes(u.email)));
  };

  const openAction = (item) => {
    setActionItem(item);
    setActionType("assign");
    const projId = item.project_id || "";
    setSelectedProject(projId);
    setAssignedTo("");
    loadProjectUsers(projId);
  };

  const handleProjectChange = (projId) => {
    setSelectedProject(projId);
    setAssignedTo("");
    loadProjectUsers(projId);
  };

  const handleAction = async () => {
    setSaving(true);
    const projId = selectedProject || actionItem.project_id;
    const analyst = assignedTo === "__none__" ? undefined : assignedTo || undefined;
    const project = projects.find(p => p.id === projId);
    // Find matching sub-unit from project if available
    const subUnit = project?.sub_units?.find(s => s.sub_unit_name === actionItem.sub_unit_name || s.merchant_id === actionItem.merchant_id);

    // Create dispute automatically
    await base44.entities.Dispute.create({
      case_id: actionItem.case_id,
      project_id: projId,
      business_unit: project?.name || actionItem.business_unit,
      sub_unit_name: actionItem.sub_unit_name || subUnit?.sub_unit_name,
      case_type: actionItem.case_type,
      arn_number: actionItem.arn_number,
      reason_code: actionItem.reason_code,
      reason_category: actionItem.reason_category,
      transaction_date: actionItem.transaction_date,
      transaction_amount: actionItem.transaction_amount,
      transaction_currency: actionItem.currency,
      chargeback_date: actionItem.chargeback_date,
      chargeback_amount: actionItem.chargeback_amount,
      chargeback_currency: actionItem.currency,
      sla_deadline: actionItem.due_date,
      processor: actionItem.processor || subUnit?.processor,
      card_network: actionItem.card_network,
      card_type: actionItem.card_type,
      card_bin_first6: actionItem.bin_first6,
      card_last4: actionItem.bin_last4,
      merchant_id: actionItem.merchant_id || subUnit?.merchant_id,
      dba_name: subUnit?.dba_name,
      assigned_to: analyst,
      status: "new",
    });

    // Update inventory to converted
    await base44.entities.InventoryItem.update(actionItem.id, { status: "converted" });

    // Log the action
    auditLog({
      action: "update",
      resource_type: "InventoryItem",
      resource_id: actionItem.id,
      old_value: `status: ${actionItem.status}`,
      new_value: `status: converted, assigned_to: ${analyst || "none"}`,
      details: `Converted inventory case ${actionItem.case_id} to dispute and assigned to ${analyst || "unassigned"}`
    });

    setSaving(false);
    setActionItem(null);
    setActionType(null);
    load();
  };

  const handleSaveDueDate = async () => {
    setSavingDueDate(true);
    await base44.entities.InventoryItem.update(editDueDateItem.id, { due_date: editDueDate });
    auditLog({
      action: "update",
      resource_type: "InventoryItem",
      resource_id: editDueDateItem.id,
      old_value: `due_date: ${editDueDateItem.due_date || "none"}`,
      new_value: `due_date: ${editDueDate}`,
      details: `Updated due date for case ${editDueDateItem.case_id}`
    });
    setSavingDueDate(false);
    setEditDueDateItem(null);
    load();
  };

  const handleExport = () => {
    const headers = ["Case ID","Case Type","ARN","Reason Code","Reason Category","Project","Sub Unit","MID","Status","Source","Card Network","Card Type","BIN First 6","Last 4","CB Amount","Currency","CB Date","Txn Date","Due Date","Assigned To"];
    const rows = filtered.map(i => {
      const proj = activeProjects.find(p => p.id === i.project_id);
      return [
        i.case_id, i.case_type, i.arn_number, i.reason_code, i.reason_category,
        proj?.name || "", i.sub_unit_name, i.merchant_id, i.status, i.source,
        i.card_network, i.card_type, i.bin_first6, i.bin_last4,
        i.chargeback_amount, i.currency, i.chargeback_date, i.transaction_date,
        i.due_date, i.assigned_to
      ].map(v => `"${v ?? ""}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const eligible = filtered.filter(i => i.status === "received" || i.status === "assigned");
    if (eligible.every(i => selectedIds.has(i.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligible.map(i => i.id)));
    }
  };

  const openBulkAssign = () => {
    setBulkProject("");
    setBulkAnalyst("");
    setBulkProjectUsers([]);
    setShowBulkAssign(true);
  };

  const handleBulkProjectChange = async (projId) => {
    setBulkProject(projId);
    setBulkAnalyst("");
    if (!projId) { setBulkProjectUsers([]); return; }
    const project = projects.find(p => p.id === projId);
    const emails = project?.assigned_users || [];
    if (!emails.length) { setBulkProjectUsers([]); return; }
    const allUsers = await base44.entities.User.list();
    setBulkProjectUsers(allUsers.filter(u => emails.includes(u.email)));
  };

  const handleBulkAssign = async () => {
    setBulkSaving(true);
    const ids = Array.from(selectedIds);
    const analyst = bulkAnalyst === "__none__" ? undefined : bulkAnalyst || undefined;
    await Promise.all(ids.map(id =>
      base44.entities.InventoryItem.update(id, {
        ...(bulkProject ? { project_id: bulkProject } : {}),
        ...(analyst !== undefined ? { assigned_to: analyst } : {}),
        status: "assigned",
      })
    ));
    auditLog({
      action: "update",
      resource_type: "InventoryItem",
      details: `Bulk assigned ${ids.length} items to analyst ${analyst || "unassigned"}`,
      record_count: ids.length,
      new_value: `project: ${bulkProject}, assigned_to: ${analyst || "none"}, status: assigned`
    });
    setBulkSaving(false);
    setShowBulkAssign(false);
    setSelectedIds(new Set());
    load();
  };

  const activeProjects = projects; // already filtered to active on load

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Incoming chargeback inventory — linked to active projects only</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setShowApi(true)} className="gap-1.5 text-xs">
            <Zap className="w-3.5 h-3.5" /> API / Automation
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowUpload(true)} className="gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" /> Bulk Upload
          </Button>
          <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f] gap-1.5 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Manual
          </Button>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="outline" onClick={openBulkAssign} className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
              <Users className="w-3.5 h-3.5" /> Bulk Assign ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={load} className="gap-1.5 text-xs text-slate-500">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Received",  key: "received",  color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
          { label: "Assigned",  key: "assigned",  color: "bg-blue-50 border-blue-200 text-blue-800" },
          { label: "Converted", key: "converted", color: "bg-green-50 border-green-200 text-green-800" },
          { label: "Expired",   key: "expired",   color: "bg-red-50 border-red-200 text-red-800" },
        ].map(({ label, key, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            className={`stat-chip border rounded-xl px-4 py-3 text-left transition-all ${statusFilter === key ? color + " ring-2 ring-offset-1 ring-current/30" : "border-slate-200 hover:border-slate-300"}`}
          >
            <p className="text-2xl font-bold">{counts[key]}</p>
            <p className="text-xs font-medium mt-0.5 text-slate-500">{label}</p>
          </button>
        ))}
      </div>

      {/* No active projects warning */}
      {!loading && activeProjects.length === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>No active projects found. Please activate a project first — inventory items must be linked to an active project.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search case ID, ARN, processor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {activeProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={networkFilter} onValueChange={setNetworkFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Card Network" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            {["Visa","Mastercard","American Express","Discover","Other"].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 w-8">
                    <Checkbox
                      checked={filtered.filter(i => i.status === "received" || i.status === "assigned").length > 0 &&
                        filtered.filter(i => i.status === "received" || i.status === "assigned").every(i => selectedIds.has(i.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  {["Case ID","Case Type","ARN","Reason Code","Project","Sub Unit","MID","Status","Source","Card Network","Card Type","BIN","CB Amount","Currency","CB Date","Txn Date","Due Date","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={18} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                <tr><td colSpan={18} className="px-4 py-10 text-center text-slate-400">No inventory items found</td></tr>
                ) : filtered.map(i => {
                  const proj = activeProjects.find(p => p.id === i.project_id);
                  return (
                    <tr key={i.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedIds.has(i.id) ? "bg-blue-50/60" : ""}`}>
                      <td className="px-4 py-3 w-8">
                        {(i.status === "received" || i.status === "assigned") && (
                          <Checkbox checked={selectedIds.has(i.id)} onCheckedChange={() => toggleSelect(i.id)} />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{i.case_id}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{i.case_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{i.arn_number || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs"><span className="font-medium text-slate-700">{i.reason_code || "—"}</span>{i.reason_category && <span className="block text-slate-400 text-[11px]">{i.reason_category}</span>}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{proj?.name || <span className="text-slate-300 italic">Unassigned</span>}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{i.sub_unit_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{i.merchant_id || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusColors[i.status] || "bg-slate-100 text-slate-700"} text-xs border-0`}>{i.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{i.source || "—"}</td>
                      <td className="px-4 py-3">
                        {i.card_network ? (
                          <Badge className={`${networkColors[i.card_network] || "bg-slate-100 text-slate-700"} text-xs border-0`}>{i.card_network}</Badge>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{i.card_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{i.bin_first6 ? `${i.bin_first6}••••${i.bin_last4}` : "—"}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs font-medium whitespace-nowrap">{i.chargeback_amount?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{i.currency || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{i.chargeback_date || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{i.transaction_date || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 group">
                          {i.due_date ? (
                            <span className={`text-xs font-medium ${new Date(i.due_date) < new Date() ? "text-red-500" : new Date(i.due_date) < new Date(Date.now() + 3*86400000) ? "text-amber-600" : "text-slate-500"}`}>{i.due_date}</span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                          <button
                            onClick={() => { setEditDueDateItem(i); setEditDueDate(i.due_date || ""); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 transition-all ml-0.5"
                            title="Edit due date"
                          >
                            <Pencil className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(i.status === "received" || i.status === "assigned") && (
                          <Button size="sm" className="h-7 text-xs px-2 bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => openAction(i)}>
                            <ArrowRightLeft className="w-3 h-3 mr-1" /> Assign & Convert
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400">
              Showing {filtered.length} of {items.length} items
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign & Convert Dialog */}
      <Dialog open={!!actionItem} onOpenChange={() => { setActionItem(null); setActionType(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Analyst & Convert to Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">Case ID: <span className="font-medium text-slate-800">{actionItem?.case_id}</span></p>
            <div className="space-y-1">
              <Label className="text-xs">Active Project</Label>
              <Select value={selectedProject} onValueChange={handleProjectChange}>
                <SelectTrigger><SelectValue placeholder="Select active project..." /></SelectTrigger>
                <SelectContent>
                  {activeProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assign to Analyst (optional)</Label>
              {projectUsers.length > 0 ? (
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select analyst..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {projectUsers.map(u => (
                      <SelectItem key={u.email} value={u.email}>
                        {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-slate-400 italic py-1.5">
                  {selectedProject ? "No analysts assigned to this project. Add users in Project Settings." : "Select a project first."}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionItem(null); setActionType(null); }}>Cancel</Button>
            <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleAction} disabled={saving}>
              {saving ? "Converting..." : "Assign & Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssign} onOpenChange={setShowBulkAssign}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assign to Analyst</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500"><span className="font-medium text-slate-800">{selectedIds.size} items</span> selected — status will be set to <span className="font-medium">Assigned</span>.</p>
            <div className="space-y-1">
              <Label className="text-xs">Project (optional override)</Label>
              <Select value={bulkProject} onValueChange={handleBulkProjectChange}>
                <SelectTrigger><SelectValue placeholder="Keep existing project / select to change..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__keep__">— Keep existing —</SelectItem>
                  {activeProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assign to Analyst</Label>
              {bulkProject && bulkProject !== "__keep__" ? (
                bulkProjectUsers.length > 0 ? (
                  <Select value={bulkAnalyst} onValueChange={setBulkAnalyst}>
                    <SelectTrigger><SelectValue placeholder="Select analyst..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Unassigned —</SelectItem>
                      {bulkProjectUsers.map(u => (
                        <SelectItem key={u.email} value={u.email}>
                          {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-slate-400 italic py-1.5">No analysts assigned to this project.</p>
                )
              ) : (
                <p className="text-xs text-slate-400 italic py-1.5">Select a project above to pick an analyst.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssign(false)}>Cancel</Button>
            <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleBulkAssign} disabled={bulkSaving}>
              {bulkSaving ? "Assigning..." : `Assign ${selectedIds.size} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Due Date Dialog */}
      <Dialog open={!!editDueDateItem} onOpenChange={() => setEditDueDateItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Due Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">Case ID: <span className="font-medium text-slate-800">{editDueDateItem?.case_id}</span></p>
            <div className="space-y-1">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDueDateItem(null)}>Cancel</Button>
            <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleSaveDueDate} disabled={savingDueDate}>
              {savingDueDate ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-modals */}
      <InventoryUploadModal open={showUpload} onClose={() => setShowUpload(false)} projects={activeProjects} onSuccess={load} />
      <InventoryAddModal    open={showAdd}    onClose={() => setShowAdd(false)}    projects={activeProjects} onSuccess={load} />
      <ApiInfoModal         open={showApi}    onClose={() => setShowApi(false)} />
    </div>
  );
}