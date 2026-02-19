import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const CB_REASONS = [
  "Authorization","Cancelled Recurring","Cancelled Services","Credit Not Processed",
  "Duplicate Processing","Fraudulent Transaction","Incorrect Amount","Invalid Data",
  "Late Presentment","Not As Described","Others","Paid By Other Means","Pre-Arbitration",
  "Pre compliance Chargebacks","Retrieval Request","Services Not Provided",
  "Domestic Chargeback","Not Specified by Processor"
];

export default function ReasonCodeManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ reason_code: "", cb_reason: "", status: "active" });

  const load = () => base44.entities.ReasonCode.list().then(d => { setRecords(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editId) await base44.entities.ReasonCode.update(editId, form);
    else await base44.entities.ReasonCode.create(form);
    setShowForm(false); setEditId(null); setForm({ reason_code: "", cb_reason: "", status: "active" });
    load();
  };

  const del = async (id) => { await base44.entities.ReasonCode.delete(id); load(); };

  const edit = (r) => { setForm({ reason_code: r.reason_code, cb_reason: r.cb_reason, status: r.status }); setEditId(r.id); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{records.length} reason codes</p>
        <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); setForm({ reason_code: "", cb_reason: "", status: "active" }); }}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#0D50B8]/20 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Reason Code</label>
                <Input placeholder="e.g. 4853" value={form.reason_code} onChange={e => setForm(f => ({ ...f, reason_code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">CB Reason</label>
                <Select value={form.cb_reason} onValueChange={v => setForm(f => ({ ...f, cb_reason: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                  <SelectContent>{CB_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} className="bg-[#0D50B8] hover:bg-[#0a3d8f]"><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-100">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Reason Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">CB Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No reason codes yet</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.reason_code}</td>
                  <td className="px-4 py-3 text-slate-600">{r.cb_reason}</td>
                  <td className="px-4 py-3">
                    <Badge className={r.status === "active" ? "bg-green-100 text-green-800 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => del(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
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