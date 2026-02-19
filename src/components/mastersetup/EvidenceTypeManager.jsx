import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

export default function EvidenceTypeManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", upload_requirement: "optional", max_file_size_mb: 10, status: "active" });

  const load = () => base44.entities.EvidenceType.list().then(d => { setRecords(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editId) await base44.entities.EvidenceType.update(editId, form);
    else await base44.entities.EvidenceType.create(form);
    setShowForm(false); setEditId(null);
    setForm({ name: "", description: "", upload_requirement: "optional", max_file_size_mb: 10, status: "active" });
    load();
  };

  const del = async (id) => { await base44.entities.EvidenceType.delete(id); load(); };
  const edit = (r) => { setForm({ name: r.name, description: r.description || "", upload_requirement: r.upload_requirement, max_file_size_mb: r.max_file_size_mb, status: r.status }); setEditId(r.id); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{records.length} evidence types</p>
        <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); }}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#0D50B8]/20 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Name</label>
                <Input placeholder="Evidence type name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Requirement</label>
                <Select value={form.upload_requirement} onValueChange={v => setForm(f => ({ ...f, upload_requirement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mandatory">Mandatory</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Max Size (MB)</label>
                <Input type="number" value={form.max_file_size_mb} onChange={e => setForm(f => ({ ...f, max_file_size_mb: +e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
              <Input placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
                {["Name", "Description", "Requirement", "Max Size", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No evidence types yet</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{r.description || "—"}</td>
                  <td className="px-4 py-3"><Badge className={r.upload_requirement === "mandatory" ? "bg-orange-100 text-orange-800 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>{r.upload_requirement}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{r.max_file_size_mb} MB</td>
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