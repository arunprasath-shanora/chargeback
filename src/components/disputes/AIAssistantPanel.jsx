import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ChevronDown, ChevronUp, Loader2,
  FileEdit, RefreshCw, X,
  Target, TrendingUp, TrendingDown, Minus, ShieldCheck,
  AlertTriangle, CheckCircle2, Lightbulb, Info
} from "lucide-react";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function GaugeMeter({ score }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 65 ? "#16a34a" : clamped >= 40 ? "#d97706" : "#dc2626";
  const label = clamped >= 65 ? "Likely Win" : clamped >= 40 ? "Uncertain" : "Likely Loss";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-[64px] overflow-hidden">
        <svg viewBox="0 0 140 80" className="absolute inset-0 w-full h-full">
          <path d="M10,75 A60,60 0 1,1 130,75" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
          <path d="M10,75 A60,60 0 1,1 130,75" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * 188} 188`}
            style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.5s ease" }} />
          <g transform={`translate(70,75) rotate(${-135 + (clamped / 100) * 270})`}>
            <line x1="0" y1="0" x2="0" y2="-48" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <circle cx="0" cy="0" r="4" fill={color} />
          </g>
        </svg>
      </div>
      <span className="text-2xl font-extrabold leading-none -mt-1" style={{ color }}>{clamped}%</span>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

const FACTOR_ICONS = { positive: CheckCircle2, negative: AlertTriangle, neutral: Minus };
const FACTOR_COLORS = {
  positive: "text-emerald-700 bg-emerald-50 border-emerald-100",
  negative: "text-red-700 bg-red-50 border-red-100",
  neutral: "text-slate-500 bg-slate-50 border-slate-100",
};
const PRIORITY_COLORS = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-500",
};
const WIN_CONFIDENCE = {
  High: "bg-blue-100 text-blue-700 border-blue-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-slate-100 text-slate-600 border-slate-200",
};

// ── Streamed skeleton while loading ─────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3 py-2">
      <div className="flex gap-4 items-center">
        <div className="w-28 h-20 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}
      </div>
      <div className="h-8 bg-slate-100 rounded-lg w-full" />
    </div>
  );
}

export default function AIAssistantPanel({ dispute, evidenceTypes, evidence, onApplyCoverLetter, onTabSwitch, cachedAnalysis, onAnalysisComplete }) {
  const [open, setOpen] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [insights, setInsights] = useState(cachedAnalysis ? {
    win_probability: cachedAnalysis.win_probability,
    win_outcome: cachedAnalysis.win_outcome,
    win_confidence_level: cachedAnalysis.win_confidence_level,
    win_confidence_explanation: cachedAnalysis.win_confidence_explanation,
    win_risk_summary: cachedAnalysis.win_risk_summary,
    win_comparable_rate: cachedAnalysis.win_comparable_rate,
    key_factors: cachedAnalysis.key_factors,
    improvement_actions: cachedAnalysis.improvement_actions,
    dispute_type: cachedAnalysis.category?.label,
    evidence_gaps: cachedAnalysis.evidenceSuggestions,
  } : null);
  const [coverLetter, setCoverLetter] = useState(cachedAnalysis?.coverLetterDraft || null);

  const runAnalysis = async () => {
    setLoadingInsights(true);
    setInsights(null);
    setCoverLetter(null);
    setLoadingLetter(false);

    const daysLeft = daysUntil(dispute.sla_deadline);
    const uploadedTypes = [...new Set(evidence.map(e => e.evidence_type))];
    const missingMandatory = evidenceTypes
      .filter(et => et.status === "active" && et.upload_requirement === "mandatory")
      .filter(et => !uploadedTypes.includes(et.name))
      .map(et => et.name);

    // ── Call 1: Fast insights (no cover letter) ─────────────────────────────
    const insightsPrompt = `You are a senior chargeback dispute analyst. Analyze this dispute and return a concise, focused JSON with win prediction and actionable insights ONLY. Do not suggest generic evidence like AVS/CVV/3DS results unless they are directly relevant to the specific reason code. Only include evidence types that exist in the available list and are truly relevant to this reason code.

DISPUTE:
- Case ID: ${dispute.case_id}
- Reason Code: ${dispute.reason_code || "Unknown"}
- Reason Category: ${dispute.reason_category || "Unknown"}
- Case Type: ${dispute.case_type || "Unknown"}
- Card Network: ${dispute.card_network || "Unknown"}
- Card Type: ${dispute.card_type || "Unknown"}
- Chargeback Amount: ${dispute.chargeback_currency || "USD"} ${dispute.chargeback_amount || 0}
- Transaction Date: ${dispute.transaction_date || "Unknown"}
- Chargeback Date: ${dispute.chargeback_date || "Unknown"}
- Transaction ID: ${dispute.transaction_id || "Unknown"}
- ARN: ${dispute.arn_number || "Unknown"}
- Authorization Code: ${dispute.authorization_code || "Unknown"}
- AVS Match: ${dispute.avs_match || "Unknown"}
- CVV Match: ${dispute.cvv_match || "Unknown"}
- 3D Secure: ${dispute.three_d_secure || "Unknown"}
- Product Type: ${dispute.product_type || "Unknown"}
- Service Start: ${dispute.service_start_date || "N/A"} | End: ${dispute.service_end_date || "N/A"}
- Processor: ${dispute.processor || "Unknown"}
- SLA: ${dispute.sla_deadline || "Unknown"} (${daysLeft !== null ? daysLeft + " days left" : "unknown"})
- Evidence uploaded: ${uploadedTypes.length > 0 ? uploadedTypes.join(", ") : "none"}
- Missing mandatory evidence: ${missingMandatory.length > 0 ? missingMandatory.join(", ") : "none"}
- Available evidence types: ${evidenceTypes.filter(e => e.status === "active").map(e => e.name).join(", ")}

Return JSON (be concise, max 4 key_factors, max 3 improvement_actions, max 4 evidence_gaps — only relevant ones):
{
  "win_probability": <0-100>,
  "win_outcome": "<Win|Loss|Uncertain>",
  "win_confidence_level": "<High|Medium|Low>",
  "win_confidence_explanation": "<1 sentence>",
  "win_risk_summary": "<2 sentences max>",
  "win_comparable_rate": "<e.g. '55-65%'>",
  "dispute_type": "<short dispute category label>",
  "key_factors": [{ "factor": "<name>", "impact": "<positive|negative|neutral>", "description": "<1 sentence>", "weight": "<High|Medium|Low>" }],
  "improvement_actions": [{ "action": "<specific action>", "impact": "<e.g. +5-10%>", "priority": "<Critical|High|Medium|Low>", "category": "<Evidence|Documentation|Process|Timing>" }],
  "evidence_gaps": [{ "type": "<from available list>", "reason": "<why relevant to this specific reason code>", "already_uploaded": false, "priority": "<High|Medium|Low>" }]
}`;

    const insightsSchema = {
      type: "object",
      properties: {
        win_probability: { type: "number" },
        win_outcome: { type: "string" },
        win_confidence_level: { type: "string" },
        win_confidence_explanation: { type: "string" },
        win_risk_summary: { type: "string" },
        win_comparable_rate: { type: "string" },
        dispute_type: { type: "string" },
        key_factors: { type: "array", items: { type: "object", properties: { factor: { type: "string" }, impact: { type: "string" }, description: { type: "string" }, weight: { type: "string" } } } },
        improvement_actions: { type: "array", items: { type: "object", properties: { action: { type: "string" }, impact: { type: "string" }, priority: { type: "string" }, category: { type: "string" } } } },
        evidence_gaps: { type: "array", items: { type: "object", properties: { type: { type: "string" }, reason: { type: "string" }, already_uploaded: { type: "boolean" }, priority: { type: "string" } } } },
      }
    };

    // Run both calls in parallel — insights first renders fast, cover letter streams in
    const letterPromise = base44.integrations.Core.InvokeLLM({
      prompt: `Write a COMPLETE, PROFESSIONAL chargeback rebuttal letter for this dispute.

Dispute: Case ${dispute.case_id}, Reason Code: ${dispute.reason_code || "Unknown"} (${dispute.reason_category || ""}), Card Network: ${dispute.card_network || "Unknown"}, Amount: ${dispute.chargeback_currency || "USD"} ${dispute.chargeback_amount || 0}, Transaction ID: ${dispute.transaction_id || "N/A"}, Auth Code: ${dispute.authorization_code || "N/A"}, ARN: ${dispute.arn_number || "N/A"}, Transaction Date: ${dispute.transaction_date || "N/A"}, Merchant: ${dispute.dba_name || "Unknown"}, Processor: ${dispute.processor || "Unknown"}, Product: ${dispute.product_name || "N/A"} (${dispute.product_type || "N/A"}), Customer: ${dispute.customer_name || "N/A"}, AVS: ${dispute.avs_match || "N/A"}, CVV: ${dispute.cvv_match || "N/A"}, 3DS: ${dispute.three_d_secure || "N/A"}.

Include: merchant header, processor address, subject referencing case/reason/network, transaction verification, narrative defense tailored to the reason code, evidence list, card network rule references, formal closing. Use actual data — no generic placeholders.

Return JSON: { "coverLetterDraft": "<full letter>" }`,
      response_json_schema: { type: "object", properties: { coverLetterDraft: { type: "string" } } }
    });

    try {
      const insightsResult = await base44.integrations.Core.InvokeLLM({
        prompt: insightsPrompt,
        response_json_schema: insightsSchema
      });

      // Mark uploaded evidence
      const gaps = (insightsResult.evidence_gaps || []).map(g => ({
        ...g,
        already_uploaded: uploadedTypes.includes(g.type)
      }));

      const fullInsights = { ...insightsResult, evidence_gaps: gaps };
      setInsights(fullInsights);
      setLoadingInsights(false);

      // Now wait for cover letter in background
      setLoadingLetter(true);
      const letterResult = await letterPromise;
      setCoverLetter(letterResult?.coverLetterDraft || null);
      setLoadingLetter(false);

      onAnalysisComplete?.({ ...fullInsights, coverLetterDraft: letterResult?.coverLetterDraft });
    } catch (e) {
      setLoadingInsights(false);
      setLoadingLetter(false);
    }
  };

  useEffect(() => {
    if (!cachedAnalysis && (dispute.reason_code || dispute.reason_category)) {
      runAnalysis();
    }
  }, []);

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
          <p className="text-xs text-slate-500">Win prediction · Key factors · Evidence gaps · Cover letter</p>
        </div>
        {loadingInsights && <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />}
        {!loadingInsights && insights && (
          <button onClick={e => { e.stopPropagation(); runAnalysis(); }}
            className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-500 transition-colors" title="Re-analyze">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">

          {/* Loading skeleton */}
          {loadingInsights && <LoadingSkeleton />}

          {/* Not started */}
          {!loadingInsights && !insights && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-slate-500">Run AI analysis to get win prediction and recommendations.</p>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={runAnalysis}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Analyze Dispute
              </Button>
            </div>
          )}

          {/* ── Unified AI Insights Panel ── */}
          {!loadingInsights && insights && (
            <div className="space-y-4">

              {/* Row 1: Gauge + Summary + Dispute Type */}
              <div className="rounded-xl border border-blue-200 bg-white/80 p-4">
                <div className="flex items-start gap-5">
                  {/* Gauge */}
                  <div className="flex-shrink-0">
                    <GaugeMeter score={insights.win_probability || 0} />
                  </div>

                  {/* Right side */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Outcome badge */}
                      {insights.win_outcome === "Win" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                          <TrendingUp className="w-3 h-3" /> Likely Win
                        </span>
                      ) : insights.win_outcome === "Loss" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                          <TrendingDown className="w-3 h-3" /> Likely Loss
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                          <Minus className="w-3 h-3" /> Uncertain
                        </span>
                      )}
                      {/* Confidence */}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${WIN_CONFIDENCE[insights.win_confidence_level] || WIN_CONFIDENCE.Low}`}>
                        <ShieldCheck className="w-3 h-3" />{insights.win_confidence_level} Confidence
                      </span>
                      {/* Industry avg */}
                      {insights.win_comparable_rate && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Info className="w-3 h-3" /> Industry avg: {insights.win_comparable_rate}
                        </span>
                      )}
                      {/* Dispute type */}
                      {insights.dispute_type && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                          {insights.dispute_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{insights.win_confidence_explanation}</p>
                    {insights.win_risk_summary && (
                      <p className="text-xs text-slate-500 italic border-l-2 border-blue-200 pl-3 leading-relaxed">{insights.win_risk_summary}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Key Factors */}
              {insights.key_factors?.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white/70 p-4 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Key Factors</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {insights.key_factors.map((f, i) => {
                      const Icon = FACTOR_ICONS[f.impact] || Minus;
                      const color = FACTOR_COLORS[f.impact] || FACTOR_COLORS.neutral;
                      return (
                        <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${color}`}>
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

              {/* Row 3: Evidence Gaps + Improvement Actions side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Evidence Gaps — only relevant ones filtered by AI */}
                {insights.evidence_gaps?.length > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-white/70 p-4 space-y-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Evidence Required</p>
                    <div className="space-y-2">
                      {insights.evidence_gaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${g.priority === "High" ? "bg-red-500" : g.priority === "Medium" ? "bg-amber-500" : "bg-slate-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-800">{g.type}</span>
                              {g.already_uploaded && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">✓ Uploaded</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{g.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 mt-1 text-xs"
                      onClick={() => onTabSwitch("evidence")}>
                      Go to Evidence Tab →
                    </Button>
                  </div>
                )}

                {/* Improvement Actions */}
                {insights.improvement_actions?.length > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-white/70 p-4 space-y-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" /> Actions to Improve Win Chance
                    </p>
                    <div className="space-y-2">
                      {insights.improvement_actions.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-white rounded-lg border border-slate-100">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.Low}`}>{a.priority}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800">{a.action}</p>
                            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">{a.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 4: Cover Letter */}
              <div className="rounded-xl border border-emerald-200 bg-white/70 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-emerald-600" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex-1">AI Cover Letter Draft</p>
                  {loadingLetter && <span className="text-[10px] text-violet-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Drafting...</span>}
                </div>
                {loadingLetter && (
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                    <div className="h-3 bg-slate-100 rounded w-4/6" />
                  </div>
                )}
                {!loadingLetter && coverLetter && (
                  <>
                    <div className="bg-slate-50 rounded-lg p-3 max-h-28 overflow-y-auto border border-slate-200">
                      <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{coverLetter.slice(0, 400)}...</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => { onApplyCoverLetter(coverLetter); onTabSwitch("cover_letter"); }}>
                        <FileEdit className="w-3.5 h-3.5 mr-1" /> Apply to Editor
                      </Button>
                      <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => onTabSwitch("cover_letter")}>
                        Preview
                      </Button>
                    </div>
                  </>
                )}
                {!loadingLetter && !coverLetter && (
                  <p className="text-xs text-slate-400 text-center py-2">Cover letter will appear after analysis.</p>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}