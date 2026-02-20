import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

export default function CustomFieldManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ field_name: "", field_key: "", field_type: "text", category: "other", is_mandatory: false, status: "active", dropdown_options: [] });
  const [newOption, setNewOption] = useState("");

  const load = () => base44.entities.CustomField.list().then(d => { setRecords(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editId) await base44.entities.CustomField.update(editId, form);
    else await base44.entities.CustomField.create(form);
    setShowForm(false); setEditId(null);
    setForm({ field_name: "", field_key: "", field_type: "text", category: "other", is_mandatory: false, status: "active", dropdown_options: [] });
    setNewOption("");
    load();
  };

  const addOption = () => {
    const opt = newOption.trim();
    if (!opt || (form.dropdown_options || []).includes(opt)) return;
    setForm(f => ({ ...f, dropdown_options: [...(f.dropdown_options || []), opt] }));
    setNewOption("");
  };

  const removeOption = (opt) => {
    setForm(f => ({ ...f, dropdown_options: (f.dropdown_options || []).filter(o => o !== opt) }));
  };

  const del = async (id) => { await base44.entities.CustomField.delete(id); load(); };

  const edit = (r) => {
    setForm({ field_name: r.field_name, field_key: r.field_key, field_type: r.field_type, category: r.category, is_mandatory: r.is_mandatory, status: r.status, dropdown_options: r.dropdown_options || [] });
    setNewOption("");
    setEditId(r.id); setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{records.length} custom fields</p>
        <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); }}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#0D50B8]/20 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Field Name</label>
                <Input placeholder="Display name" value={form.field_name} onChange={e => setForm(f => ({ ...f, field_name: e.target.value, field_key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Field Key</label>
                <Input placeholder="field_key" value={form.field_key} onChange={e => setForm(f => ({ ...f, field_key: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                <Select value={form.field_type} onValueChange={v => setForm(f => ({ ...f, field_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="alphanumeric">Alphanumeric</SelectItem>
                    <SelectItem value="dropdown">Dropdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="case_details">Case Details</SelectItem>
                    <SelectItem value="transaction_details">Transaction Details</SelectItem>
                    <SelectItem value="order_details">Order Details</SelectItem>
                    <SelectItem value="customer_details">Customer Details</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_mandatory} onCheckedChange={v => setForm(f => ({ ...f, is_mandatory: v }))} />
              <label className="text-xs text-slate-600">Mandatory</label>
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
                {["Field Name", "Key", "Type", "Category", "Mandatory", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No custom fields yet</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.field_name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.field_key}</td>
                  <td className="px-4 py-3"><Badge className="bg-blue-100 text-blue-800 border-0 text-xs">{r.field_type}</Badge></td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{r.category?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{r.is_mandatory ? <Badge className="bg-orange-100 text-orange-800 border-0 text-xs">Yes</Badge> : <span className="text-slate-400 text-xs">No</span>}</td>
                  <td className="px-4 py-3"><Badge className={r.status === "active" ? "bg-green-100 text-green-800 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>{r.status}</Badge></td>
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