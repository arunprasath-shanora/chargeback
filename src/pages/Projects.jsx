import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import ProjectForm from "@/components/projects/ProjectForm";

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-red-100 text-red-800",
  setup: "bg-yellow-100 text-yellow-800",
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const load = () => {
    base44.entities.Project.list("-created_date", 100).then(d => {
      setProjects(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm("Delete this project?")) {
      await base44.entities.Project.delete(id);
      load();
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.merchant_id?.toLowerCase().includes(search.toLowerCase()) || p.dba_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (showForm || editProject) {
    return (
      <ProjectForm
        project={editProject}
        onSave={() => { setShowForm(false); setEditProject(null); load(); }}
        onCancel={() => { setShowForm(false); setEditProject(null); }}
      />
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">Business units and merchant configurations</p>
        </div>
        <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="setup">Setup</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-slate-400 col-span-3 text-center py-10">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400 col-span-3 text-center py-10">No projects found</p>
        ) : filtered.map(p => (
          <Card key={p.id} className="border-slate-100 hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-800 leading-tight">{p.name}</h3>
                <Badge className={`${statusColors[p.status] || "bg-slate-100 text-slate-700"} text-xs border-0 flex-shrink-0`}>
                  {p.status}
                </Badge>
              </div>
              {p.sub_unit_name && <p className="text-xs text-slate-500">{p.sub_unit_name}</p>}
              <div className="space-y-1 text-sm text-slate-600">
                {p.merchant_id && <p><span className="text-slate-400 text-xs">MID:</span> {p.merchant_id}</p>}
                {p.processor && <p><span className="text-slate-400 text-xs">Processor:</span> {p.processor}</p>}
                {p.dba_name && <p><span className="text-slate-400 text-xs">DBA:</span> {p.dba_name}</p>}
                {p.currency && <p><span className="text-slate-400 text-xs">Currency:</span> {p.currency}</p>}
              </div>
              {p.assigned_users?.length > 0 && (
                <p className="text-xs text-slate-400">{p.assigned_users.length} user(s) assigned</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setEditProject(p)}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200" onClick={(e) => handleDelete(p.id, e)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}