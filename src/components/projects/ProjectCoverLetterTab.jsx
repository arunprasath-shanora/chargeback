import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check, Upload, FileText, Copy, ChevronDown, ChevronUp, ArrowDownToLine, Bold, Italic, Underline } from "lucide-react";

const FIELD_GROUPS = [
  {
    label: "Case Information",
    fields: [
      { key: "case_id", label: "Case ID" }, { key: "case_type", label: "Case Type" },
      { key: "business_unit", label: "Business Unit" }, { key: "sub_unit_name", label: "Sub Unit" },
      { key: "processor", label: "Processor" }, { key: "merchant_id", label: "Merchant ID" },
      { key: "dba_name", label: "DBA Name" }, { key: "sla_deadline", label: "SLA Deadline" },
    ],
  },
  {
    label: "Dispute Details",
    fields: [
      { key: "dispute_date", label: "Dispute Date" }, { key: "dispute_amount", label: "Dispute Amount" },
      { key: "dispute_currency", label: "Currency" }, { key: "reason_code", label: "Reason Code" },
      { key: "reason_category", label: "Reason Category" }, { key: "arn_number", label: "ARN Number" },
      { key: "cardholder_name", label: "Cardholder Name" },
    ],
  },
  {
    label: "Card & Auth",
    fields: [
      { key: "card_type", label: "Card Type" }, { key: "card_bin_first6", label: "Card BIN" },
      { key: "card_last4", label: "Card Last 4" }, { key: "authorization_date", label: "Auth Date" },
      { key: "authorization_amount", label: "Auth Amount" }, { key: "avs_match", label: "AVS Match" },
      { key: "cvv_match", label: "CVV Match" }, { key: "three_d_secure", label: "3D Secure" },
    ],
  },
  {
    label: "Transaction",
    fields: [
      { key: "transaction_id", label: "Transaction ID" }, { key: "transaction_date", label: "Transaction Date" },
      { key: "transaction_amount", label: "Transaction Amount" }, { key: "transaction_country", label: "Country" },
      { key: "billing_zip_code", label: "Billing Zip" },
    ],
  },
  {
    label: "Customer & Order",
    fields: [
      { key: "customer_name", label: "Customer Name" }, { key: "customer_email", label: "Customer Email" },
      { key: "customer_phone", label: "Customer Phone" }, { key: "product_name", label: "Product Name" },
      { key: "product_type", label: "Product Type" },
    ],
  },
];

function FieldPanel({ onInsert }) {
  const [openGroups, setOpenGroups] = useState({ "Case Information": true });
  const [copied, setCopied] = useState(null);
  const toggle = (label) => setOpenGroups(g => ({ ...g, [label]: !g[label] }));
  const handleCopy = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50 flex flex-col" style={{ maxHeight: 480, overflow: "auto" }}>
      <div className="px-3 py-2 border-b border-slate-200 bg-white rounded-t-lg sticky top-0 z-10">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">System Fields</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Click to insert</p>
      </div>
      <div className="divide-y divide-slate-200">
        {FIELD_GROUPS.map(group => (
          <div key={group.label}>
            <button onClick={() => toggle(group.label)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
              {group.label}
              {openGroups[group.label] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {openGroups[group.label] && (
              <div className="px-2 pb-2 space-y-1">
                {group.fields.map(f => (
                  <div key={f.key} className="flex items-center gap-1">
                    <button onClick={() => onInsert(`{{${f.key}}}`)} className="flex-1 text-left px-2 py-1 rounded text-xs bg-white border border-slate-200 hover:border-[#0D50B8] hover:text-[#0D50B8] transition-colors font-mono truncate">
                      {`{{${f.key}}}`}
                    </button>
                    <button onClick={() => handleCopy(f.key)} className="flex-shrink-0 p-1 rounded hover:bg-slate-200">
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

function EvidencePanel({ evidenceTypes, onInsert }) {
  const [copied, setCopied] = useState(null);
  const handleCopy = (name) => {
    navigator.clipboard.writeText(`{{evidence:${name}}}`);
    setCopied(name); setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50 flex flex-col" style={{ maxHeight: 480, overflow: "auto" }}>
      <div className="px-3 py-2 border-b border-slate-200 bg-white rounded-t-lg sticky top-0 z-10">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Evidence Types</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Click to insert</p>
      </div>
      <div className="px-2 py-2 space-y-1">
        {evidenceTypes.length === 0 ? (
          <p className="text-[10px] text-slate-400 px-1 py-1">No evidence types configured.</p>
        ) : evidenceTypes.map(et => (
          <div key={et.id} className="flex items-center gap-1">
            <button onClick={() => onInsert(`{{evidence:${et.name}}}`)} className="flex-1 text-left px-2 py-1 rounded text-xs bg-white border border-slate-200 hover:border-[#0D50B8] hover:text-[#0D50B8] transition-colors font-mono truncate">
              {`{{evidence:${et.name}}}`}
            </button>
            <button onClick={() => handleCopy(et.name)} className="flex-shrink-0 p-1 rounded hover:bg-slate-200">
              {copied === et.name ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// The editor form for one template
function TemplateEditor({ form, setForm, uploading, setUploading, textareaRef }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

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
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${dragOver ? "border-[#0D50B8] bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".txt,.docx,.doc" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) handleFileDrop(f); }} />
        <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
        <p className="text-xs text-slate-500">{uploading ? "Uploading..." : "Drag & drop or click to upload .txt/.docx"}</p>
      </div>
      {form.file_url && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <FileText className="w-4 h-4 text-[#0D50B8] flex-shrink-0" />
          <a href={form.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#0D50B8] hover:underline flex-1 truncate">Uploaded file</a>
          <button onClick={() => setForm(f => ({ ...f, file_url: "" }))} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-[360px] focus:outline-none focus:ring-1 focus:ring-[#0D50B8] resize-y font-mono leading-relaxed"
        placeholder={"Dear Sir/Madam,\n\nCase ID: {{case_id}}\nDispute Date: {{dispute_date}}\nAmount: {{dispute_currency}} {{dispute_amount}}\n\nEvidence: {{evidence:Invoice}}\n\n..."}
        value={form.content || ""}
        onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
      />
    </div>
  );
}

const BLANK_FORM = { name: "", content: "", file_url: "", reason_code_groupings: [], assigned_evidence_types: [], status: "active", notes: "" };

export default function ProjectCoverLetterTab({ projectId }) {
  const [records, setRecords] = useState([]);
  const [evidenceTypes, setEvidenceTypes] = useState([]);
  const [globalTemplates, setGlobalTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null = list, "new" = new form, id = editing
  const [form, setForm] = useState(BLANK_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importTemplateId, setImportTemplateId] = useState("");
  const textareaRef = useRef(null);

  const load = () => Promise.all([
    base44.entities.ProjectCoverLetter.filter({ project_id: projectId }),
    base44.entities.EvidenceType.filter({ status: "active" }),
    base44.entities.CoverLetterTemplate.list(),
  ]).then(([cl, et, gt]) => {
    setRecords(cl); setEvidenceTypes(et); setGlobalTemplates(gt); setLoading(false);
  }).catch(() => setLoading(false));

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const insertAtCursor = (text) => {
    const ta = textareaRef.current;
    if (!ta) { setForm(f => ({ ...f, content: (f.content || "") + text })); return; }
    const start = ta.selectionStart, end = ta.selectionEnd;
    const current = form.content || "";
    setForm(f => ({ ...f, content: current.slice(0, start) + text + current.slice(end) }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); }, 0);
  };

  const handleImportFromGlobal = () => {
    const tpl = globalTemplates.find(t => t.id === importTemplateId);
    if (!tpl) return;
    setForm({
      name: tpl.name + " (Project Copy)",
      content: tpl.content || "",
      file_url: tpl.file_url || "",
      reason_code_groupings: tpl.reason_code_groupings || [],
      assigned_evidence_types: tpl.assigned_evidence_types || [],
      status: "active",
      notes: `Imported from global template: ${tpl.name}`,
      base_template_id: tpl.id,
    });
    setImportTemplateId("");
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const data = { ...form, project_id: projectId };
    if (editingId && editingId !== "new") {
      await base44.entities.ProjectCoverLetter.update(editingId, data);
    } else {
      await base44.entities.ProjectCoverLetter.create(data);
    }
    setSaving(false);
    setEditingId(null);
    setForm(BLANK_FORM);
    load();
  };

  const handleEdit = (r) => {
    setForm({
      name: r.name || "",
      content: r.content || "",
      file_url: r.file_url || "",
      reason_code_groupings: r.reason_code_groupings || [],
      assigned_evidence_types: r.assigned_evidence_types || [],
      status: r.status || "active",
      notes: r.notes || "",
      base_template_id: r.base_template_id || "",
    });
    setEditingId(r.id);
  };

  const handleDelete = async (id) => {
    await base44.entities.ProjectCoverLetter.delete(id);
    load();
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(BLANK_FORM);
    setImportTemplateId("");
  };

  if (!projectId) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Save the project first to manage cover letter templates.
      </div>
    );
  }

  // ── Editor view ──
  if (editingId !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <h3 className="text-sm font-semibold text-slate-800">{editingId === "new" ? "New Project Template" : "Edit Template"}</h3>
          <div className="ml-auto flex gap-2">
            <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleSave} disabled={saving || !form.name}>
              <Check className="w-3.5 h-3.5 mr-1" />{saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>

        {/* Import from global */}
        {editingId === "new" && globalTemplates.length > 0 && (
          <Card className="border-amber-100 bg-amber-50/40">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-amber-800 mb-2">
                <ArrowDownToLine className="w-3.5 h-3.5 inline mr-1" />
                Start from a global template (optional)
              </p>
              <div className="flex gap-2 items-center">
                <Select value={importTemplateId} onValueChange={setImportTemplateId}>
                  <SelectTrigger className="max-w-xs h-8 text-xs"><SelectValue placeholder="Select global template..." /></SelectTrigger>
                  <SelectContent>
                    {globalTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleImportFromGlobal} disabled={!importTemplateId}>
                  Import & Customize
                </Button>
              </div>
              <p className="text-[10px] text-amber-600 mt-1">This copies the global template here so you can modify it freely — the original stays unchanged.</p>
            </CardContent>
          </Card>
        )}

        {/* Basic fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-600">Template Name *</label>
            <Input placeholder="e.g. Fraud - ACME Corp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Notes (internal)</label>
          <Input placeholder="e.g. Modified for ACME — removed cancellation clause" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        {/* 3-col editor */}
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_180px] gap-4">
          <EvidencePanel evidenceTypes={evidenceTypes} onInsert={insertAtCursor} />
          <TemplateEditor form={form} setForm={setForm} uploading={uploading} setUploading={setUploading} textareaRef={textareaRef} />
          <FieldPanel onInsert={insertAtCursor} />
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Project-Specific Cover Letter Templates</p>
          <p className="text-xs text-slate-400 mt-0.5">These override the global templates for this project. Each client can have their own customized versions.</p>
        </div>
        <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setForm(BLANK_FORM); setEditingId("new"); }}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Template
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-8">Loading...</p>
      ) : records.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No project templates yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Template" to create one, or import from a global template as a starting point.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <Card key={r.id} className="border-slate-100 hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-slate-800 text-sm">{r.name}</h3>
                      <Badge className={r.status === "active" ? "bg-green-100 text-green-800 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>{r.status}</Badge>
                      {r.file_url && <Badge className="bg-blue-100 text-blue-800 border-0 text-xs"><FileText className="w-2.5 h-2.5 mr-1 inline" />File</Badge>}
                      {r.base_template_id && <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">Based on global</Badge>}
                    </div>
                    {r.notes && <p className="text-xs text-slate-400 italic">{r.notes}</p>}
                    {r.content && <p className="text-xs text-slate-400 line-clamp-1 font-mono">{r.content.slice(0, 100)}...</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}