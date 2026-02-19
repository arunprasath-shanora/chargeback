import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

const statusColors = {
  received: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  converted: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.InventoryItem.list("-created_date", 100).then(d => {
      setItems(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      i.reason_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
        <p className="text-slate-500 text-sm mt-1">Incoming chargeback inventory</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Case ID", "Status", "Source", "Processor", "CB Amount", "CB Date", "Due Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No inventory items found</td></tr>
                ) : filtered.map(i => (
                  <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{i.case_id}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusColors[i.status] || "bg-slate-100 text-slate-700"} text-xs border-0`}>
                        {i.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{i.source || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{i.processor || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{i.currency} {i.chargeback_amount?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{i.chargeback_date || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{i.due_date || "—"}</td>
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