import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

export default function CoverLetterManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", content: "", status: "active" });

  const load = () => base44.entities.CoverLetterTemplate.list().then(d => { setRecords(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editId) await base44.entities.CoverLetterTemplate.update(editId, form);
    else await base44.entities.CoverLetterTemplate.create(form);
    setShowForm(false); setEditId(null);
    setForm({ name: "", content: "", status: "active" });
    load();
  };

  const del = async (id) => { await base44.entities.CoverLetterTemplate.delete(id); load(); };
  const edit = (r) => { setForm({ name: r.name, content: r.content || "", status: r.status }); setEditId(r.id); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{records.length} templates</p>
        <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); }}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#0D50B8]/20 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Template Name</label>
                <Input placeholder="Template name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Content (use {"{{field_name}}"} for dynamic fields)</label>
              <textarea
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-1 focus:ring-[#0D50B8] resize-y"
                placeholder="Enter template content..."
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} className="bg-[#0D50B8] hover:bg-[#0a3d8f]"><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-slate-400 text-center py-8 text-sm">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-slate-400 text-center py-8 text-sm">No templates yet</p>
        ) : records.map(r => (
          <Card key={r.id} className="border-slate-100 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-800 text-sm">{r.name}</h3>
                    <Badge className={r.status === "active" ? "bg-green-100 text-green-800 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>{r.status}</Badge>
                  </div>
                  {r.content && <p className="text-xs text-slate-500 line-clamp-2">{r.content}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => del(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}