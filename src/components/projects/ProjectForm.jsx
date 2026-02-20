import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Save, Plus, Trash2, Eye, EyeOff } from "lucide-react";

const PROCESSORS = ["Fiserv","American Express","Visa","Mastercard","Stripe","PayPal","Adyen","Worldpay","Other"];
const CURRENCIES = ["USD","EUR","GBP","AUD","CAD","NZD","INR","SGD","AED","Other"];

const SectionTitle = ({ children }) => (
  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{children}</p>
);

const F = ({ label, children, span }) => (
  <div className={`space-y-1 ${span ? `col-span-${span}` : ""}`}>
    <Label className="text-xs font-medium text-slate-600">{label}</Label>
    {children}
  </div>
);

// ─── Sub-Units ────────────────────────────────────────────────────────────────
function SubUnitsTab({ subUnits, onChange }) {
  const add = () => onChange([...subUnits, { sub_unit_name: "", dba_name: "", merchant_id: "", mid_alias: "", processor: "", currency: "" }]);
  const remove = (i) => onChange(subUnits.filter((_, idx) => idx !== i));
  const update = (i, k, v) => onChange(subUnits.map((u, idx) => idx === i ? { ...u, [k]: v } : u));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Sub Units / MID Configuration</SectionTitle>
        <Button size="sm" variant="outline" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" /> Add Sub Unit</Button>
      </div>
      {subUnits.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
          No sub units yet. Click "Add Sub Unit" to begin.
        </div>
      )}
      {subUnits.map((u, i) => (
        <Card key={i} className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600">Sub Unit #{i + 1}</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => remove(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <F label="Sub Unit Name"><Input value={u.sub_unit_name} onChange={e => update(i, "sub_unit_name", e.target.value)} placeholder="e.g. North America" /></F>
              <F label="DBA Name"><Input value={u.dba_name} onChange={e => update(i, "dba_name", e.target.value)} /></F>
              <F label="Merchant ID"><Input value={u.merchant_id} onChange={e => update(i, "merchant_id", e.target.value)} /></F>
              <F label="MID Alias"><Input value={u.mid_alias} onChange={e => update(i, "mid_alias", e.target.value)} /></F>
              <F label="Processor">
                <Select value={u.processor} onValueChange={v => update(i, "processor", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{PROCESSORS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Currency">
                <Select value={u.currency} onValueChange={v => update(i, "currency", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </F>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Client Contacts ──────────────────────────────────────────────────────────
function ContactsTab({ contacts, onChange }) {
  const levels = ["Primary", "Secondary"];
  const add = () => {
    const nextLevel = contacts.length === 0 ? "Primary" : "Secondary";
    onChange([...contacts, { contact_name: "", contact_email: "", contact_phone: "", contact_role: "", level: nextLevel }]);
  };
  const remove = (i) => onChange(contacts.filter((_, idx) => idx !== i));
  const update = (i, k, v) => onChange(contacts.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Client Contacts (up to 2 levels)</SectionTitle>
        <Button size="sm" variant="outline" onClick={add} disabled={contacts.length >= 2}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Contact
        </Button>
      </div>
      {contacts.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
          No contacts added yet.
        </div>
      )}
      {contacts.map((c, i) => (
        <Card key={i} className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.level === "Primary" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                {c.level || `Contact ${i + 1}`}
              </span>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => remove(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Level">
                <Select value={c.level} onValueChange={v => update(i, "level", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Contact Name"><Input value={c.contact_name} onChange={e => update(i, "contact_name", e.target.value)} /></F>
              <F label="Email"><Input type="email" value={c.contact_email} onChange={e => update(i, "contact_email", e.target.value)} /></F>
              <F label="Phone"><Input value={c.contact_phone} onChange={e => update(i, "contact_phone", e.target.value)} /></F>
              <F label="Role / Title" span={2}><Input value={c.contact_role} onChange={e => update(i, "contact_role", e.target.value)} placeholder="e.g. Dispute Manager" /></F>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Portal Credentials ────────────────────────────────────────────────────────
function PortalTab({ credentials, onChange }) {
  const [showPwd, setShowPwd] = useState({});
  const add = () => onChange([...credentials, { portal_label: "", portal_address: "", portal_username: "", portal_password: "" }]);
  const remove = (i) => onChange(credentials.filter((_, idx) => idx !== i));
  const update = (i, k, v) => onChange(credentials.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Portal Login Credentials</SectionTitle>
        <Button size="sm" variant="outline" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" /> Add Portal</Button>
      </div>
      {credentials.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
          No portal credentials yet.
        </div>
      )}
      {credentials.map((c, i) => (
        <Card key={i} className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600">{c.portal_label || `Portal #${i + 1}`}</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => remove(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Label / Name"><Input value={c.portal_label} onChange={e => update(i, "portal_label", e.target.value)} placeholder="e.g. Fiserv Portal" /></F>
              <F label="Portal URL"><Input value={c.portal_address} onChange={e => update(i, "portal_address", e.target.value)} placeholder="https://..." /></F>
              <F label="Username"><Input value={c.portal_username} onChange={e => update(i, "portal_username", e.target.value)} /></F>
              <F label="Password">
                <div className="relative">
                  <Input
                    type={showPwd[i] ? "text" : "password"}
                    value={c.portal_password}
                    onChange={e => update(i, "portal_password", e.target.value)}
                    className="pr-9"
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPwd(p => ({ ...p, [i]: !p[i] }))}>
                    {showPwd[i] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </F>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────
function AssignmentsTab({ form, set, toggleArray, allUsers, allFields, allEvidenceTypes, allCoverLetters, allReasonCodes, allProcessors }) {
  const [rcSearch, setRcSearch] = useState("");
  const filteredRC = allReasonCodes.filter(rc =>
    !rcSearch || rc.reason_code?.toLowerCase().includes(rcSearch.toLowerCase()) || rc.reason_code_description?.toLowerCase().includes(rcSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Users */}
      <div>
        <SectionTitle>Assigned Users</SectionTitle>
        {allUsers.length === 0 ? <p className="text-sm text-slate-400">No users available</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allUsers.map(u => (
              <label key={u.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <Checkbox checked={(form.assigned_users || []).includes(u.email)} onCheckedChange={() => toggleArray("assigned_users", u.email)} />
                <span className="text-sm text-slate-700">{u.full_name || u.email}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* Custom Fields */}
      <div>
        <SectionTitle>Custom Fields</SectionTitle>
        {allFields.length === 0 ? <p className="text-sm text-slate-400">No custom fields configured. Add them in Master Setup.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allFields.map(f => (
              <label key={f.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <Checkbox checked={(form.assigned_fields || []).includes(f.id)} onCheckedChange={() => toggleArray("assigned_fields", f.id)} />
                <span className="text-sm text-slate-700">{f.field_name} <span className="text-xs text-slate-400">({f.field_type})</span></span>
              </label>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* Evidence Types */}
      <div>
        <SectionTitle>Evidence Types</SectionTitle>
        {allEvidenceTypes.length === 0 ? <p className="text-sm text-slate-400">No evidence types configured. Add them in Master Setup.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allEvidenceTypes.map(et => (
              <label key={et.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <Checkbox checked={(form.assigned_evidence_types || []).includes(et.id)} onCheckedChange={() => toggleArray("assigned_evidence_types", et.id)} />
                <span className="text-sm text-slate-700">{et.name} <span className="text-xs text-slate-400">({et.upload_requirement})</span></span>
              </label>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* Cover Letter */}
      <div>
        <SectionTitle>Default Cover Letter Template</SectionTitle>
        <Select value={form.assigned_cover_letter || ""} onValueChange={v => set("assigned_cover_letter", v)}>
          <SelectTrigger className="w-full max-w-sm"><SelectValue placeholder="Select template..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>None</SelectItem>
            {allCoverLetters.map(cl => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <hr className="border-slate-100" />

      {/* Reason Codes */}
      <div>
        <SectionTitle>Reason Codes ({(form.assigned_reason_codes || []).length} selected)</SectionTitle>
        <Input className="mb-3 max-w-xs" placeholder="Search reason codes..." value={rcSearch} onChange={e => setRcSearch(e.target.value)} />
        {allReasonCodes.length === 0 ? <p className="text-sm text-slate-400">No reason codes configured. Add them in Master Setup.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {filteredRC.map(rc => (
              <label key={rc.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <Checkbox checked={(form.assigned_reason_codes || []).includes(rc.id)} onCheckedChange={() => toggleArray("assigned_reason_codes", rc.id)} />
                <span className="text-sm text-slate-700">{rc.reason_code} <span className="text-xs text-slate-400">{rc.card_mandate}</span></span>
              </label>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* Processors */}
      <div>
        <SectionTitle>Processors</SectionTitle>
        {allProcessors.length === 0 ? <p className="text-sm text-slate-400">No processors configured. Add them in Master Setup.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allProcessors.map(p => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <Checkbox checked={(form.assigned_processors || []).includes(p.id)} onCheckedChange={() => toggleArray("assigned_processors", p.id)} />
                <span className="text-sm text-slate-700">{p.name} <span className="text-xs text-slate-400">({p.type})</span></span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function ProjectForm({ project, onSave, onCancel }) {
  const defaultForm = {
    name: "", status: "setup",
    sub_units: [],
    client_contacts: [],
    portal_credentials: [],
    assigned_users: [], assigned_fields: [], assigned_evidence_types: [],
    assigned_cover_letter: "", assigned_reason_codes: [], assigned_processors: [],
    notes: "",
  };

  const [form, setForm] = useState(() => {
    if (!project) return defaultForm;
    return {
      ...defaultForm,
      ...project,
      sub_units: project.sub_units || [],
      client_contacts: project.client_contacts || [],
      portal_credentials: project.portal_credentials || [],
      assigned_reason_codes: project.assigned_reason_codes || [],
      assigned_processors: project.assigned_processors || [],
    };
  });

  const [allUsers, setAllUsers] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [allEvidenceTypes, setAllEvidenceTypes] = useState([]);
  const [allCoverLetters, setAllCoverLetters] = useState([]);
  const [allReasonCodes, setAllReasonCodes] = useState([]);
  const [allProcessors, setAllProcessors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.CustomField.list(),
      base44.entities.EvidenceType.list(),
      base44.entities.CoverLetterTemplate.list(),
      base44.entities.ReasonCode.list(),
      base44.entities.Processor.list(),
    ]).then(([u, f, et, cl, rc, pr]) => {
      setAllUsers(u); setAllFields(f); setAllEvidenceTypes(et);
      setAllCoverLetters(cl); setAllReasonCodes(rc); setAllProcessors(pr);
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArray = (key, value) => {
    setForm(f => {
      const arr = f[key] || [];
      return { ...f, [key]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] };
    });
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    if (project?.id) await base44.entities.Project.update(project.id, form);
    else await base44.entities.Project.create(form);
    setSaving(false);
    onSave();
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{project ? "Edit Project" : "New Project"}</h1>
          <p className="text-slate-500 text-xs">{project ? project.name : "Create a new business unit"}</p>
        </div>
        <div className="ml-auto">
          <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleSave} disabled={saving || !form.name}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Project"}
          </Button>
        </div>
      </div>

      {/* Basic info always visible */}
      <Card className="border-slate-100">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <F label="Project Name *" span={2}>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Project / Business Unit name" />
            </F>
            <F label="Status">
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="setup">Setup</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </F>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="subunits">
        <TabsList className="bg-slate-100 h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="subunits" className="text-xs">Sub Units & MIDs</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs">Client Contacts</TabsTrigger>
          <TabsTrigger value="portal" className="text-xs">Portal Credentials</TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs">Assignments</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="subunits" className="mt-4">
          <SubUnitsTab subUnits={form.sub_units} onChange={v => set("sub_units", v)} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsTab contacts={form.client_contacts} onChange={v => set("client_contacts", v)} />
        </TabsContent>

        <TabsContent value="portal" className="mt-4">
          <PortalTab credentials={form.portal_credentials} onChange={v => set("portal_credentials", v)} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card className="border-slate-100">
            <CardContent className="p-5">
              <AssignmentsTab
                form={form} set={set} toggleArray={toggleArray}
                allUsers={allUsers} allFields={allFields}
                allEvidenceTypes={allEvidenceTypes} allCoverLetters={allCoverLetters}
                allReasonCodes={allReasonCodes} allProcessors={allProcessors}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card className="border-slate-100">
            <CardContent className="p-5">
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes..." className="min-h-[120px]" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}