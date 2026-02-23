import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ChevronDown, ChevronUp, Loader2,
  Tag, FileSearch, FileEdit, CheckCircle, RefreshCw, X,
  Target, TrendingUp, TrendingDown, Minus, ShieldCheck,
  AlertTriangle, CheckCircle2, Lightbulb, BarChart2, Info
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Gauge Meter ─────────────────────────────────────────────────────────────
function GaugeMeter({ score }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 65 ? "#16a34a" : clamped >= 40 ? "#d97706" : "#dc2626";
  const label = clamped >= 65 ? "Likely Win" : clamped >= 40 ? "Uncertain" : "Likely Loss";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-32 h-[72px] overflow-hidden">
        <svg viewBox="0 0 140 80" className="absolute inset-0 w-full h-full">
          <path d="M10,75 A60,60 0 1,1 130,75" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
          <path
            d="M10,75 A60,60 0 1,1 130,75"
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * 188} 188`}
            style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.5s ease" }}
          />
          <g transform={`translate(70,75) rotate(${-135 + (clamped / 100) * 270})`}>
            <line x1="0" y1="0" x2="0" y2="-48" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <circle cx="0" cy="0" r="4" fill={color} />
          </g>
        </svg>
      </div>
      <div className="flex flex-col items-center -mt-1">
        <span className="text-2xl font-extrabold leading-none" style={{ color }}>{clamped}%</span>
        <span className="text-xs font-semibold mt-0.5" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

// ── sub-card ───────────────────────────────────────────────────────────────
function AICard({ icon: Icon, title, accent, children }) {
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${accent}`}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center">
          <Icon className="w-4 h-4 text-violet-600" />
        </div>
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  );
}

const FACTOR_ICONS = { positive: CheckCircle2, negative: AlertTriangle, neutral: Minus };
const FACTOR_COLORS = {
  positive: "text-emerald-600 bg-emerald-50 border-emerald-100",
  negative: "text-red-600 bg-red-50 border-red-100",
  neutral: "text-slate-500 bg-slate-50 border-slate-100",
};
const PRIORITY_COLORS = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-500",
};
const CATEGORY_COLORS = {
  Evidence: "bg-blue-50 text-blue-700 border-blue-200",
  Documentation: "bg-violet-50 text-violet-700 border-violet-200",
  Process: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Timing: "bg-red-50 text-red-700 border-red-200",
};

export default function AIAssistantPanel({ dispute, evidenceTypes, evidence, onApplyCoverLetter, onTabSwitch, cachedAnalysis, onAnalysisComplete }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(cachedAnalysis || null);
  const [dismissed, setDismissed] = useState({});

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    const daysLeft = daysUntil(dispute.sla_deadline);
    const evTypeNames = evidenceTypes.filter(e => e.status === "active").map(e => e.name);
    const uploadedTypes = [...new Set(evidence.map(e => e.evidence_type))];
    const missingMandatory = evidenceTypes
      .filter(et => et.status === "active" && et.upload_requirement === "mandatory")
      .filter(et => !uploadedTypes.includes(et.name))
      .map(et => et.name);

    const prompt = `You are a senior chargeback dispute analyst. Analyze the following dispute and return a structured JSON response including a win probability prediction.

DISPUTE DETAILS:
- Case ID: ${dispute.case_id}
- Case Type: ${dispute.case_type || "Unknown"}
- Reason Code: ${dispute.reason_code || "Unknown"}
- Reason Category: ${dispute.reason_category || "Unknown"}
- Card Network: ${dispute.card_network || "Unknown"}
- Card Type: ${dispute.card_type || "Unknown"}
- Chargeback Amount: ${dispute.chargeback_currency || "USD"} ${dispute.chargeback_amount || 0}
- Chargeback Date: ${dispute.chargeback_date || "Unknown"}
- Transaction Date: ${dispute.transaction_date || "Unknown"}
- Transaction Amount: ${dispute.transaction_currency || "USD"} ${dispute.transaction_amount || 0}
- Transaction ID: ${dispute.transaction_id || "Unknown"}
- ARN: ${dispute.arn_number || "Unknown"}
- Authorization Code: ${dispute.authorization_code || "Unknown"}
- Authorization Date: ${dispute.authorization_date || "Unknown"}
- Product Type: ${dispute.product_type || "Unknown"}
- Product Name: ${dispute.product_name || "Unknown"}
- Customer Name: ${dispute.customer_name || "Unknown"}
- Customer Email: ${dispute.customer_email || "Unknown"}
- Cardholder Name: ${dispute.cardholder_name || "Unknown"}
- Card Last 4: ${dispute.card_last4 || "Unknown"}
- Card BIN: ${dispute.card_bin_first6 || "Unknown"}
- AVS Match: ${dispute.avs_match || "Unknown"}
- CVV Match: ${dispute.cvv_match || "Unknown"}
- 3D Secure: ${dispute.three_d_secure || "Unknown"}
- Service Start: ${dispute.service_start_date || "N/A"}
- Service End: ${dispute.service_end_date || "N/A"}
- Merchant DBA: ${dispute.dba_name || "Unknown"}
- Processor: ${dispute.processor || "Unknown"}
- Current Status: ${dispute.status || "new"}
- SLA Deadline: ${dispute.sla_deadline || "Unknown"} (${daysLeft !== null ? daysLeft + " days remaining" : "unknown"})
- Evidence already uploaded: ${uploadedTypes.length > 0 ? uploadedTypes.join(", ") : "none"}
- Missing mandatory evidence: ${missingMandatory.length > 0 ? missingMandatory.join(", ") : "none"}
- Available evidence types: ${evTypeNames.join(", ")}
- Cover Letter Ready: ${dispute.cover_letter_content && dispute.cover_letter_content.length > 50 ? "Yes" : "No"}

For the coverLetterDraft, write a COMPLETE, ADVANCED, PROFESSIONAL chargeback rebuttal letter with: merchant header, processor address, subject line, transaction verification, narrative defense tailored to the reason code, evidence summary, card network rule references, and formal closing.

Return JSON:
{
  "win_probability": <integer 0-100>,
  "win_outcome": "<Win|Loss|Uncertain>",
  "win_confidence_level": "<High|Medium|Low>",
  "win_confidence_explanation": "<1 sentence>",
  "win_risk_summary": "<2-3 sentence overall assessment>",
  "win_comparable_rate": "<industry avg e.g. '55-65%'>",
  "key_factors": [
    { "factor": "<name>", "impact": "<positive|negative|neutral>", "description": "<1 sentence>", "weight": "<High|Medium|Low>" }
  ],
  "improvement_actions": [
    { "action": "<action>", "impact": "<e.g. +5-10%>", "priority": "<Critical|High|Medium|Low>", "category": "<Evidence|Documentation|Process|Timing>" }
  ],
  "category": { "label": "<short category>", "confidence": "<High|Medium|Low>", "explanation": "<1-2 sentences>" },
  "evidenceSuggestions": [
    { "type": "<evidence type>", "reason": "<why it helps>", "priority": "<High|Medium|Low>" }
  ],
  "coverLetterDraft": "<complete professional letter>"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          win_probability: { type: "number" },
          win_outcome: { type: "string" },
          win_confidence_level: { type: "string" },
          win_confidence_explanation: { type: "string" },
          win_risk_summary: { type: "string" },
          win_comparable_rate: { type: "string" },
          key_factors: { type: "array", items: { type: "object", properties: { factor: { type: "string" }, impact: { type: "string" }, description: { type: "string" }, weight: { type: "string" } } } },
          improvement_actions: { type: "array", items: { type: "object", properties: { action: { type: "string" }, impact: { type: "string" }, priority: { type: "string" }, category: { type: "string" } } } },
          category: { type: "object", properties: { label: { type: "string" }, confidence: { type: "string" }, explanation: { type: "string" } } },
          evidenceSuggestions: { type: "array", items: { type: "object", properties: { type: { type: "string" }, reason: { type: "string" }, priority: { type: "string" } } } },
          coverLetterDraft: { type: "string" }
        }
      }
    });

    setAnalysis(result);
    onAnalysisComplete?.(result);
    setLoading(false);
  };

  useEffect(() => {
    if (!cachedAnalysis && (dispute.reason_code || dispute.reason_category)) {
      runAnalysis();
    }
  }, []);

  const confidenceColor = {
    High: "text-green-600 bg-green-50 border-green-200",
    Medium: "text-amber-600 bg-amber-50 border-amber-200",
    Low: "text-red-600 bg-red-50 border-red-200",
  };
  const priorityDot = { High: "bg-red-500", Medium: "bg-amber-500", Low: "bg-green-500" };
  const winConfidenceBadge = {
    High: "bg-blue-100 text-blue-700 border-blue-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/60 to-blue-50/40 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-violet-50/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-800">AI Dispute Assistant</p>
          <p className="text-xs text-slate-500">Win prediction · Auto-categorization · Evidence suggestions · Cover letter</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />}
        {!loading && analysis && (
          <button
            onClick={e => { e.stopPropagation(); runAnalysis(); }}
            className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-500 transition-colors"
            title="Re-analyze"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-violet-500 animate-pulse" />
              </div>
              <p className="text-sm text-slate-500">Analyzing dispute with AI...</p>
              <p className="text-xs text-slate-400">Predicting outcome · Categorizing · Checking evidence · Drafting cover letter</p>
            </div>
          )}

          {/* No data yet */}
          {!loading && !analysis && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-slate-500">Run AI analysis to get win prediction and intelligent suggestions.</p>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={runAnalysis}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Analyze Dispute
              </Button>
            </div>
          )}

          {/* Results */}
          {!loading && analysis && (
            <div className="space-y-4">

              {/* ── Win Prediction Section ── */}
              {!dismissed.winPrediction && (
                <div className="rounded-xl border border-blue-200 bg-white/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Win Prediction</p>
                    </div>
                    <button onClick={() => setDismissed(d => ({ ...d, winPrediction: true }))} className="text-slate-300 hover:text-slate-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    {/* Gauge */}
                    <div className="flex justify-center">
                      <GaugeMeter score={analysis.win_probability || 0} />
                    </div>

                    {/* Summary */}
                    <div className="sm:col-span-2 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {analysis.win_outcome === "Win" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs px-2.5 py-0.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Likely Win</Badge>
                        ) : analysis.win_outcome === "Loss" ? (
                          <Badge className="bg-red-100 text-red-800 border-0 text-xs px-2.5 py-0.5 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Likely Loss</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-0 text-xs px-2.5 py-0.5 flex items-center gap-1"><Minus className="w-3 h-3" /> Uncertain</Badge>
                        )}
                        <Badge className={`text-xs px-2 py-0.5 rounded-full border ${winConfidenceBadge[analysis.win_confidence_level] || winConfidenceBadge.Low}`}>
                          <ShieldCheck className="w-3 h-3 inline mr-1" />{analysis.win_confidence_level} Confidence
                        </Badge>
                        {analysis.win_comparable_rate && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Industry avg: {analysis.win_comparable_rate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{analysis.win_confidence_explanation}</p>
                      {analysis.win_risk_summary && (
                        <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-blue-200 pl-3">{analysis.win_risk_summary}</p>
                      )}
                    </div>
                  </div>

                  {/* Key Factors */}
                  {analysis.key_factors?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Key Factors</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysis.key_factors.map((f, i) => {
                          const Icon = FACTOR_ICONS[f.impact] || Minus;
                          const color = FACTOR_COLORS[f.impact] || FACTOR_COLORS.neutral;
                          return (
                            <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${color}`}>
                              <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="font-semibold">{f.factor}</span>
                                  <span className="text-[10px] opacity-60">{f.weight}</span>
                                </div>
                                <p className="opacity-80 leading-relaxed">{f.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Improvement Actions */}
                  {analysis.improvement_actions?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-500" /> Actions to Improve Win Probability
                      </p>
                      <div className="space-y-1.5">
                        {analysis.improvement_actions.map((a, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-slate-100">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.Low}`}>{a.priority}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className="text-xs font-semibold text-slate-800">{a.action}</p>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[a.category] || "bg-slate-50 text-slate-500 border-slate-200"}`}>{a.category}</span>
                              </div>
                              <p className="text-[11px] text-emerald-700 font-semibold">{a.impact}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Other cards: Category, Evidence, Cover Letter ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Category */}
                {!dismissed.category && (
                  <AICard icon={Tag} title="Auto-Categorization" accent="border-violet-200 bg-white/70">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{analysis.category?.label}</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{analysis.category?.explanation}</p>
                      </div>
                      <button onClick={() => setDismissed(d => ({ ...d, category: true }))} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {analysis.category?.confidence && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${confidenceColor[analysis.category.confidence] || "text-slate-600 bg-slate-50 border-slate-200"}`}>
                        <CheckCircle className="w-3 h-3" /> {analysis.category.confidence} Confidence
                      </span>
                    )}
                  </AICard>
                )}

                {/* Evidence Suggestions */}
                {!dismissed.evidence && (
                  <AICard icon={FileSearch} title="Evidence Suggestions" accent="border-blue-200 bg-white/70">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs text-slate-500">Recommended evidence for this dispute type:</p>
                      <button onClick={() => setDismissed(d => ({ ...d, evidence: true }))} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(analysis.evidenceSuggestions || []).slice(0, 5).map((s, i) => {
                        const alreadyUploaded = evidence.some(e => e.evidence_type === s.type);
                        return (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[s.priority] || "bg-slate-400"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-slate-800">{s.type}</span>
                                {alreadyUploaded && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Uploaded</span>}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{s.reason}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button size="sm" variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 mt-1"
                      onClick={() => onTabSwitch("evidence")}>
                      Go to Evidence Tab →
                    </Button>
                  </AICard>
                )}

                {/* Cover Letter Draft */}
                {!dismissed.coverLetter && (
                  <AICard icon={FileEdit} title="Cover Letter Draft" accent="border-emerald-200 bg-white/70 lg:col-span-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-500">AI-drafted cover letter ready to use or customize:</p>
                      <button onClick={() => setDismissed(d => ({ ...d, coverLetter: true }))} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto border border-slate-200">
                      <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{(analysis.coverLetterDraft || "").slice(0, 400)}...</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => { onApplyCoverLetter(analysis.coverLetterDraft); onTabSwitch("cover_letter"); }}>
                        <FileEdit className="w-3.5 h-3.5 mr-1" /> Apply to Editor
                      </Button>
                      <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => onTabSwitch("cover_letter")}>
                        Preview
                      </Button>
                    </div>
                  </AICard>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}