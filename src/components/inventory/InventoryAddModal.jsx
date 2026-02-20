import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BLANK = {
  case_id: "", case_type: "", arn_number: "", reason_code: "", reason_category: "",
  transaction_date: "", transaction_amount: "", currency: "USD",
  chargeback_date: "", chargeback_amount: "", processor: "",
  card_network: "", card_type: "", bin_first6: "", bin_last4: "",
  due_date: "", sub_unit_name: "", merchant_id: "", notes: "",
  project_id: "", source: "Manual",
};

const F = ({ label, children }) => (
  <div className="space-y-1">
    <Label className="text-xs font-medium text-slate-600">{label}</Label>
    {children}
  </div>
);

export default function InventoryAddModal({ open, onClose, projects, onSuccess }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.case_id) return;
    setSaving(true);
    await base44.entities.InventoryItem.create({
      ...form,
      transaction_amount: form.transaction_amount ? parseFloat(form.transaction_amount) : undefined,
      chargeback_amount: form.chargeback_amount ? parseFloat(form.chargeback_amount) : undefined,
      status: "received",
    });
    setSaving(false);
    setForm(BLANK);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item Manually</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <F label="Case ID *"><Input value={form.case_id} onChange={e => set("case_id", e.target.value)} placeholder="CB-2024-001" /></F>
          <F label="Project">
            <Select value={form.project_id} onValueChange={v => set("project_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
              <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Case Type">
            <Select value={form.case_type} onValueChange={v => set("case_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {["First Chargeback","Second Chargeback","Pre-Arbitration","Arbitration","Retrieval Request","Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="ARN Number"><Input value={form.arn_number} onChange={e => set("arn_number", e.target.value)} /></F>
          <F label="Reason Code"><Input value={form.reason_code} onChange={e => set("reason_code", e.target.value)} /></F>
          <F label="Reason Category"><Input value={form.reason_category} onChange={e => set("reason_category", e.target.value)} /></F>
          <F label="Transaction Date"><Input type="date" value={form.transaction_date} onChange={e => set("transaction_date", e.target.value)} /></F>
          <F label="Transaction Amount"><Input type="number" value={form.transaction_amount} onChange={e => set("transaction_amount", e.target.value)} /></F>
          <F label="Chargeback Date"><Input type="date" value={form.chargeback_date} onChange={e => set("chargeback_date", e.target.value)} /></F>
          <F label="Chargeback Amount"><Input type="number" value={form.chargeback_amount} onChange={e => set("chargeback_amount", e.target.value)} /></F>
          <F label="Currency"><Input value={form.currency} onChange={e => set("currency", e.target.value)} placeholder="USD" /></F>
          <F label="Due Date"><Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} /></F>
          <F label="Card Network">
            <Select value={form.card_network} onValueChange={v => set("card_network", v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {["Visa","Mastercard","American Express","Discover","Other"].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Card Type"><Input value={form.card_type} onChange={e => set("card_type", e.target.value)} placeholder="Credit / Debit" /></F>
          <F label="BIN First 6"><Input value={form.bin_first6} onChange={e => set("bin_first6", e.target.value)} /></F>
          <F label="Card Last 4"><Input value={form.bin_last4} onChange={e => set("bin_last4", e.target.value)} /></F>
          <F label="Processor"><Input value={form.processor} onChange={e => set("processor", e.target.value)} /></F>
          <F label="Sub Unit Name"><Input value={form.sub_unit_name} onChange={e => set("sub_unit_name", e.target.value)} /></F>
          <F label="Merchant ID"><Input value={form.merchant_id} onChange={e => set("merchant_id", e.target.value)} /></F>
          <div className="sm:col-span-2">
            <F label="Notes"><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleSave} disabled={saving || !form.case_id}>
            {saving ? "Saving..." : "Add to Inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}