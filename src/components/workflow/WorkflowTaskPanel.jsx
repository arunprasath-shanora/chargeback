import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, Clock, AlertTriangle, Plus, ChevronDown, ChevronRight, X, User } from "lucide-react";

const STAGES = ["Triage", "Evidence Collection", "Cover Letter", "Review", "Submission", "Awaiting Decision", "Closed"];

const DEFAULT_TASKS = {
  "Triage":              [{ title: "Review case details & set decision (Fight/Not Fight)", priority: "high" }],
  "Evidence Collection": [{ title: "Collect transaction receipt / order confirmation", priority: "high" }, { title: "Gather customer communication records", priority: "medium" }, { title: "Upload supporting evidence files", priority: "high" }],
  "Cover Letter":        [{ title: "Apply cover letter template", priority: "medium" }, { title: "Review & edit cover letter content", priority: "high" }, { title: "Save finalized cover letter", priority: "high" }],
  "Review":              [{ title: "Verify all evidence is uploaded", priority: "high" }, { title: "Check cover letter for accuracy", priority: "high" }],
  "Submission":          [{ title: "Submit rebuttal to processor portal", priority: "critical" }],
  "Awaiting Decision":   [{ title: "Monitor processor portal for decision", priority: "medium" }, { title: "Record final outcome (Won/Lost)", priority: "high" }],
  "Closed":              [{ title: "Document lessons learned", priority: "low" }],
};

const PRIORITY_STYLES = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-blue-100 text-blue-700 border-blue-200",
  low:      "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_ICONS = {
  completed:   <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  in_progress: <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  overdue:     <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  pending:     <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />,
  skipped:     <Circle className="w-4 h-4 text-slate-200 flex-shrink-0" />,
};

function getStageIndex(dispute) {
  if (!dispute.fought_decision) return 0;
  if (["won", "lost", "not_fought"].includes(dispute.status)) return 6;
  if (dispute.status === "awaiting_decision") return 5;
  if (dispute.status === "submitted") return 5;
  const hasCoverLetter = !!(dispute.cover_letter_content && dispute.cover_letter_content.length > 50);
  if (hasCoverLetter) return 3;
  if (dispute.fought_decision === "fought") return 1;
  return 0;
}

export default function WorkflowTaskPanel({ dispute, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState({});
  const [addingTask, setAddingTask] = useState(null); // stage name
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const currentStageIdx = getStageIndex(dispute);

  useEffect(() => {
    loadTasks();
  }, [dispute.id]);

  const loadTasks = async () => {
    setLoading(true);
    let existing = await base44.entities.WorkflowTask.filter({ dispute_id: dispute.id });

    // Auto-generate tasks if none exist
    if (existing.length === 0) {
      const toCreate = [];
      const today = new Date();
      STAGES.forEach((stage, si) => {
        (DEFAULT_TASKS[stage] || []).forEach((t) => {
          const daysOffset = (si + 1) * 2;
          const dueDate = new Date(today);
          dueDate.setDate(dueDate.getDate() + daysOffset);
          // Respect SLA: cap due date to dispute SLA
          const slaCap = dispute.sla_deadline ? new Date(dispute.sla_deadline) : null;
          const finalDue = slaCap && dueDate > slaCap ? slaCap : dueDate;
          toCreate.push({
            dispute_id: dispute.id,
            title: t.title,
            stage,
            priority: t.priority,
            status: "pending",
            due_date: finalDue.toISOString().split("T")[0],
            assigned_to: dispute.assigned_to || "",
            is_auto_generated: true,
          });
        });
      });
      await base44.entities.WorkflowTask.bulkCreate(toCreate);
      existing = await base44.entities.WorkflowTask.filter({ dispute_id: dispute.id });
    }

    // Mark overdue
    const today = new Date().toISOString().split("T")[0];
    const updates = [];
    existing = existing.map(t => {
      if (t.status === "pending" && t.due_date && t.due_date < today) {
        updates.push(base44.entities.WorkflowTask.update(t.id, { status: "overdue" }));
        return { ...t, status: "overdue" };
      }
      return t;
    });
    await Promise.all(updates);
    setTasks(existing);
    // Expand current and previous stages by default
    const expanded = {};
    STAGES.forEach((s, i) => { if (i <= currentStageIdx) expanded[s] = true; });
    setExpandedStages(expanded);
    setLoading(false);
  };

  const toggleTask = async (task) => {
    const next = task.status === "completed" ? "pending" : "completed";
    const patch = {
      status: next,
      completed_date: next === "completed" ? new Date().toISOString().split("T")[0] : null,
      completed_by: next === "completed" ? (currentUser?.email || "") : null,
    };
    await base44.entities.WorkflowTask.update(task.id, patch);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...patch } : t));
  };

  const addCustomTask = async (stage) => {
    if (!newTaskTitle.trim()) return;
    const newTask = await base44.entities.WorkflowTask.create({
      dispute_id: dispute.id,
      title: newTaskTitle.trim(),
      stage,
      status: "pending",
      priority: "medium",
      assigned_to: currentUser?.email || "",
      is_auto_generated: false,
    });
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle("");
    setAddingTask(null);
  };

  const deleteTask = async (id) => {
    await base44.entities.WorkflowTask.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  if (loading) return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 text-center text-xs text-slate-400">
      Loading workflow tasks...
    </div>
  );

  const completedCount = tasks.filter(t => t.status === "completed").length;
  const totalCount = tasks.filter(t => t.status !== "skipped").length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const overdueCount = tasks.filter(t => t.status === "overdue").length;

  return (
    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Workflow Tasks</h3>
          <p className="text-xs text-slate-400 mt-0.5">{completedCount}/{totalCount} completed · {progressPct}%</p>
        </div>
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />{overdueCount} overdue
            </span>
          )}
          {/* Progress bar */}
          <div className="hidden sm:block w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: progressPct === 100 ? "#10b981" : "#0D50B8" }}
            />
          </div>
        </div>
      </div>

      {/* Stage progress strip */}
      <div className="px-5 py-3 border-b border-slate-50 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {STAGES.map((stage, i) => {
            const stageTasks = tasks.filter(t => t.stage === stage && t.status !== "skipped");
            const stageCompleted = stageTasks.length > 0 && stageTasks.every(t => t.status === "completed");
            const isActive = i === currentStageIdx;
            const isDone = i < currentStageIdx || stageCompleted;
            return (
              <React.Fragment key={stage}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone ? "bg-emerald-500 text-white" :
                    isActive ? "bg-[#0D50B8] text-white ring-2 ring-blue-200" :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[9px] font-medium text-center leading-tight max-w-[52px] ${isActive ? "text-[#0D50B8]" : isDone ? "text-emerald-600" : "text-slate-400"}`}>
                    {stage}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`h-0.5 w-8 flex-shrink-0 mx-0.5 mb-4 rounded-full ${isDone ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Tasks by stage */}
      <div className="divide-y divide-slate-50">
        {STAGES.map((stage, si) => {
          const stageTasks = tasks.filter(t => t.stage === stage);
          if (stageTasks.length === 0 && si !== currentStageIdx) return null;
          const isExpanded = expandedStages[stage];
          const isActive = si === currentStageIdx;
          const completedInStage = stageTasks.filter(t => t.status === "completed").length;
          const hasOverdue = stageTasks.some(t => t.status === "overdue");

          return (
            <div key={stage}>
              <button
                onClick={() => setExpandedStages(p => ({ ...p, [stage]: !p[stage] }))}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-slate-50 ${isActive ? "bg-blue-50/60" : ""}`}
              >
                <span className={`text-xs font-semibold ${isActive ? "text-[#0D50B8]" : "text-slate-600"}`}>{stage}</span>
                {isActive && <Badge className="bg-[#0D50B8] text-white border-0 text-[9px] px-1.5 py-0 h-4">Current</Badge>}
                {hasOverdue && <Badge className="bg-red-100 text-red-700 border-0 text-[9px] px-1.5 py-0 h-4">Overdue</Badge>}
                <span className="ml-auto text-[10px] text-slate-400">{completedInStage}/{stageTasks.length}</span>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-3 space-y-2">
                  {stageTasks.map(task => (
                    <div key={task.id} className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                      task.status === "completed" ? "bg-emerald-50/50 border-emerald-100" :
                      task.status === "overdue" ? "bg-red-50/50 border-red-100" :
                      "bg-white border-slate-100 hover:border-blue-100"
                    }`}>
                      <button onClick={() => toggleTask(task)} className="mt-0.5">
                        {STATUS_ICONS[task.status] || STATUS_ICONS.pending}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-snug ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`border text-[9px] px-1.5 py-0 h-4 ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</Badge>
                          {task.due_date && (
                            <span className={`text-[10px] ${task.status === "overdue" ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                              Due {task.due_date}
                            </span>
                          )}
                          {task.assigned_to && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <User className="w-2.5 h-2.5" />{task.assigned_to.split("@")[0]}
                            </span>
                          )}
                          {task.completed_by && (
                            <span className="text-[10px] text-emerald-600">✓ {task.completed_by.split("@")[0]}</span>
                          )}
                        </div>
                      </div>
                      {!task.is_auto_generated && (
                        <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-400 mt-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add task inline */}
                  {addingTask === stage ? (
                    <div className="flex gap-2 mt-1">
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder="Task title..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addCustomTask(stage); if (e.key === "Escape") { setAddingTask(null); setNewTaskTitle(""); } }}
                        autoFocus
                      />
                      <Button size="sm" className="h-7 text-xs bg-[#0D50B8] hover:bg-blue-700" onClick={() => addCustomTask(stage)}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingTask(null); setNewTaskTitle(""); }}>Cancel</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTask(stage)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#0D50B8] transition-colors mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add custom task
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}