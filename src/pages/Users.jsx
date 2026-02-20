import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, UserPlus, X, Eye, EyeOff, RefreshCw, Shield, Copy, Check,
  MoreVertical, Pencil, Trash2, KeyRound, ChevronDown, AlertTriangle
} from "lucide-react";
import { generateCompliantPassword, validatePassword } from "@/components/security/roleAccess";
import { auditLog } from "@/components/security/auditLogger";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const ROLES = [
  {
    value: "super_admin",
    label: "Super Admin",
    color: "bg-red-100 text-red-700",
    description: "All pages & controls"
  },
  {
    value: "admin",
    label: "Admin",
    color: "bg-purple-100 text-purple-700",
    description: "All pages except Master Setup"
  },
  {
    value: "manager",
    label: "Manager",
    color: "bg-blue-100 text-blue-700",
    description: "Dashboard, Disputes, Inventory, Users, Reports"
  },
  {
    value: "analyst",
    label: "Analyst",
    color: "bg-green-100 text-green-700",
    description: "Dashboard & Disputes only"
  },
];

const ROLE_PAGES = {
  super_admin: ["Dashboard", "Disputes", "Inventory", "Projects", "MasterSetup", "Reports", "Users"],
  admin:       ["Dashboard", "Disputes", "Inventory", "Projects", "Reports", "Users"],
  manager:     ["Dashboard", "Disputes", "Inventory", "Users", "Reports"],
  analyst:     ["Dashboard", "Disputes"],
};

function generateUserId(email) {
  if (!email) return "";
  const local = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${local}${suffix}`;
}

// Use PCI-compliant password generator from roleAccess
const generatePassword = generateCompliantPassword;

function RoleBadge({ role }) {
  const r = ROLES.find(r => r.value === role) || { label: role, color: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${r.color}`}>{r.label}</span>;
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdTarget, setPwdTarget] = useState(null);
  const [newPwd, setNewPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: "", role: "analyst", department: "", user_id: "", temp_password: ""
  });
  const [formShowPwd, setFormShowPwd] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.User.list(),
      base44.entities.Project.list(),
    ]).then(([u, p]) => { setUsers(u); setProjects(p); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: "", role: "analyst", department: "", user_id: "", temp_password: generatePassword() });
    setFormShowPwd(false);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ email: u.email, role: u.role || "analyst", department: u.department || "", user_id: u.user_id || "", temp_password: "" });
    setFormShowPwd(false);
    setShowModal(true);
  };

  const handleEmailChange = (email) => {
    const uid = generateUserId(email);
    setForm(f => ({ ...f, email, user_id: uid }));
  };

  const [pwdErrors, setPwdErrors] = useState([]);

  const handleSave = async () => {
    if (!form.email) return;
    if (!editUser && form.temp_password) {
      const errors = validatePassword(form.temp_password);
      if (errors.length > 0) { setPwdErrors(errors); return; }
    }
    setPwdErrors([]);
    setSaving(true);
    if (editUser) {
      const upd = { role: form.role, department: form.department, user_id: form.user_id };
      if (form.temp_password) {
        const errors = validatePassword(form.temp_password);
        if (errors.length > 0) { setPwdErrors(errors); setSaving(false); return; }
        upd.temp_password = form.temp_password;
        upd.must_change_password = true;
      }
      await base44.entities.User.update(editUser.id, upd);
      await auditLog({ action: "role_change", resource_type: "User", resource_id: editUser.id, details: `Role set to ${form.role}` });
    } else {
      await base44.users.inviteUser(form.email, form.role === "super_admin" || form.role === "admin" ? "admin" : "user");
      await auditLog({ action: "create", resource_type: "User", details: `Invited ${form.email} as ${form.role}` });
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const openResetPwd = (u) => {
    setPwdTarget(u);
    setNewPwd(generatePassword());
    setShowPwd(false);
    setCopied(false);
    setShowPwdModal(true);
  };

  const [resetPwdErrors, setResetPwdErrors] = useState([]);

  const handleResetPwd = async () => {
    const errors = validatePassword(newPwd);
    if (errors.length > 0) { setResetPwdErrors(errors); return; }
    setResetPwdErrors([]);
    setSaving(true);
    await base44.entities.User.update(pwdTarget.id, { temp_password: newPwd, must_change_password: true });
    await auditLog({ action: "password_reset", resource_type: "User", resource_id: pwdTarget.id, details: `Password reset for ${pwdTarget.email}` });
    setSaving(false);
    setShowPwdModal(false);
    load();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Deactivate ${u.email}?`)) return;
    await base44.entities.User.update(u.id, { status: "inactive" });
    await auditLog({ action: "update", resource_type: "User", resource_id: u.id, details: `User ${u.email} deactivated` });
    load();
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage users, roles, and access credentials</p>
        </div>
        <Button onClick={openCreate} className="bg-[#0D50B8] hover:bg-[#0a3d8f]">
          <UserPlus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      {/* Role Access Reference */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <div key={r.value} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.color}`}>{r.label}</span>
            </div>
            <p className="text-xs text-slate-500">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Name", "User ID", "Email", "Department", "Role", "Assigned Projects", "Temp Password", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No users found</td></tr>
              ) : filtered.map(u => (
                 <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 align-top">
                   <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.user_id || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.department || "—"}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3">
                    {(() => {
                      const assigned = projects.filter(p => p.assigned_users?.includes(u.email));
                      return assigned.length === 0
                        ? <span className="text-slate-300 text-xs">—</span>
                        : <div className="flex flex-wrap gap-1">
                            {assigned.map(p => (
                              <span key={p.id} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium whitespace-nowrap">{p.name}</span>
                            ))}
                          </div>;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {u.temp_password ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{u.temp_password}</span>
                        <button onClick={() => copyToClipboard(u.temp_password)} className="text-slate-400 hover:text-slate-600">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.status === "active" ? "bg-emerald-50 text-emerald-700" :
                      u.status === "inactive" ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-600"
                    }`}>{u.status || "pending"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit / Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openResetPwd(u)}>
                          <KeyRound className="w-3.5 h-3.5 mr-2" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(u)} className="text-red-600">
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add/Edit User Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Organization Email *</label>
              <Input
                placeholder="user@organization.com"
                value={form.email}
                onChange={e => handleEmailChange(e.target.value)}
                disabled={!!editUser}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">User ID (auto-generated)</label>
              <div className="flex gap-2">
                <Input value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} className="font-mono text-sm" />
                <Button size="sm" variant="outline" onClick={() => setForm(f => ({ ...f, user_id: generateUserId(form.email) }))}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Role *</label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <span className="font-medium">{r.label}</span>
                        <span className="text-slate-400 text-xs ml-2">— {r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.role && (
                <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-500">
                  <strong>Access:</strong> {ROLE_PAGES[form.role]?.join(", ")}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Department</label>
              <Input placeholder="e.g. Operations, Finance..." value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
            {!editUser && (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Temporary Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={formShowPwd ? "text" : "password"}
                      value={form.temp_password}
                      onChange={e => setForm(f => ({ ...f, temp_password: e.target.value }))}
                      className="pr-8 font-mono text-sm"
                    />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setFormShowPwd(v => !v)}>
                      {formShowPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setForm(f => ({ ...f, temp_password: generatePassword() }))}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(form.temp_password)}>
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                {pwdErrors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600 space-y-0.5">
                    <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Password does not meet policy:</p>
                    {pwdErrors.map(e => <p key={e}>• {e}</p>)}
                  </div>
                )}
                <p className="text-xs text-amber-600 mt-1">Share this with the user. They'll be prompted to change it on first login.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.email} className="bg-[#0D50B8] hover:bg-[#0a3d8f]">
              {saving ? "Saving..." : editUser ? "Save Changes" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showPwdModal} onOpenChange={setShowPwdModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">Reset password for <strong>{pwdTarget?.email}</strong></p>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">New Temporary Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    className="pr-8 font-mono text-sm"
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button size="sm" variant="outline" onClick={() => setNewPwd(generatePassword())}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(newPwd)}>
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              {resetPwdErrors.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600 space-y-0.5">
                  <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Password does not meet policy:</p>
                  {resetPwdErrors.map(e => <p key={e}>• {e}</p>)}
                </div>
              )}
              <p className="text-xs text-amber-600 mt-1">Copy this before saving — it won't be shown in full again.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPwdModal(false)}>Cancel</Button>
            <Button onClick={handleResetPwd} disabled={saving || !newPwd} className="bg-[#0D50B8] hover:bg-[#0a3d8f]">
              {saving ? "Saving..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}