import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye } from "lucide-react";
import DisputeForm from "@/components/disputes/DisputeForm";
import DisputeDetail from "@/components/disputes/DisputeDetail";

const statusColors = {
  new: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
};

const foughtColors = {
  fought: "bg-blue-50 text-blue-700",
  not_fought: "bg-slate-100 text-slate-600",
};

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [foughtFilter, setFoughtFilter] = useState("all");

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const load = () => {
    Promise.all([
      base44.entities.Dispute.filter({ status: "new" }, "-created_date", 200),
      base44.entities.Dispute.filter({ status: "in_progress" }, "-created_date", 200),
      base44.entities.Project.list(),
      base44.auth.me(),
    ]).then(([dnew, dinprog, p, u]) => {
      setDisputes([...dnew, ...dinprog]);
      setProjects(p);
      setCurrentUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = disputes.filter(d => {
    const matchSearch = !search ||
      d.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      d.cardholder_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.reason_code?.toLowerCase().includes(search.toLowerCase()) ||
      d.business_unit?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchProject = projectFilter === "all" || d.project_id === projectFilter;
    const matchFought = foughtFilter === "all" || d.fought_decision === foughtFilter;
    return matchSearch && matchStatus && matchProject && matchFought;
  });

  if (selectedDispute) {
    return (
      <DisputeDetail
        dispute={selectedDispute}
        projects={projects}
        currentUser={currentUser}
        onBack={() => { setSelectedDispute(null); load(); }}
        onUpdate={(updated) => setSelectedDispute(updated)}
      />
    );
  }


  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Disputes</h1>
          <p className="text-slate-500 text-sm mt-1">Manage chargeback disputes</p>
        </div>
        
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by case ID, cardholder, reason..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={foughtFilter} onValueChange={setFoughtFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Fought?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Decisions</SelectItem>
            <SelectItem value="fought">Fought</SelectItem>
            <SelectItem value="not_fought">Not Fought</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Case ID", "ARN", "Case Type", "Sub Unit", "Processor", "Decision", "Status", "Card Network", "Currency", "Dispute Amount", "USD Amount", "Reason Code", "SLA Deadline", "Assigned To", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No disputes found</td></tr>
                ) : filtered.map(d => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedDispute(d)}>
                    <td className="px-4 py-3 font-medium text-[#0D50B8]">{d.case_id}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{d.arn_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{d.case_type || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{d.sub_unit_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{d.processor || "—"}</td>
                    <td className="px-4 py-3">
                      {d.fought_decision ? (
                        <Badge className={`${foughtColors[d.fought_decision]} text-xs border-0`}>
                          {d.fought_decision === "fought" ? "Fought" : "Not Fought"}
                        </Badge>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusColors[d.status] || "bg-slate-100 text-slate-700"} text-xs border-0`}>
                        {d.status?.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.card_network || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-medium">{d.chargeback_currency || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{d.chargeback_amount?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">{d.chargeback_amount_usd ? `$${d.chargeback_amount_usd?.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{d.reason_code || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{d.sla_deadline || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{d.assigned_to || "—"}</td>
                    <td className="px-4 py-3">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setSelectedDispute(d); }}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}