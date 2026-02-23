import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";

export default function WorkflowSummaryWidget() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    base44.entities.WorkflowTask.list("-created_date", 500).then(tasks => {
      const overdue    = tasks.filter(t => t.status === "overdue").length;
      const pending    = tasks.filter(t => t.status === "pending").length;
      const inProgress = tasks.filter(t => t.status === "in_progress").length;
      const completed  = tasks.filter(t => t.status === "completed").length;
      const total      = tasks.filter(t => t.status !== "skipped").length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Due today
      const today = new Date().toISOString().split("T")[0];
      const dueToday = tasks.filter(t => t.due_date === today && t.status !== "completed" && t.status !== "skipped").length;

      setStats({ overdue, pending, inProgress, completed, total, pct, dueToday });
    }).catch(() => {});
  }, []);

  if (!stats) return null;

  const items = [
    { label: "Overdue Tasks",  value: stats.overdue,    icon: AlertTriangle, color: "text-red-500",    bg: "#FEF2F2" },
    { label: "Due Today",      value: stats.dueToday,   icon: Clock,         color: "text-amber-600",  bg: "#FFFBEB" },
    { label: "In Progress",    value: stats.inProgress + stats.pending, icon: ListTodo, color: "text-blue-600", bg: "#EEF4FF" },
    { label: "Completed",      value: stats.completed,  icon: CheckCircle2,  color: "text-emerald-600", bg: "#ECFDF5" },
  ];

  return (
    <div className="app-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Workflow Progress</h3>
          <p className="text-xs text-slate-400 mt-0.5">{stats.completed}/{stats.total} tasks completed across all disputes</p>
        </div>
        <span className="text-lg font-bold text-[#0D50B8]">{stats.pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${stats.pct}%`, background: stats.pct === 100 ? "#10b981" : "#0D50B8" }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100" style={{ background: bg }}>
            <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
            <div>
              <p className={`text-base font-bold leading-none ${color}`}>{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}