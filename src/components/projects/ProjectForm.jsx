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
import ProjectCoverLetterTab from "./ProjectCoverLetterTab";
import ProjectInventoryAutomationTab from "./ProjectInventoryAutomationTab";
import ProjectEvidenceConnectorsTab from "./ProjectEvidenceConnectorsTab";
import ProjectEndToEndAutomationTab from "./ProjectEndToEndAutomationTab";
import ProjectStripeIntegrationTab from "./ProjectStripeIntegrationTab";

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
  const [procSearch, setProcSearch] = useState("");
  const [activeGrouping, setActiveGrouping] = useState(null);

  const allGroupings = [...new Set(allReasonCodes.map(rc => rc.reason_code_grouping).filter(Boolean))];

  const getMappingForGrouping = (grouping) => {
    const mappings = form.reason_code_mappings || [];
    return mappings.find(m => m.rc_grouping === grouping) || { rc_grouping: grouping, assigned_reason_codes: [], assigned_evidence_types: [], assigned_cover_letter: "" };
  };

  const updateMapping = (grouping, key, value) => {
    const mappings = [...(form.reason_code_mappings || [])];
    const idx = mappings.findIndex(m => m.rc_grouping === grouping);
    if (idx >= 0) {
      mappings[idx] = { ...mappings[idx], [key]: value };
    } else {
      mappings.push({ rc_grouping: grouping, assigned_reason_codes: [], assigned_evidence_types: [], assigned_cover_letter: "", [key]: value });
    }
    set("reason_code_mappings", mappings);
  };

  const toggleMappingArray = (grouping, key, value) => {
    const m = getMappingForGrouping(grouping);
    const arr = m[key] || [];
    updateMapping(grouping, key, arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);
  };

  const filteredProc = allProcessors.filter(p =>
    !procSearch || p.name?.toLowerCase().includes(procSearch.toLowerCase()) || p.type?.toLowerCase().includes(procSearch.toLowerCase())
  );

  const allFieldIds = allFields.map(f => f.id);
  const allFieldsSelected = allFieldIds.length > 0 && allFieldIds.every(id => (form.assigned_fields || []).includes(id));

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

      {/* Custom Fields with Select All */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionTitle>Custom Fields ({(form.assigned_fields || []).length} selected)</SectionTitle>
          {allFields.length > 0 && (
            <button onClick={() => set("assigned_fields", allFieldsSelected ? [] : allFieldIds)} className="text-xs text-[#0D50B8] hover:underline font-medium">
              {allFieldsSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
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

      {/* Processors with Search */}
      <div>
        <SectionTitle>Processors ({(form.assigned_processors || []).length} selected)</SectionTitle>
        <Input className="mb-3 max-w-xs" placeholder="Search processors..." value={procSearch} onChange={e => setProcSearch(e.target.value)} />
        {allProcessors.length === 0 ? <p className="text-sm text-slate-400">No processors configured. Add them in Master Setup.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredProc.map(p => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <Checkbox checked={(form.assigned_processors || []).includes(p.id)} onCheckedChange={() => toggleArray("assigned_processors", p.id)} />
                <span className="text-sm text-slate-700">{p.name} <span className="text-xs text-slate-400">({p.type})</span></span>
              </label>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* Reason Code Grouping → Evidence + Cover Letter Mapping */}
      <div>
        <SectionTitle>Reason Code Grouping Mappings</SectionTitle>
        <p className="text-xs text-slate-400 mb-3">For each grouping, select reason codes, then map evidence types and cover letter template.</p>
        {allGroupings.length === 0 ? <p className="text-sm text-slate-400">No reason codes configured. Add them in Master Setup.</p> : (
          <div className="space-y-2">
            {allGroupings.map(grouping => {
              const mapping = getMappingForGrouping(grouping);
              const etCount = (mapping.assigned_evidence_types || []).length;
              const isOpen = activeGrouping === grouping;

              return (
                <Card key={grouping} className="border-slate-100">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 rounded-xl transition-colors"
                    onClick={() => setActiveGrouping(isOpen ? null : grouping)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{grouping}</span>
                      {etCount > 0 && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{etCount} evidence</span>}
                      {mapping.assigned_cover_letter && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Cover letter set</span>}
                    </div>
                    <span className="text-slate-400 text-xs ml-2">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <CardContent className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-4 mt-0">
                      {/* Evidence Types */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence Types</p>
                        {allEvidenceTypes.length === 0 ? <p className="text-xs text-slate-400">No evidence types configured.</p> : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                            {allEvidenceTypes.map(et => (
                              <label key={et.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                <Checkbox
                                  checked={(mapping.assigned_evidence_types || []).includes(et.id)}
                                  onCheckedChange={() => toggleMappingArray(grouping, "assigned_evidence_types", et.id)}
                                />
                                <span className="text-xs text-slate-700">{et.name} <span className="text-slate-400">({et.upload_requirement})</span></span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Cover Letter */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cover Letter Template</p>
                        <Select value={mapping.assigned_cover_letter || ""} onValueChange={v => updateMapping(grouping, "assigned_cover_letter", v)}>
                          <SelectTrigger className="w-full max-w-sm"><SelectValue placeholder="Select template..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>None</SelectItem>
                            {allCoverLetters.map(cl => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
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
    assigned_users: [], assigned_fields: [], assigned_processors: [],
    reason_code_mappings: [],
    inventory_automation: { manual_upload_enabled: true },
    evidence_connectors: [],
    end_to_end_automation: {},
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
      assigned_processors: project.assigned_processors || [],
      reason_code_mappings: project.reason_code_mappings || [],
      evidence_connectors: project.evidence_connectors || [],
      end_to_end_automation: project.end_to_end_automation || {},
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
          <TabsTrigger value="cover_letters" className="text-xs">Cover Letters</TabsTrigger>
          <TabsTrigger value="inventory_automation" className="text-xs">Inventory Automation</TabsTrigger>
          <TabsTrigger value="evidence_connectors" className="text-xs">Evidence Connectors</TabsTrigger>
          <TabsTrigger value="e2e_automation" className="text-xs">End-to-End Automation</TabsTrigger>
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

        <TabsContent value="cover_letters" className="mt-4">
          <Card className="border-slate-100">
            <CardContent className="p-5">
              <ProjectCoverLetterTab projectId={project?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory_automation" className="mt-4">
          <ProjectInventoryAutomationTab
            config={{ ...(form.inventory_automation || {}), _project_id: project?.id }}
            onChange={v => set("inventory_automation", v)}
          />
        </TabsContent>

        <TabsContent value="evidence_connectors" className="mt-4">
          <Card className="border-slate-100">
            <CardContent className="p-5">
              <ProjectEvidenceConnectorsTab
                connectors={form.evidence_connectors}
                onChange={v => set("evidence_connectors", v)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="e2e_automation" className="mt-4">
          <Card className="border-slate-100">
            <CardContent className="p-5">
              <ProjectEndToEndAutomationTab
                config={form.end_to_end_automation}
                onChange={v => set("end_to_end_automation", v)}
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