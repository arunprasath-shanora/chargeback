import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check, Search } from "lucide-react";

const COUNTRIES = ["USA", "UK", "Australia", "Canada", "New Zealand", "Germany", "France", "Netherlands", "Spain", "Italy", "Sweden", "Norway", "Denmark", "Switzerland", "Austria", "Belgium", "Portugal", "Ireland", "Finland", "Other"];

export default function GeographyManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [form, setForm] = useState({ city: "", state: "", country: "USA", status: "active" });

  const load = () => base44.entities.Geography.list().then(d => { setRecords(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editId) await base44.entities.Geography.update(editId, form);
    else await base44.entities.Geography.create(form);
    setShowForm(false); setEditId(null);
    setForm({ city: "", state: "", country: "USA", status: "active" });
    load();
  };

  const del = async (id) => { await base44.entities.Geography.delete(id); load(); };
  const edit = (r) => { setForm({ city: r.city || "", state: r.state || "", country: r.country || "USA", status: r.status || "active" }); setEditId(r.id); setShowForm(true); };

  const countries = [...new Set(records.map(r => r.country).filter(Boolean))];

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.city?.toLowerCase().includes(search.toLowerCase()) ||
      r.state?.toLowerCase().includes(search.toLowerCase()) ||
      r.country?.toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === "all" || r.country === countryFilter;
    return matchSearch && matchCountry;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{records.length} locations</p>
        <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); setForm({ city: "", state: "", country: "USA", status: "active" }); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Location
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#0D50B8]/20 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">City</label>
                <Input placeholder="City name" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">State / Province</label>
                <Input placeholder="State or Province" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Country</label>
                <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-100">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["City", "State / Province", "Country", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No locations found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.city || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.state || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.country || "—"}</td>
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