import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-red-100 text-red-800",
  setup: "bg-yellow-100 text-yellow-800",
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.Project.list("-created_date", 100).then(d => {
      setProjects(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.merchant_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
        <p className="text-slate-500 text-sm mt-1">Business units and merchant configurations</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-slate-400 col-span-3 text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400 col-span-3 text-center py-8">No projects found</p>
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
                {p.merchant_id && <p><span className="text-slate-400">MID:</span> {p.merchant_id}</p>}
                {p.processor && <p><span className="text-slate-400">Processor:</span> {p.processor}</p>}
                {p.dba_name && <p><span className="text-slate-400">DBA:</span> {p.dba_name}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}