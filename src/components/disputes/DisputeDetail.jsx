import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Pencil, Upload, FileText, Trash2, Shield, ShieldOff, PauseCircle, AlertCircle } from "lucide-react";
import DisputeForm from "./DisputeForm";
import CoverLetterEditor from "./CoverLetterEditor";
import AIAssistantPanel from "./AIAssistantPanel";
import jsPDF from "jspdf";
import CaseHistoryPanel from "./CaseHistoryPanel";
import WorkflowTaskPanel from "@/components/workflow/WorkflowTaskPanel";

const statusColors = {
  new: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  awaiting_decision: "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  not_fought: "bg-slate-100 text-slate-600",
};

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
    <p className="text-sm text-slate-800 font-medium">{value || "—"}</p>
  </div>
);

const SectionGrid = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">{title}</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

export default function DisputeDetail({ dispute, projects, onBack, onUpdate, currentUser }) {
  const [editing, setEditing] = useState(false);
  const [evidence, setEvidence] = useState([]);
  const [evidenceTypes, setEvidenceTypes] = useState([]);
  const [allEvidenceTypes, setAllEvidenceTypes] = useState([]);
  const [coverLetter, setCoverLetter] = useState(dispute.cover_letter_content || "");
  const [coverTemplates, setCoverTemplates] = useState([]);
  const [allCoverTemplates, setAllCoverTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(false);
  const [savingCL, setSavingCL] = useState(false);
  const [currentDispute, setCurrentDispute] = useState(dispute);
  const [projectInfo, setProjectInfo] = useState(null);
  const [allReasonCodes, setAllReasonCodes] = useState([]);
  const [savingDecision, setSavingDecision] = useState(false);
  const [notFoughtReason, setNotFoughtReason] = useState(dispute.not_fought_reason || "");
  const [notFoughtNotes, setNotFoughtNotes] = useState(dispute.not_fought_notes || "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [aiAnalysisCache, setAiAnalysisCache] = useState(null);
  const [childDisputes, setChildDisputes] = useState([]);
  const aiRunning = useRef(false);

  const prefetchAiAnalysis = async (disputeData, evTypes, ev) => {
    if (aiRunning.current || aiAnalysisCache) return;
    aiRunning.current = true;
    const daysLeft = disputeData.sla_deadline
      ? Math.ceil((new Date(disputeData.sla_deadline) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    const evTypeNames = (evTypes || []).filter(e => e.status === "active").map(e => e.name);
    const uploadedTypes = [...new Set((ev || []).map(e => e.evidence_type))];

    const prompt = `You are a senior chargeback dispute analyst and legal writing expert specializing in winning merchant chargeback disputes. Analyze the following dispute thoroughly and return a structured JSON response.

DISPUTE DETAILS:
- Case ID: ${disputeData.case_id}
- Case Type: ${disputeData.case_type || "Unknown"}
- Reason Code: ${disputeData.reason_code || "Unknown"}
- Reason Category: ${disputeData.reason_category || "Unknown"}
- Card Network: ${disputeData.card_network || "Unknown"}
- Chargeback Amount: ${disputeData.chargeback_currency || "USD"} ${disputeData.chargeback_amount || 0}
- Chargeback Date: ${disputeData.chargeback_date || "Unknown"}
- Transaction Date: ${disputeData.transaction_date || "Unknown"}
- Transaction Amount: ${disputeData.transaction_currency || "USD"} ${disputeData.transaction_amount || 0}
- Transaction ID: ${disputeData.transaction_id || "Unknown"}
- ARN: ${disputeData.arn_number || "Unknown"}
- Authorization Code: ${disputeData.authorization_code || "Unknown"}
- Authorization Date: ${disputeData.authorization_date || "Unknown"}
- Product Type: ${disputeData.product_type || "Unknown"}
- Product Name: ${disputeData.product_name || "Unknown"}
- Customer Name: ${disputeData.customer_name || "Unknown"}
- Customer Email: ${disputeData.customer_email || "Unknown"}
- Cardholder Name: ${disputeData.cardholder_name || "Unknown"}
- Card Last 4: ${disputeData.card_last4 || "Unknown"}
- AVS Match: ${disputeData.avs_match || "Unknown"}
- CVV Match: ${disputeData.cvv_match || "Unknown"}
- 3D Secure: ${disputeData.three_d_secure || "Unknown"}
- Merchant DBA: ${disputeData.dba_name || "Unknown"}
- Processor: ${disputeData.processor || "Unknown"}
- SLA Deadline: ${disputeData.sla_deadline || "Unknown"} (${daysLeft !== null ? daysLeft + " days remaining" : "unknown"})
- Evidence already uploaded: ${uploadedTypes.length > 0 ? uploadedTypes.join(", ") : "none"}
- Available evidence types: ${evTypeNames.join(", ")}

For the coverLetterDraft, write a COMPLETE, ADVANCED, PROFESSIONAL chargeback rebuttal letter with: merchant header, processor address, subject line, opening paragraph, transaction verification, narrative defense tailored to the reason code, evidence summary table, card network rule reference, and formal closing requesting reversal.

Provide your response in this exact JSON format:
{
  "category": { "label": "<category>", "confidence": "<High|Medium|Low>", "explanation": "<explanation>" },
  "evidenceSuggestions": [{ "type": "<type>", "reason": "<reason>", "priority": "<High|Medium|Low>" }],
  "coverLetterDraft": "<complete letter>",
  "nextBestAction": { "action": "<action>", "urgency": "<Critical|High|Medium|Low>", "reason": "<reason>", "steps": ["<step1>","<step2>","<step3>"] }
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          category: { type: "object", properties: { label: { type: "string" }, confidence: { type: "string" }, explanation: { type: "string" } } },
          evidenceSuggestions: { type: "array", items: { type: "object", properties: { type: { type: "string" }, reason: { type: "string" }, priority: { type: "string" } } } },
          coverLetterDraft: { type: "string" },
          nextBestAction: { type: "object", properties: { action: { type: "string" }, urgency: { type: "string" }, reason: { type: "string" }, steps: { type: "array", items: { type: "string" } } } }
        }
      }
    });
    setAiAnalysisCache(result);
    aiRunning.current = false;
  };

  useEffect(() => {
    Promise.all([
      base44.entities.DisputeEvidence.filter({ dispute_id: dispute.id }),
      base44.entities.EvidenceType.list(),
      base44.entities.CoverLetterTemplate.list(),
      base44.entities.ReasonCode.list(),
      base44.entities.Dispute.filter({ parent_dispute_id: dispute.id }),
    ]).then(([ev, et, ct, rc, children]) => {
      setChildDisputes(children || []);
      setAllEvidenceTypes(et);

      setAllCoverTemplates(ct);
      setAllReasonCodes(rc);
      setEvidence(ev);

      // Find the project and apply its mappings
      const project = projects.find(p => p.id === dispute.project_id);
      setProjectInfo(project);
      applyProjectMappings(project, dispute.reason_code, et, ct, rc);

      // Prefetch AI analysis in background if dispute is already fought
      if (dispute.fought_decision === "fought" && (dispute.reason_code || dispute.reason_category)) {
        prefetchAiAnalysis(dispute, et, ev);
      }
    }).catch(() => {});
  }, [dispute.id]);

  const applyProjectMappings = (project, reasonCode, et, ct, rc) => {
    if (!project || !project.reason_code_mappings?.length) {
      setEvidenceTypes(et);
      setCoverTemplates(ct);
      return;
    }
    // Find which grouping the dispute's reason code belongs to
    const matchedRC = rc.find(r => r.reason_code === reasonCode);
    const grouping = matchedRC?.reason_code_grouping;
    const mapping = grouping ? project.reason_code_mappings.find(m => m.rc_grouping === grouping) : null;

    if (mapping) {
      // Filter evidence types to those assigned to this grouping
      const assignedET = mapping.assigned_evidence_types || [];
      const filteredET = assignedET.length > 0 ? et.filter(e => assignedET.includes(e.id)) : et;
      setEvidenceTypes(filteredET);

      // Filter cover templates
      if (mapping.assigned_cover_letter) {
        const tpl = ct.find(t => t.id === mapping.assigned_cover_letter);
        setCoverTemplates(tpl ? [tpl] : ct);
        if (tpl) setSelectedTemplate(tpl.id);
      } else {
        setCoverTemplates(ct);
      }
    } else {
      setEvidenceTypes(et);
      setCoverTemplates(ct);
    }
  };

  const handleFileUpload = async (e, evidenceTypeName) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.DisputeEvidence.create({
      dispute_id: dispute.id,
      evidence_type: evidenceTypeName,
      file_url,
      file_name: file.name,
      file_size_mb: +(file.size / (1024 * 1024)).toFixed(2),
      status: "uploaded",
    });
    const updated = await base44.entities.DisputeEvidence.filter({ dispute_id: dispute.id });
    setEvidence(updated);
    setUploading(false);
  };

  const handleDeleteEvidence = async (id) => {
    await base44.entities.DisputeEvidence.delete(id);
    setEvidence(ev => ev.filter(e => e.id !== id));
  };

  const handleApplyTemplate = () => {
    const tpl = coverTemplates.find(t => t.id === selectedTemplate);
    if (!tpl) return;
    let content = tpl.content || "";
    // Replace dynamic placeholders
    Object.entries(currentDispute).forEach(([k, v]) => {
      if (v !== undefined && v !== null) content = content.replaceAll(`{{${k}}}`, String(v));
    });
    setCoverLetter(content);
  };

  const handleGenerateCoverLetter = () => {
    // Handled via AI Assistant Panel — this is a no-op kept for prop compat
  };

  const handleSaveCoverLetter = async () => {
    setSavingCL(true);
    await base44.entities.Dispute.update(currentDispute.id, { cover_letter_content: coverLetter });
    setCurrentDispute(prev => ({ ...prev, cover_letter_content: coverLetter }));
    setSavingCL(false);
  };

  const handleMarkSubmitted = async () => {
    setSavingStatus(true);
    const patch = { status: "awaiting_decision" };
    await base44.entities.Dispute.update(currentDispute.id, patch);
    const merged = { ...currentDispute, ...patch };
    setCurrentDispute(merged);
    onUpdate(merged);
    setSavingStatus(false);
  };

  const handleUpdateFinalStatus = async (newStatus) => {
    setSavingStatus(true);
    const patch = { status: newStatus, resolution_date: new Date().toISOString().split("T")[0] };
    await base44.entities.Dispute.update(currentDispute.id, patch);
    const merged = { ...currentDispute, ...patch };
    setCurrentDispute(merged);
    onUpdate(merged);
    setSavingStatus(false);
  };

  const handleSetDecision = async (decision) => {
    setSavingDecision(true);
    const patch = { fought_decision: decision };
    if (decision === "not_fought") {
      patch.not_fought_reason = notFoughtReason;
      patch.not_fought_notes = notFoughtNotes;
      patch.status = "not_fought";
    }
    await base44.entities.Dispute.update(currentDispute.id, patch);
    const merged = { ...currentDispute, ...patch };
    setCurrentDispute(merged);
    onUpdate(merged);
    setSavingDecision(false);
  };

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isNotFoughtLocked = currentDispute.fought_decision === "not_fought" && !isSuperAdmin;

  // Decision gate: tabs are locked until a decision is made
  const decisionMade = !!currentDispute.fought_decision;
  const isFought = currentDispute.fought_decision === "fought";

  // Readiness checks for submission
  const hasEvidence = evidence.length > 0;
  const hasCoverLetter = !!(currentDispute.cover_letter_content && currentDispute.cover_letter_content.trim().length > 50);
  const canSubmit = isFought && hasEvidence && hasCoverLetter;

  const handlePause = async () => {
    // Keep in_progress so the status reflects work has started; just navigate back
    await base44.entities.Dispute.update(currentDispute.id, { status: "in_progress" });
    onBack();
  };

  const exportCoverLetterPDF = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Chargeback Dispute Cover Letter", margin, margin);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Case ID: ${currentDispute.case_id}  |  Date: ${new Date().toLocaleDateString()}`, margin, margin + 7);
    doc.setTextColor(0);
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 10, margin + pageWidth, margin + 10);

    // Body text
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(currentDispute.cover_letter_content || "", pageWidth);
    doc.text(lines, margin, margin + 18);

    // Evidence images
    const imageEvidence = evidence.filter(ev => {
      const name = (ev.file_name || "").toLowerCase();
      return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".gif") || name.endsWith(".webp");
    });

    if (imageEvidence.length > 0) {
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Supporting Evidence", margin, margin);
      doc.setLineWidth(0.3);
      doc.line(margin, margin + 3, margin + pageWidth, margin + 3);

      let y = margin + 12;
      for (const ev of imageEvidence) {
        try {
          // Load image via canvas for cross-origin
          const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = "anonymous";
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = ev.file_url;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

          const aspect = img.naturalHeight / img.naturalWidth;
          const imgW = pageWidth;
          const imgH = Math.min(imgW * aspect, 120);

          if (y + imgH + 16 > pageHeight - margin) { doc.addPage(); y = margin; }

          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(80);
          doc.text(`${ev.evidence_type || "Evidence"}: ${ev.file_name}`, margin, y);
          doc.setTextColor(0);
          y += 4;
          doc.addImage(dataUrl, "JPEG", margin, y, imgW, imgH);
          y += imgH + 10;
        } catch {
          // Skip images that fail to load
        }
      }
    }

    doc.save(`cover_letter_${currentDispute.case_id}.pdf`);
  };

  const handleSubmitToPortal = async () => {
    if (!canSubmit) return;
    setSavingStatus(true);
    const patch = { status: "awaiting_decision" };
    await base44.entities.Dispute.update(currentDispute.id, patch);
    const merged = { ...currentDispute, ...patch };
    onUpdate(merged);
    setSavingStatus(false);
    // Return to dispute list after submission
    onBack();
  };

  const handleApiAutomationSubmit = async () => {
    if (!canSubmit) return;
    setSavingStatus(true);
    const patch = { status: "awaiting_decision" };
    await base44.entities.Dispute.update(currentDispute.id, patch);
    const merged = { ...currentDispute, ...patch };
    onUpdate(merged);
    setSavingStatus(false);
    onBack();
  };

  if (editing) {
    return (
      <DisputeForm
        dispute={currentDispute}
        projects={projects}
        onSave={async () => {
          const updated = await base44.entities.Dispute.filter({ case_id: currentDispute.case_id });
          const d = updated[0] || currentDispute;
          setCurrentDispute(d);
          onUpdate(d);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{currentDispute.case_id}</h1>
            <Badge className={`${statusColors[currentDispute.status] || "bg-slate-100"} border-0`}>
              {currentDispute.status?.replace("_", " ")}
            </Badge>
            {currentDispute.missing_evidence === "Yes" && (
              <Badge className="bg-red-100 text-red-800 border-0">Missing Evidence</Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{currentDispute.business_unit} {currentDispute.reason_code ? `· ${currentDispute.reason_code}` : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={!isFought}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
        {currentDispute.status === "in_progress" && (
          <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={handlePause}>
            <PauseCircle className="w-3.5 h-3.5 mr-1" /> Pause & Exit
          </Button>
        )}
      </div>

      {/* ── Case Chain Panel ── */}
      <CaseHistoryPanel
        dispute={currentDispute}
        onNavigate={(d) => {
          setCurrentDispute(d);
          onUpdate(d);
        }}
      />

      {/* ── Fought / Not Fought Decision Panel ── */}
      <Card className={`border-2 ${currentDispute.fought_decision === "fought" ? "border-blue-200 bg-blue-50/40" : currentDispute.fought_decision === "not_fought" ? "border-red-100 bg-red-50/40" : "border-dashed border-amber-300 bg-amber-50/40"}`}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dispute Decision</p>

              {/* Locked view for non-super-admin on not_fought disputes */}
              {isNotFoughtLocked ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800 border-0 text-xs px-2 py-1">
                    <ShieldOff className="w-3 h-3 mr-1 inline" /> Not Fought
                  </Badge>
                  <span className="text-xs text-slate-400">· {currentDispute.not_fought_reason}</span>
                  {currentDispute.not_fought_notes && <span className="text-xs text-slate-400">· {currentDispute.not_fought_notes}</span>}
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className={currentDispute.fought_decision === "fought" ? "bg-[#0D50B8] text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-blue-50"}
                    onClick={() => {
                      const patch = { fought_decision: "fought", status: "in_progress" };
                      base44.entities.Dispute.update(currentDispute.id, patch);
                      const merged = { ...currentDispute, ...patch };
                      setCurrentDispute(merged);
                      onUpdate(merged);
                      // Start AI pre-fetch immediately on fought click
                      prefetchAiAnalysis(merged, allEvidenceTypes, evidence);
                    }}
                  >
                    <Shield className="w-3.5 h-3.5 mr-1.5" /> Fought
                  </Button>
                  <Button
                    size="sm"
                    className={currentDispute.fought_decision === "not_fought" ? "bg-red-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-red-50"}
                    onClick={() => setCurrentDispute(p => ({...p, fought_decision: "not_fought"}))}
                  >
                    <ShieldOff className="w-3.5 h-3.5 mr-1.5" /> Not Fought
                  </Button>
                </div>
              )}
            </div>

            {!isNotFoughtLocked && currentDispute.fought_decision === "not_fought" && (
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">Reason <span className="text-red-500">*</span></p>
                  <Select value={notFoughtReason} onValueChange={setNotFoughtReason}>
                    <SelectTrigger className="bg-white h-8 text-sm"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                    <SelectContent>
                      {["Low Dollar Value","Client Rule Set","Expired Cases","Duplicate","No Supporting Evidence","Client Decision","Other"].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  className="bg-white h-8 text-sm"
                  placeholder="Additional notes (optional)..."
                  value={notFoughtNotes}
                  onChange={e => setNotFoughtNotes(e.target.value)}
                />
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={!notFoughtReason || savingDecision} onClick={() => handleSetDecision("not_fought")}>
                  {savingDecision ? "Saving..." : "Confirm Not Fought"}
                </Button>
              </div>
            )}

            {!currentDispute.fought_decision && (
              <p className="text-xs text-amber-700 font-medium">⚠ Please set a decision before proceeding</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Readiness banner for submission */}
      {isFought && !["submitted","awaiting_decision","won","lost","not_fought"].includes(currentDispute.status) && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm border ${canSubmit ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            {canSubmit ? "Ready to submit! Evidence uploaded and cover letter saved." : (
              <>Checklist: {!hasEvidence && <b className="mr-2">Upload evidence</b>}{!hasCoverLetter && <b>Save a cover letter (min 50 chars)</b>}</>
            )}
          </span>
        </div>
      )}

      {/* AI Assistant Panel - shown when dispute has a fought decision */}
      {isFought && (
        <AIAssistantPanel
          dispute={currentDispute}
          evidenceTypes={evidenceTypes}
          evidence={evidence}
          cachedAnalysis={aiAnalysisCache}
          onAnalysisComplete={(result) => setAiAnalysisCache(result)}
          onApplyCoverLetter={(draft) => setCoverLetter(draft)}
          onTabSwitch={(tab) => setActiveTab(tab)}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="details" className="text-xs" disabled={!decisionMade}>Case Details</TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs" disabled={!isFought}>Evidence</TabsTrigger>
          <TabsTrigger value="cover_letter" className="text-xs" disabled={!isFought}>Cover Letter</TabsTrigger>
        </TabsList>
        {!decisionMade && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
            ⚠ Please set a <b>Dispute Decision</b> above before accessing case details, evidence, or cover letter.
          </p>
        )}

        <TabsContent value="details" className="mt-4 space-y-5">
          {/* Project Info Panel */}
          {projectInfo && (
            <Card className="border-blue-100 bg-blue-50/40">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Project: {projectInfo.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projectInfo.sub_units?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Sub Units</p>
                      <div className="flex flex-wrap gap-1">
                        {projectInfo.sub_units.map((u, i) => (
                          <span key={i} className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700">{u.sub_unit_name || u.merchant_id}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {projectInfo.client_contacts?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Client Contacts</p>
                      {projectInfo.client_contacts.map((c, i) => (
                        <p key={i} className="text-xs text-slate-700"><span className={`font-medium ${c.level === "Primary" ? "text-blue-700" : "text-slate-600"}`}>{c.level}:</span> {c.contact_name} {c.contact_email ? `· ${c.contact_email}` : ""}</p>
                      ))}
                    </div>
                  )}
                  {projectInfo.portal_credentials?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Portals</p>
                      {projectInfo.portal_credentials.map((p, i) => (
                        <p key={i} className="text-xs text-slate-700">
                          {p.portal_label}: <a href={p.portal_address} target="_blank" rel="noreferrer" className="text-[#0D50B8] hover:underline">{p.portal_address}</a>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Child dispute alert banner */}
          {childDisputes.length > 0 && (
            <div className="space-y-2">
              {childDisputes.map(child => (
                <div key={child.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-amber-50 border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="font-semibold text-amber-800">{child.case_type} received — </span>
                    <span className="text-amber-700">Case: </span>
                    <span className="font-bold text-amber-900">{child.case_id}</span>
                    <span className="mx-2 text-amber-400">·</span>
                    <span className="text-xs text-amber-700">SLA: {child.sla_deadline || "—"}</span>
                    <span className="mx-2 text-amber-400">·</span>
                    <Badge className={`${statusColors[child.status] || "bg-slate-100"} border-0 text-xs`}>{child.status?.replace("_"," ")}</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 text-xs hover:bg-amber-100"
                    onClick={() => { setCurrentDispute(child); onUpdate(child); }}>
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}

          <SectionGrid title="Case Information">
            <InfoRow label="Case ID" value={currentDispute.case_id} />
            <InfoRow label="Case Type" value={currentDispute.case_type} />
            <InfoRow label="Status" value={currentDispute.status?.replace("_", " ")} />
            <InfoRow label="Decision" value={currentDispute.fought_decision === "fought" ? "Fought" : currentDispute.fought_decision === "not_fought" ? "Not Fought" : "—"} />
            {currentDispute.fought_decision === "not_fought" && <InfoRow label="Not Fought Reason" value={currentDispute.not_fought_reason} />}
            <InfoRow label="Assigned To" value={currentDispute.assigned_to} />
            <InfoRow label="SLA Deadline" value={currentDispute.sla_deadline} />
            <InfoRow label="Business Unit" value={currentDispute.business_unit} />
            <InfoRow label="Sub Unit" value={currentDispute.sub_unit_name} />
            <InfoRow label="Processor" value={currentDispute.processor} />
            <InfoRow label="Merchant ID" value={currentDispute.merchant_id} />
            <InfoRow label="DBA Name" value={currentDispute.dba_name} />
            <InfoRow label="Missing Evidence" value={currentDispute.missing_evidence} />
          </SectionGrid>

          <SectionGrid title="Chargeback Details">
            <InfoRow label="Chargeback Date" value={currentDispute.chargeback_date} />
            <InfoRow label="Chargeback Amount" value={`${currentDispute.chargeback_currency || ""} ${currentDispute.chargeback_amount?.toLocaleString() || "—"}`} />
            <InfoRow label="Amount (USD)" value={currentDispute.chargeback_amount_usd ? `USD ${currentDispute.chargeback_amount_usd?.toLocaleString()}` : "—"} />
            <InfoRow label="Reason Code" value={currentDispute.reason_code} />
            <InfoRow label="Reason Category" value={currentDispute.reason_category} />
            <InfoRow label="ARN (Acquirer Ref No.)" value={currentDispute.arn_number} />
            <InfoRow label="Cardholder Name" value={currentDispute.cardholder_name} />
          </SectionGrid>

          <SectionGrid title="Card & Authorization">
            <InfoRow label="Card Network" value={currentDispute.card_network} />
            <InfoRow label="Card Type (Funding)" value={currentDispute.card_type} />
            <InfoRow label="Card BIN (First 6)" value={currentDispute.card_bin_first6} />
            <InfoRow label="Card Last 4 digits" value={currentDispute.card_last4} />
            <InfoRow label="Auth Code" value={currentDispute.authorization_code} />
            <InfoRow label="Auth Date" value={currentDispute.authorization_date} />
            <InfoRow label="Auth Amount" value={currentDispute.authorization_amount} />
            <InfoRow label="AVS Result" value={currentDispute.avs_match} />
            <InfoRow label="CVV Result" value={currentDispute.cvv_match} />
            <InfoRow label="3D Secure (3DS)" value={currentDispute.three_d_secure} />
          </SectionGrid>

          <SectionGrid title="Original Transaction">
            <InfoRow label="Transaction ID" value={currentDispute.transaction_id} />
            <InfoRow label="Transaction Date" value={currentDispute.transaction_date} />
            <InfoRow label="Transaction Amount" value={`${currentDispute.transaction_currency || ""} ${currentDispute.transaction_amount?.toLocaleString() || "—"}`} />
            <InfoRow label="Transaction Country" value={currentDispute.transaction_country} />
            <InfoRow label="Transaction State" value={currentDispute.transaction_state} />
            <InfoRow label="Billing Zip Code" value={currentDispute.billing_zip_code} />
          </SectionGrid>

          <SectionGrid title="Customer & Order">
            <InfoRow label="Customer Name" value={currentDispute.customer_name} />
            <InfoRow label="Customer Email" value={currentDispute.customer_email} />
            <InfoRow label="Customer Phone" value={currentDispute.customer_phone} />
            <InfoRow label="Customer IP" value={currentDispute.customer_ip} />
            <InfoRow label="Product Name" value={currentDispute.product_name} />
            <InfoRow label="Product Type" value={currentDispute.product_type} />
            <InfoRow label="Service Start" value={currentDispute.service_start_date} />
            <InfoRow label="Service End" value={currentDispute.service_end_date} />
          </SectionGrid>

          {currentDispute.notes && (
            <Card className="border-slate-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{currentDispute.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">Upload evidence files for this dispute.</p>

          {/* Evidence by type */}
          <div className="space-y-3">
            {evidenceTypes.filter(et => et.status === "active").map(et => {
              const uploaded = evidence.filter(e => e.evidence_type === et.name);
              return (
                <Card key={et.id} className="border-slate-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{et.name}</p>
                        <p className="text-xs text-slate-400">{et.upload_requirement === "mandatory" ? "Required" : "Optional"} · Max {et.max_file_size_mb}MB</p>
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, et.name)} disabled={uploading} />
                        <Button size="sm" variant="outline" asChild>
                          <span><Upload className="w-3.5 h-3.5 mr-1" /> Upload</span>
                        </Button>
                      </label>
                    </div>
                    {uploaded.length > 0 && (
                      <div className="space-y-2">
                        {uploaded.map(ev => (
                          <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <a href={ev.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#0D50B8] hover:underline flex-1 truncate">{ev.file_name}</a>
                            <Badge className="bg-green-100 text-green-800 border-0 text-xs">{ev.status}</Badge>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDeleteEvidence(ev.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {evidenceTypes.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">No evidence types configured. Add them in Master Setup.</p>
            )}
          </div>

          {/* General uploads not tied to a type */}
          <Card className="border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-slate-800">Other Evidence</p>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, "Other")} disabled={uploading} />
                  <Button size="sm" variant="outline" asChild>
                    <span><Upload className="w-3.5 h-3.5 mr-1" /> Upload</span>
                  </Button>
                </label>
              </div>
              {evidence.filter(e => e.evidence_type === "Other").map(ev => (
                <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg mb-2">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={ev.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#0D50B8] hover:underline flex-1 truncate">{ev.file_name}</a>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDeleteEvidence(ev.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cover_letter" className="mt-4 space-y-4">
          <CoverLetterEditor
            coverLetter={coverLetter}
            setCoverLetter={setCoverLetter}
            currentDispute={currentDispute}
            evidence={evidence}
            coverTemplates={coverTemplates}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            generatingCL={generatingCL}
            savingCL={savingCL}
            hasCoverLetter={hasCoverLetter}
            hasEvidence={hasEvidence}
            canSubmit={canSubmit}
            savingStatus={savingStatus}
            isFought={isFought}
            onApplyTemplate={handleApplyTemplate}
            onSave={handleSaveCoverLetter}
            onExportPDF={exportCoverLetterPDF}
            onSubmit={handleSubmitToPortal}
            onApiAutomation={handleApiAutomationSubmit}
          />

          {/* Awaiting Decision resolution panel */}
          {currentDispute.status === "awaiting_decision" && (
            <Card className="border-purple-100 bg-purple-50/40">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Update Processor Decision</p>
                <p className="text-xs text-slate-500 mb-3">Check the processor portal and record the outcome below.</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={savingStatus} onClick={() => handleUpdateFinalStatus("won")}>
                    Mark as Won
                  </Button>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={savingStatus} onClick={() => handleUpdateFinalStatus("lost")}>
                    Mark as Lost
                  </Button>
                  <span className="text-xs text-slate-400 self-center ml-1">Status remains Awaiting Decision until updated</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}