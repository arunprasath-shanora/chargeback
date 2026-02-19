import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";

const statusColors = {
  new: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  pending: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.Dispute.list("-created_date", 100).then(d => {
      setDisputes(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = disputes.filter(d => {
    const matchSearch = !search ||
      d.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      d.cardholder_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.reason_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Disputes</h1>
          <p className="text-slate-500 text-sm mt-1">Manage chargeback disputes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search disputes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Case ID", "Status", "Business Unit", "Dispute Amount", "Reason Code", "SLA Deadline", "Assigned To"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No disputes found</td></tr>
                ) : filtered.map(d => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{d.case_id}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusColors[d.status] || "bg-slate-100 text-slate-700"} text-xs border-0`}>
                        {d.status?.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.business_unit || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{d.dispute_currency} {d.dispute_amount?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{d.reason_code || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{d.sla_deadline || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{d.assigned_to || "—"}</td>
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