import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Save } from "lucide-react";

const SECTION = ({ title, children }) => (
  <Card className="border-slate-100">
    <CardHeader className="pb-3 pt-4 px-5">
      <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-5 pb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </CardContent>
  </Card>
);

const F = ({ label, children, span }) => (
  <div className={`space-y-1 ${span ? "sm:col-span-" + span : ""}`}>
    <Label className="text-xs font-medium text-slate-600">{label}</Label>
    {children}
  </div>
);

export default function ProjectForm({ project, onSave, onCancel }) {
  const [form, setForm] = useState(project || {
    name: "", sub_unit_name: "", client_contact_name: "", client_email: "", client_phone: "",
    merchant_id: "", mid_alias: "", dba_name: "", processor: "", currency: "", status: "setup",
    portal_address: "", portal_username: "", portal_password: "",
    assigned_users: [], assigned_fields: [], assigned_evidence_types: [], assigned_cover_letter: "",
    notes: "",
  });
  const [allUsers, setAllUsers] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [allEvidenceTypes, setAllEvidenceTypes] = useState([]);
  const [allCoverLetters, setAllCoverLetters] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.CustomField.list(),
      base44.entities.EvidenceType.list(),
      base44.entities.CoverLetterTemplate.list(),
    ]).then(([u, f, et, cl]) => {
      setAllUsers(u);
      setAllFields(f);
      setAllEvidenceTypes(et);
      setAllCoverLetters(cl);
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
    setSaving(true);
    if (project?.id) await base44.entities.Project.update(project.id, form);
    else await base44.entities.Project.create(form);
    setSaving(false);
    onSave();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{project ? "Edit Project" : "New Project"}</h1>
          <p className="text-slate-500 text-xs">{project ? project.name : "Create a new business unit"}</p>
        </div>
        <div className="ml-auto">
          <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Project"}
          </Button>
        </div>
      </div>

      <SECTION title="Basic Information">
        <F label="Project Name *"><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Project name" /></F>
        <F label="Sub Unit Name"><Input value={form.sub_unit_name} onChange={e => set("sub_unit_name", e.target.value)} /></F>
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
        <F label="DBA Name"><Input value={form.dba_name} onChange={e => set("dba_name", e.target.value)} /></F>
        <F label="Merchant ID"><Input value={form.merchant_id} onChange={e => set("merchant_id", e.target.value)} /></F>
        <F label="MID Alias"><Input value={form.mid_alias} onChange={e => set("mid_alias", e.target.value)} /></F>
        <F label="Processor">
          <Select value={form.processor} onValueChange={v => set("processor", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {["Fiserv","American Express","Visa","Mastercard","Stripe","PayPal","Adyen","Worldpay","Other"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <F label="Currency">
          <Select value={form.currency} onValueChange={v => set("currency", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {["USD","EUR","GBP","AUD","CAD","NZD","INR","SGD","AED","Other"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
      </SECTION>

      <SECTION title="Client Contact">
        <F label="Contact Name"><Input value={form.client_contact_name} onChange={e => set("client_contact_name", e.target.value)} /></F>
        <F label="Email"><Input type="email" value={form.client_email} onChange={e => set("client_email", e.target.value)} /></F>
        <F label="Phone"><Input value={form.client_phone} onChange={e => set("client_phone", e.target.value)} /></F>
      </SECTION>

      <SECTION title="Portal Credentials">
        <F label="Portal URL"><Input value={form.portal_address} onChange={e => set("portal_address", e.target.value)} placeholder="https://..." /></F>
        <F label="Username"><Input value={form.portal_username} onChange={e => set("portal_username", e.target.value)} /></F>
        <F label="Password"><Input type="password" value={form.portal_password} onChange={e => set("portal_password", e.target.value)} /></F>
      </SECTION>

      {/* Assigned Users */}
      <Card className="border-slate-100">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Assigned Users</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {allUsers.length === 0 ? (
            <p className="text-sm text-slate-400">No users available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allUsers.map(u => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <Checkbox
                    checked={(form.assigned_users || []).includes(u.email)}
                    onCheckedChange={() => toggleArray("assigned_users", u.email)}
                  />
                  <span className="text-sm text-slate-700">{u.full_name || u.email}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Custom Fields */}
      <Card className="border-slate-100">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Assigned Custom Fields</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {allFields.length === 0 ? (
            <p className="text-sm text-slate-400">No custom fields configured. Add them in Master Setup.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allFields.map(f => (
                <label key={f.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <Checkbox
                    checked={(form.assigned_fields || []).includes(f.id)}
                    onCheckedChange={() => toggleArray("assigned_fields", f.id)}
                  />
                  <span className="text-sm text-slate-700">{f.field_name} <span className="text-xs text-slate-400">({f.field_type})</span></span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Evidence Types */}
      <Card className="border-slate-100">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Assigned Evidence Types</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {allEvidenceTypes.length === 0 ? (
            <p className="text-sm text-slate-400">No evidence types configured. Add them in Master Setup.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allEvidenceTypes.map(et => (
                <label key={et.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <Checkbox
                    checked={(form.assigned_evidence_types || []).includes(et.id)}
                    onCheckedChange={() => toggleArray("assigned_evidence_types", et.id)}
                  />
                  <span className="text-sm text-slate-700">{et.name} <span className="text-xs text-slate-400">({et.upload_requirement})</span></span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cover Letter */}
      <Card className="border-slate-100">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Default Cover Letter Template</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Select value={form.assigned_cover_letter || ""} onValueChange={v => set("assigned_cover_letter", v)}>
            <SelectTrigger className="w-full max-w-sm"><SelectValue placeholder="Select template..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {allCoverLetters.map(cl => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-slate-100">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Notes</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes..." className="min-h-[80px]" />
        </CardContent>
      </Card>
    </div>
  );
}