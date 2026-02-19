import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check, Search, Download } from "lucide-react";

const PROCESSOR_TYPES = ["Card Network", "Payment Gateway", "Acquirer", "Issuer", "PSP", "Other"];

// Global processors pre-loaded list
const GLOBAL_PROCESSORS = [
  { name: "Visa",               type: "Card Network",     country: "USA" },
  { name: "Mastercard",         type: "Card Network",     country: "USA" },
  { name: "American Express",   type: "Card Network",     country: "USA" },
  { name: "Discover",           type: "Card Network",     country: "USA" },
  { name: "UnionPay",           type: "Card Network",     country: "China" },
  { name: "JCB",                type: "Card Network",     country: "Japan" },
  { name: "Diners Club",        type: "Card Network",     country: "USA" },
  { name: "Stripe",             type: "Payment Gateway",  country: "USA" },
  { name: "PayPal",             type: "Payment Gateway",  country: "USA" },
  { name: "Square",             type: "Payment Gateway",  country: "USA" },
  { name: "Braintree",          type: "Payment Gateway",  country: "USA" },
  { name: "Authorize.Net",      type: "Payment Gateway",  country: "USA" },
  { name: "Adyen",              type: "Payment Gateway",  country: "Netherlands" },
  { name: "Worldpay",           type: "Payment Gateway",  country: "UK" },
  { name: "Checkout.com",       type: "Payment Gateway",  country: "UK" },
  { name: "Klarna",             type: "PSP",              country: "Sweden" },
  { name: "Mollie",             type: "PSP",              country: "Netherlands" },
  { name: "Razorpay",           type: "PSP",              country: "India" },
  { name: "Paytm",              type: "PSP",              country: "India" },
  { name: "2Checkout",          type: "Payment Gateway",  country: "USA" },
  { name: "NMI",                type: "Payment Gateway",  country: "USA" },
  { name: "Paysafe",            type: "PSP",              country: "UK" },
  { name: "Fiserv",             type: "Acquirer",         country: "USA" },
  { name: "FIS",                type: "Acquirer",         country: "USA" },
  { name: "Global Payments",    type: "Acquirer",         country: "USA" },
  { name: "Elavon",             type: "Acquirer",         country: "USA" },
  { name: "Chase Paymentech",   type: "Acquirer",         country: "USA" },
  { name: "Bank of America Merchant Services", type: "Acquirer", country: "USA" },
  { name: "Wells Fargo Merchant Services",     type: "Acquirer", country: "USA" },
  { name: "Heartland Payment Systems",         type: "Acquirer", country: "USA" },
  { name: "TSYS",               type: "Acquirer",         country: "USA" },
  { name: "Worldline",          type: "Acquirer",         country: "France" },
  { name: "Nexi",               type: "Acquirer",         country: "Italy" },
  { name: "Nets",               type: "Acquirer",         country: "Denmark" },
  { name: "SumUp",              type: "PSP",              country: "UK" },
  { name: "iZettle",            type: "PSP",              country: "Sweden" },
  { name: "Zettle by PayPal",   type: "PSP",              country: "UK" },
  { name: "Cybersource",        type: "Payment Gateway",  country: "USA" },
  { name: "First Data",         type: "Acquirer",         country: "USA" },
  { name: "Merrick Bank",       type: "Issuer",           country: "USA" },
  { name: "Citi",               type: "Issuer",           country: "USA" },
  { name: "JPMorgan Chase",     type: "Issuer",           country: "USA" },
  { name: "Capital One",        type: "Issuer",           country: "USA" },
  { name: "Synchrony",          type: "Issuer",           country: "USA" },
  { name: "Barclays",           type: "Issuer",           country: "UK" },
  { name: "HSBC",               type: "Issuer",           country: "UK" },
  { name: "Deutsche Bank",      type: "Issuer",           country: "Germany" },
];

const TYPE_COLORS = {
  "Card Network":    "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "Payment Gateway": "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  "Acquirer":        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "Issuer":          "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "PSP":             "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  "Other":           "bg-slate-100 text-slate-600",
};

export default function ProcessorManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [form, setForm] = useState({ name: "", type: "Payment Gateway", country: "", website: "", status: "active" });

  const load = () => base44.entities.Processor.list().then(d => { setRecords(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: "", type: "Payment Gateway", country: "", website: "", status: "active" });

  const save = async () => {
    if (editId) await base44.entities.Processor.update(editId, form);
    else await base44.entities.Processor.create(form);
    setShowForm(false); setEditId(null); resetForm(); load();
  };

  const del = async (id) => { await base44.entities.Processor.delete(id); load(); };
  const edit = (r) => {
    setForm({ name: r.name || "", type: r.type || "Payment Gateway", country: r.country || "", website: r.website || "", status: r.status || "active" });
    setEditId(r.id); setShowForm(true);
  };

  const importGlobal = async () => {
    setImporting(true);
    const existing = new Set(records.map(r => r.name.toLowerCase()));
    const toCreate = GLOBAL_PROCESSORS.filter(p => !existing.has(p.name.toLowerCase())).map(p => ({ ...p, status: "active" }));
    if (toCreate.length === 0) {
      setImportMsg("All global processors already imported.");
    } else {
      await base44.entities.Processor.bulkCreate(toCreate);
      setImportMsg(`Imported ${toCreate.length} global processors.`);
      load();
    }
    setImporting(false);
    setTimeout(() => setImportMsg(""), 4000);
  };

  const filtered = records.filter(r => {
    const matchSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.country?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-slate-500">{records.length} processors</p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={importGlobal} disabled={importing} className="border-[#0D50B8] text-[#0D50B8] hover:bg-blue-50 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            {importing ? "Importing..." : "Import Global Processors"}
          </Button>
          <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); resetForm(); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Processor
          </Button>
        </div>
      </div>

      {importMsg && (
        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> {importMsg}
        </p>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <Card className="border-[#0D50B8]/20 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Processor Name *</label>
                <Input placeholder="e.g. Stripe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROCESSOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Country</label>
                <Input placeholder="e.g. USA" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
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
              <label className="text-xs font-medium text-slate-600 mb-1 block">Website (optional)</label>
              <Input placeholder="https://..." value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={!form.name} className="bg-[#0D50B8] hover:bg-[#0a3d8f]"><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); resetForm(); }}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search processors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROCESSOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Processor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Country</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No processors found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.website ? (
                      <a href={r.website} target="_blank" rel="noreferrer" className="hover:text-[#0D50B8] hover:underline">{r.name}</a>
                    ) : r.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_COLORS[r.type] || TYPE_COLORS["Other"]}`}>
                      {r.type || "—"}
                    </span>
                  </td>
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