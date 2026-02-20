import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check, Upload, FileText, Copy, ChevronDown, ChevronUp } from "lucide-react";

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

function FieldPanel({ onInsert, customFields, evidenceTypes }) {
  const [openGroups, setOpenGroups] = useState({ "Case Information": true });
  const [copied, setCopied] = useState(null);

  const toggle = (label) => setOpenGroups(g => ({ ...g, [label]: !g[label] }));

  const handleCopy = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const allGroups = [
    ...FIELD_GROUPS,
    ...(customFields.length > 0 ? [{
      label: "Custom Fields",
      fields: customFields.map(cf => ({ key: cf.field_key || cf.id, label: cf.field_name }))
    }] : []),
  ];

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-y-auto max-h-[520px]">
      <div className="px-3 py-2 border-b border-slate-200 bg-white sticky top-0 z-10">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Available Fields</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Click tag to insert, or copy to clipboard</p>
      </div>
      <div className="divide-y divide-slate-200">
        {allGroups.map(group => (
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
                      title={`Insert {{${f.key}}}`}
                    >
                      {`{{${f.key}}}`}
                    </button>
                    <button
                      onClick={() => handleCopy(f.key)}
                      className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors"
                    >
                      {copied === f.key
                        ? <Check className="w-3 h-3 text-green-500" />
                        : <Copy className="w-3 h-3 text-slate-400" />}
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

function CoverLetterEditor({ form, setForm, customFields, evidenceTypes, uploading, setUploading }) {
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const insertAtCursor = (text) => {
    const ta = textareaRef.current;
    if (!ta) { setForm(f => ({ ...f, content: (f.content || "") + text })); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const current = form.content || "";
    const updated = current.slice(0, start) + text + current.slice(end);
    setForm(f => ({ ...f, content: updated }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); }, 0);
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

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFileDrop(file); };
  const handleFileInput = (e) => { const file = e.target.files[0]; if (file) handleFileDrop(file); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${dragOver ? "border-[#0D50B8] bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".txt,.docx,.doc" className="hidden" onChange={handleFileInput} />
          <Upload className="w-5 h-5 mx-auto mb-1 text-slate-400" />
          <p className="text-xs text-slate-500">{uploading ? "Uploading..." : "Drag & drop a Word / text file, or click to browse"}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Supported: .txt, .docx, .doc</p>
        </div>

        {form.file_url && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <FileText className="w-4 h-4 text-[#0D50B8] flex-shrink-0" />
            <a href={form.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#0D50B8] hover:underline flex-1 truncate">Uploaded file</a>
            <button onClick={() => setForm(f => ({ ...f, file_url: "" }))}><X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" /></button>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Template Content <span className="text-slate-400 font-normal">(click a field tag on the right to insert)</span>
          </label>
          <textarea
            ref={textareaRef}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-[300px] focus:outline-none focus:ring-1 focus:ring-[#0D50B8] resize-y font-mono leading-relaxed"
            placeholder={`Dear Sir/Madam,\n\nWe are writing to dispute Case ID: {{case_id}}, dated {{dispute_date}}...\n\nAmount: {{dispute_currency}} {{dispute_amount}}\nReason Code: {{reason_code}}\n...`}
            value={form.content || ""}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          />
        </div>
      </div>
      <div className="lg:col-span-1">
        <FieldPanel onInsert={insertAtCursor} customFields={customFields} evidenceTypes={evidenceTypes} />
      </div>
    </div>
  );
}

// Multi-select toggle component
function MultiSelectList({ label, items, selected, onToggle, idKey, labelKey, secondaryKey }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No {label.toLowerCase()} configured yet.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
          <div className="flex flex-wrap gap-1.5">
            {items.map(item => {
              const id = item[idKey] || item.id;
              const isSelected = (selected || []).includes(id);
              return (
                <button
                  key={id}
                  onClick={() => onToggle(id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isSelected
                      ? "bg-[#0D50B8] text-white border-[#0D50B8]"
                      : "bg-white text-slate-600 border-slate-300 hover:border-[#0D50B8] hover:text-[#0D50B8]"
                  }`}
                >
                  {item[labelKey]}
                  {secondaryKey && item[secondaryKey] && (
                    <span className={`ml-1 ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                      ({item[secondaryKey]})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {(selected || []).length > 0 && (
        <p className="text-[10px] text-slate-400">{selected.length} selected</p>
      )}
    </div>
  );
}

export default function CoverLetterManager() {
  const [records, setRecords] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [evidenceTypes, setEvidenceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "", content: "", file_url: "",
    reason_code_grouping: "",
    custom_fields_mapping: [],
    evidence_types_mapping: [],
    status: "active"
  });

  const load = () => Promise.all([
    base44.entities.CoverLetterTemplate.list(),
    base44.entities.CustomField.filter({ status: "active" }),
    base44.entities.EvidenceType.filter({ status: "active" }),
  ]).then(([cl, cf, et]) => {
    setRecords(cl);
    setCustomFields(cf);
    setEvidenceTypes(et);
    setLoading(false);
  }).catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({
    name: "", content: "", file_url: "",
    reason_code_grouping: "",
    custom_fields_mapping: [],
    evidence_types_mapping: [],
    status: "active"
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
      reason_code_grouping: r.reason_code_grouping || "",
      custom_fields_mapping: r.custom_fields_mapping || [],
      evidence_types_mapping: r.evidence_types_mapping || [],
      status: r.status || "active",
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const toggleItem = (field, id) => {
    setForm(f => {
      const arr = f[field] || [];
      return { ...f, [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] };
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
            {/* Name + Grouping + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Template Name *</label>
                <Input placeholder="e.g. Fraud Dispute Template" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Reason Code Grouping</label>
                <Select value={form.reason_code_grouping || "__none__"} onValueChange={v => setForm(f => ({ ...f, reason_code_grouping: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select grouping..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {RC_GROUPINGS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
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

            {/* Elements: Custom Fields + Evidence Types */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="sm:col-span-2 text-xs font-semibold text-slate-700 uppercase tracking-wide -mb-1">Elements Mapping</p>
              <MultiSelectList
                label="Custom Fields"
                items={customFields}
                selected={form.custom_fields_mapping}
                onToggle={(id) => toggleItem("custom_fields_mapping", id)}
                idKey="id"
                labelKey="field_name"
                secondaryKey="field_type"
              />
              <MultiSelectList
                label="Evidence Types"
                items={evidenceTypes}
                selected={form.evidence_types_mapping}
                onToggle={(id) => toggleItem("evidence_types_mapping", id)}
                idKey="id"
                labelKey="name"
                secondaryKey="upload_requirement"
              />
            </div>

            {/* Editor + Field Panel */}
            <CoverLetterEditor
              form={form}
              setForm={setForm}
              customFields={customFields}
              evidenceTypes={evidenceTypes}
              uploading={uploading}
              setUploading={setUploading}
            />

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
                    {r.reason_code_grouping && <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">{r.reason_code_grouping}</Badge>}
                    {r.file_url && <Badge className="bg-purple-100 text-purple-800 border-0 text-xs"><FileText className="w-2.5 h-2.5 mr-1 inline" />File attached</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {(r.custom_fields_mapping || []).length > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        {r.custom_fields_mapping.length} custom field(s)
                      </span>
                    )}
                    {(r.evidence_types_mapping || []).length > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                        {r.evidence_types_mapping.length} evidence type(s)
                      </span>
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