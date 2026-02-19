import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, ArrowRightLeft } from "lucide-react";

const statusColors = {
  received: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  converted: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionItem, setActionItem] = useState(null); // item being assigned/converted
  const [actionType, setActionType] = useState(null); // 'assign' or 'convert'
  const [selectedProject, setSelectedProject] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.InventoryItem.list("-created_date", 200),
      base44.entities.Project.list(),
    ]).then(([d, p]) => {
      setItems(d);
      setProjects(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      i.reason_code?.toLowerCase().includes(search.toLowerCase()) ||
      i.business_unit?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAction = (item, type) => {
    setActionItem(item);
    setActionType(type);
    setSelectedProject(item.project_id || "");
    setAssignedTo("");
  };

  const handleAction = async () => {
    setSaving(true);
    if (actionType === "assign") {
      await base44.entities.InventoryItem.update(actionItem.id, {
        status: "assigned",
        project_id: selectedProject || actionItem.project_id,
      });
    } else if (actionType === "convert") {
      // Create a dispute from this inventory item
      const project = projects.find(p => p.id === (selectedProject || actionItem.project_id));
      await base44.entities.Dispute.create({
        case_id: actionItem.case_id,
        project_id: selectedProject || actionItem.project_id,
        business_unit: project?.name || actionItem.business_unit,
        sub_unit_name: actionItem.sub_unit_name,
        case_type: actionItem.case_type,
        arn_number: actionItem.arn_number,
        reason_code: actionItem.reason_code,
        reason_category: actionItem.reason_category,
        transaction_date: actionItem.transaction_date,
        transaction_amount: actionItem.transaction_amount,
        transaction_currency: actionItem.currency,
        dispute_date: actionItem.chargeback_date,
        dispute_amount: actionItem.chargeback_amount,
        dispute_currency: actionItem.currency,
        sla_deadline: actionItem.due_date,
        processor: actionItem.processor,
        card_type: actionItem.card_type,
        card_bin_first6: actionItem.bin_first6,
        card_last4: actionItem.bin_last4,
        assigned_to: assignedTo || undefined,
        status: "new",
      });
      await base44.entities.InventoryItem.update(actionItem.id, { status: "converted" });
    }
    setSaving(false);
    setActionItem(null);
    setActionType(null);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">Incoming chargeback inventory</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Case ID", "Status", "Source", "Processor", "CB Amount", "CB Date", "Due Date", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No inventory items found</td></tr>
                ) : filtered.map(i => (
                  <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{i.case_id}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusColors[i.status] || "bg-slate-100 text-slate-700"} text-xs border-0`}>{i.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{i.source || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{i.processor || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{i.currency} {i.chargeback_amount?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{i.chargeback_date || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{i.due_date || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {i.status === "received" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => openAction(i, "assign")}>
                            Assign
                          </Button>
                        )}
                        {(i.status === "received" || i.status === "assigned") && (
                          <Button size="sm" className="h-7 text-xs px-2 bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => openAction(i, "convert")}>
                            <ArrowRightLeft className="w-3 h-3 mr-1" /> Convert
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Assign / Convert Dialog */}
      <Dialog open={!!actionItem} onOpenChange={() => { setActionItem(null); setActionType(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === "assign" ? "Assign to Project" : "Convert to Dispute"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">Case ID: <span className="font-medium text-slate-800">{actionItem?.case_id}</span></p>
            <div className="space-y-1">
              <Label className="text-xs">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {actionType === "convert" && (
              <div className="space-y-1">
                <Label className="text-xs">Assign To (optional)</Label>
                <Input placeholder="Analyst email..." value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionItem(null); setActionType(null); }}>Cancel</Button>
            <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleAction} disabled={saving}>
              {saving ? "Saving..." : actionType === "assign" ? "Assign" : "Convert to Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}