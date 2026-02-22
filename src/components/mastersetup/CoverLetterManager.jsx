import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check, Upload, FileText, Copy, ChevronDown, ChevronUp, Bold, Italic, Underline, Table } from "lucide-react";

const RC_GROUPINGS = [
  "Authorization","Cancelled Recurring","Cancelled Services","Credit Not Processed",
  "Duplicate Processing","Fraudulent Transaction","Incorrect Amount","Invalid Data",
  "Late Presentment","Not As Described","Others","Paid By Other Means","Pre-Arbitration",
  "Retrieval Request","Services Not Provided","Arbitration"
];

const FIELD_GROUPS = [
  {
    label: "Case Information",
    fields: [
      { key: "case_id", label: "Case ID" },
      { key: "case_type", label: "Case Type" },
      { key: "status", label: "Status" },
      { key: "assigned_to", label: "Assigned To" },
      { key: "sla_deadline", label: "SLA Deadline" },
      { key: "business_unit", label: "Business Unit" },
      { key: "sub_unit_name", label: "Sub Unit" },
      { key: "processor", label: "Processor" },
      { key: "merchant_id", label: "Merchant ID" },
      { key: "merchant_alias", label: "Merchant Alias" },
      { key: "dba_name", label: "DBA Name" },
    ],
  },
  {
    label: "Dispute Details",
    fields: [
      { key: "dispute_date", label: "Dispute Date" },
      { key: "dispute_amount", label: "Dispute Amount" },
      { key: "dispute_currency", label: "Dispute Currency" },
      { key: "reason_code", label: "Reason Code" },
      { key: "reason_category", label: "Reason Category" },
      { key: "arn_number", label: "ARN Number" },
      { key: "cardholder_name", label: "Cardholder Name" },
    ],
  },
  {
    label: "Card & Authorization",
    fields: [
      { key: "card_type", label: "Card Type" },
      { key: "card_bin_first6", label: "Card BIN (First 6)" },
      { key: "card_last4", label: "Card Last 4" },
      { key: "authorization_date", label: "Auth Date" },
      { key: "authorization_amount", label: "Auth Amount" },
      { key: "avs_match", label: "AVS Match" },
      { key: "cvv_match", label: "CVV Match" },
      { key: "three_d_secure", label: "3D Secure" },
    ],
  },
  {
    label: "Transaction",
    fields: [
      { key: "transaction_id", label: "Transaction ID" },
      { key: "transaction_date", label: "Transaction Date" },
      { key: "transaction_amount", label: "Transaction Amount" },
      { key: "transaction_currency", label: "Transaction Currency" },
      { key: "transaction_country", label: "Country" },
      { key: "transaction_state", label: "State" },
      { key: "billing_zip_code", label: "Billing Zip" },
    ],
  },
  {
    label: "Customer & Order",
    fields: [
      { key: "customer_name", label: "Customer Name" },
      { key: "customer_email", label: "Customer Email" },
      { key: "customer_phone", label: "Customer Phone" },
      { key: "customer_ip", label: "Customer IP" },
      { key: "product_name", label: "Product Name" },
      { key: "product_type", label: "Product Type" },
      { key: "service_start_date", label: "Service Start" },
      { key: "service_end_date", label: "Service End" },
      { key: "cancellation_date", label: "Cancellation Date" },
    ],
  },
];

// Right panel: system fields
function FieldPanel({ onInsert }) {
  const [openGroups, setOpenGroups] = useState({ "Case Information": true });
  const [copied, setCopied] = useState(null);
  const toggle = (label) => setOpenGroups(g => ({ ...g, [label]: !g[label] }));
  const handleCopy = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50 flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-200 bg-white rounded-t-lg sticky top-0 z-10">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">System Fields</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Click to insert into template</p>
      </div>
      <div className="divide-y divide-slate-200 overflow-y-auto flex-1">
        {FIELD_GROUPS.map(group => (
          <div key={group.label}>
            <button
              onClick={() => toggle(group.label)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {group.label}
              {openGroups[group.label] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {openGroups[group.label] && (
              <div className="px-2 pb-2 space-y-1">
                {group.fields.map(f => (
                  <div key={f.key} className="flex items-center gap-1">
                    <button
                      onClick={() => onInsert && onInsert(`{{${f.key}}}`)}
                      className="flex-1 text-left px-2 py-1 rounded text-xs bg-white border border-slate-200 hover:border-[#0D50B8] hover:text-[#0D50B8] transition-colors font-mono truncate"
                    >
                      {`{{${f.key}}}`}
                    </button>
                    <button onClick={() => handleCopy(f.key)} className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors">
                      {copied === f.key ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Left panel: evidence types (same style as FieldPanel)
function EvidencePanel({ evidenceTypes, onInsert }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(null);

  const handleCopy = (name) => {
    navigator.clipboard.writeText(`{{evidence:${name}}}`);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50 flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-200 bg-white rounded-t-lg sticky top-0 z-10">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Evidence Types</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Click to insert into template</p>
      </div>
      <div className="divide-y divide-slate-200 overflow-y-auto flex-1">
        <div>
          <button
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Evidence Types
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {open && (
            <div className="px-2 pb-2 space-y-1">
              {evidenceTypes.length === 0 ? (
                <p className="text-[10px] text-slate-400 px-1 py-1">No evidence types configured.</p>
              ) : evidenceTypes.map(et => (
                <div key={et.id} className="flex items-center gap-1">
                  <button
                    onClick={() => onInsert && onInsert(`{{evidence:${et.name}}}`)}
                    className="flex-1 text-left px-2 py-1 rounded text-xs bg-white border border-slate-200 hover:border-[#0D50B8] hover:text-[#0D50B8] transition-colors font-mono truncate"
                    title={`Insert {{evidence:${et.name}}}`}
                  >
                    {`{{evidence:${et.name}}}`}
                  </button>
                  <button onClick={() => handleCopy(et.name)} className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors">
                    {copied === et.name ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Center: upload + textarea
function TemplateEditor({ form, setForm, uploading, setUploading, onInsertRef }) {
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Expose insertAtCursor so panels can call it
  const insertAtCursor = (text) => {
    const ta = textareaRef.current;
    if (!ta) { setForm(f => ({ ...f, content: (f.content || "") + text })); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const current = form.content || "";
    setForm(f => ({ ...f, content: current.slice(0, start) + text + current.slice(end) }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); }, 0);
  };

  // Share insertAtCursor via ref
  if (onInsertRef) onInsertRef.current = insertAtCursor;

  const wrapSelection = (before, after) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const current = form.content || "";
    const selected = current.slice(start, end) || "text";
    const newContent = current.slice(0, start) + before + selected + after + current.slice(end);
    setForm(f => ({ ...f, content: newContent }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  };

  const handleFileDrop = async (file) => {
    if (!file) return;
    setUploading(true);
    if (file.name.endsWith(".txt")) {
      const text = await file.text();
      setForm(f => ({ ...f, content: text }));
    } else {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, file_url }));
    }
    setUploading(false);
  };

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${dragOver ? "border-[#0D50B8] bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".txt,.docx,.doc" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) handleFileDrop(f); }} />
        <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
        <p className="text-xs text-slate-500">{uploading ? "Uploading..." : "Drag & drop or click to upload"}</p>
        <p className="text-[10px] text-slate-400">.txt, .docx, .doc</p>
      </div>

      {form.file_url && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <FileText className="w-4 h-4 text-[#0D50B8] flex-shrink-0" />
          <a href={form.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#0D50B8] hover:underline flex-1 truncate">Uploaded file</a>
          <button onClick={() => setForm(f => ({ ...f, file_url: "" }))} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex-1">
        <label className="text-xs font-medium text-slate-600 mb-1 block">Template Content</label>
        {/* Formatting toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border border-b-0 border-slate-200 rounded-t-md bg-slate-50">
          <button type="button" title="Bold — wraps selection with **...**" onClick={() => wrapSelection("**", "**")} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Italic — wraps selection with _..._" onClick={() => wrapSelection("_", "_")} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Underline — wraps selection with __...__" onClick={() => wrapSelection("__", "__")} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
            <Underline className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <button type="button" title="Insert table" onClick={() => {
            const tableTemplate = "\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n";
            insertAtCursor(tableTemplate);
          }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-1 text-xs">
            <Table className="w-3.5 h-3.5" /> Table
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <span className="text-[10px] text-slate-400">Select text then click a format button</span>
        </div>
        <textarea
          ref={textareaRef}
          className="w-full border border-slate-200 rounded-b-md px-3 py-2 text-sm min-h-[340px] focus:outline-none focus:ring-1 focus:ring-[#0D50B8] resize-y font-mono leading-relaxed rounded-t-none"
          placeholder={`Dear Sir/Madam,\n\nCase ID: {{case_id}}\nDispute Date: {{dispute_date}}\nAmount: {{dispute_currency}} {{dispute_amount}}\n\nEvidence: {{evidence:Invoice}}\nCustom: {{custom:order_id}}\n\n...`}
          value={form.content || ""}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        />
      </div>
    </div>
  );
}

export default function CoverLetterManager() {
  const [records, setRecords] = useState([]);
  const [evidenceTypes, setEvidenceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const insertRef = useRef(null);

  const [form, setForm] = useState({
    name: "", content: "", file_url: "",
    reason_code_groupings: [],
    assigned_evidence_types: [], status: "active"
  });

  const load = () => Promise.all([
    base44.entities.CoverLetterTemplate.list(),
    base44.entities.EvidenceType.filter({ status: "active" }),
  ]).then(([cl, et]) => {
    setRecords(cl); setEvidenceTypes(et); setLoading(false);
  }).catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({
    name: "", content: "", file_url: "",
    reason_code_groupings: [],
    assigned_evidence_types: [], status: "active"
  });

  const save = async () => {
    if (editId) await base44.entities.CoverLetterTemplate.update(editId, form);
    else await base44.entities.CoverLetterTemplate.create(form);
    setShowForm(false); setEditId(null); resetForm(); load();
  };

  const del = async (id) => { await base44.entities.CoverLetterTemplate.delete(id); load(); };

  const edit = (r) => {
    setForm({
      name: r.name || "",
      content: r.content || "",
      file_url: r.file_url || "",
      reason_code_groupings: r.reason_code_groupings || (r.reason_code_grouping ? [r.reason_code_grouping] : []),
      assigned_evidence_types: r.assigned_evidence_types || [],
      status: r.status || "active",
    });
    setEditId(r.id); setShowForm(true);
  };

  const toggleGrouping = (g) => {
    setForm(f => {
      const arr = f.reason_code_groupings || [];
      return { ...f, reason_code_groupings: arr.includes(g) ? arr.filter(x => x !== g) : [...arr, g] };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{records.length} templates</p>
        <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); resetForm(); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Template
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#0D50B8]/20">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800">
              {editId ? "Edit Template" : "New Cover Letter Template"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Name + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-600">Template Name *</label>
                <Input placeholder="e.g. Fraud Dispute Template" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reason Code Groupings — multi-select checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">
                Reason Code Groupings
                {(form.reason_code_groupings || []).length > 0 && (
                  <span className="ml-2 text-[#0D50B8] font-normal">{form.reason_code_groupings.length} selected</span>
                )}
              </label>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
                  {RC_GROUPINGS.map(g => {
                    const selected = (form.reason_code_groupings || []).includes(g);
                    return (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleGrouping(g)}
                          className="accent-[#0D50B8] flex-shrink-0"
                        />
                        <span className={`text-xs ${selected ? "text-[#0D50B8] font-medium" : "text-slate-600"}`}>{g}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3-column editor: Evidence | Template | Fields */}
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-4" style={{ minHeight: "460px" }}>
              <EvidencePanel
                evidenceTypes={evidenceTypes}
                onInsert={(tag) => insertRef.current && insertRef.current(tag)}
              />
              <TemplateEditor
                form={form}
                setForm={setForm}
                uploading={uploading}
                setUploading={setUploading}
                onInsertRef={insertRef}
              />
              <FieldPanel onInsert={(tag) => insertRef.current && insertRef.current(tag)} />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button size="sm" onClick={save} className="bg-[#0D50B8] hover:bg-[#0a3d8f]" disabled={!form.name}>
                <Check className="w-3.5 h-3.5 mr-1" /> Save Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); resetForm(); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-slate-400 text-center py-8 text-sm">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-slate-400 text-center py-8 text-sm">No templates yet</p>
        ) : records.map(r => (
          <Card key={r.id} className="border-slate-100 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-slate-800 text-sm">{r.name}</h3>
                    <Badge className={r.status === "active" ? "bg-green-100 text-green-800 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>{r.status}</Badge>
                    {r.file_url && <Badge className="bg-blue-100 text-blue-800 border-0 text-xs"><FileText className="w-2.5 h-2.5 mr-1 inline" />File attached</Badge>}
                  </div>
                  {(r.reason_code_groupings || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {r.reason_code_groupings.map(g => (
                        <span key={g} className="px-2 py-0.5 bg-blue-50 text-[#0D50B8] rounded text-[10px] font-medium">{g}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(r.assigned_evidence_types || []).length > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px]">{r.assigned_evidence_types.length} evidence type(s)</span>
                    )}
                  </div>
                  {r.content && <p className="text-xs text-slate-400 line-clamp-1 font-mono">{r.content.slice(0, 100)}...</p>}
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