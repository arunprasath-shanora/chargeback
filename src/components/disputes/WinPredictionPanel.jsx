import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Target, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Lightbulb, AlertTriangle, CheckCircle2,
  Minus, BarChart2, ShieldCheck, Info
} from "lucide-react";

const FACTOR_ICONS = {
  positive: CheckCircle2,
  negative: AlertTriangle,
  neutral: Minus,
};
const FACTOR_COLORS = {
  positive: "text-emerald-600 bg-emerald-50 border-emerald-100",
  negative: "text-red-600 bg-red-50 border-red-100",
  neutral: "text-slate-500 bg-slate-50 border-slate-100",
};

function GaugeMeter({ score }) {
  // score 0–100
  const clamped = Math.max(0, Math.min(100, score));
  const angle = -135 + (clamped / 100) * 270; // -135 to +135 degrees
  const color = clamped >= 65 ? "#16a34a" : clamped >= 40 ? "#d97706" : "#dc2626";
  const label = clamped >= 65 ? "Likely Win" : clamped >= 40 ? "Uncertain" : "Likely Loss";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-36 h-20 overflow-hidden">
        {/* Background arc */}
        <svg viewBox="0 0 140 80" className="absolute inset-0 w-full h-full">
          <path d="M10,75 A60,60 0 1,1 130,75" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
          {/* Colored arc - draw proportional */}
          <path
            d="M10,75 A60,60 0 1,1 130,75"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * 188} 188`}
            style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.5s ease" }}
          />
          {/* Needle */}
          <g transform={`translate(70,75) rotate(${angle})`}>
            <line x1="0" y1="0" x2="0" y2="-48" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ transition: "transform 0.8s ease" }} />
            <circle cx="0" cy="0" r="4" fill={color} />
          </g>
        </svg>
      </div>
      <div className="flex flex-col items-center -mt-2">
        <span className="text-3xl font-extrabold" style={{ color }}>{clamped}%</span>
        <span className="text-xs font-semibold mt-0.5" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

export default function WinPredictionPanel({ dispute, evidence, evidenceTypes }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  const runPrediction = async () => {
    setLoading(true);
    setPrediction(null);

    const uploadedEvidence = [...new Set(evidence.map(e => e.evidence_type))];
    const missingEvidence = (evidenceTypes || [])
      .filter(et => et.status === "active" && et.upload_requirement === "mandatory")
      .filter(et => !uploadedEvidence.includes(et.name))
      .map(et => et.name);

    const daysLeft = dispute.sla_deadline
      ? Math.ceil((new Date(dispute.sla_deadline) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const prompt = `You are an expert chargeback dispute analyst with 15+ years of experience. Based on the dispute attributes below, predict the likely win/loss outcome.

DISPUTE ATTRIBUTES:
- Reason Code: ${dispute.reason_code || "Unknown"}
- Reason Category: ${dispute.reason_category || "Unknown"}
- Card Network: ${dispute.card_network || "Unknown"}
- Card Type: ${dispute.card_type || "Unknown"}
- Case Type: ${dispute.case_type || "Unknown"}
- Chargeback Amount: ${dispute.chargeback_currency || "USD"} ${dispute.chargeback_amount || 0}
- Processor: ${dispute.processor || "Unknown"}
- Product Type: ${dispute.product_type || "Unknown"}
- Product Name: ${dispute.product_name || "Unknown"}
- AVS Match: ${dispute.avs_match || "Unknown"}
- CVV Match: ${dispute.cvv_match || "Unknown"}
- 3D Secure: ${dispute.three_d_secure || "Unknown"}
- Authorization Code Present: ${dispute.authorization_code ? "Yes" : "No"}
- ARN Present: ${dispute.arn_number ? "Yes" : "No"}
- Transaction ID Present: ${dispute.transaction_id ? "Yes" : "No"}
- Days Until SLA: ${daysLeft !== null ? daysLeft + " days" : "Unknown"}
- Evidence Already Uploaded: ${uploadedEvidence.length > 0 ? uploadedEvidence.join(", ") : "None"}
- Missing Mandatory Evidence: ${missingEvidence.length > 0 ? missingEvidence.join(", ") : "None"}
- Cover Letter Ready: ${dispute.cover_letter_content && dispute.cover_letter_content.length > 50 ? "Yes" : "No"}
- Customer Contact Date: ${dispute.customer_contact_date || "N/A"}
- Service Start Date: ${dispute.service_start_date || "N/A"}
- Service End Date: ${dispute.service_end_date || "N/A"}

Analyze all factors and return a JSON prediction. Base the win_probability on:
1. Reason code difficulty (fraud vs services vs authorization)
2. Authentication signals (AVS/CVV/3DS)
3. Documentation completeness (auth code, ARN, transaction ID)
4. Evidence uploaded vs required
5. Card network rules for this reason code
6. SLA urgency impact
7. Product type defensibility

Return JSON:
{
  "win_probability": <integer 0-100>,
  "outcome": "<Win|Loss|Uncertain>",
  "confidence_level": "<High|Medium|Low>",
  "confidence_explanation": "<1 sentence on why this confidence level>",
  "key_factors": [
    {
      "factor": "<factor name>",
      "impact": "<positive|negative|neutral>",
      "description": "<1 sentence explaining its impact on win probability>",
      "weight": "<High|Medium|Low>"
    }
  ],
  "improvement_actions": [
    {
      "action": "<specific action to take>",
      "impact": "<how much it improves win probability e.g. +5-10%>",
      "priority": "<Critical|High|Medium|Low>",
      "category": "<Evidence|Documentation|Process|Timing>"
    }
  ],
  "risk_summary": "<2-3 sentence overall assessment of the dispute's strength and key risk factors>",
  "comparable_win_rate": "<industry average win rate for this reason code category e.g. '55-65%'>"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          win_probability: { type: "number" },
          outcome: { type: "string" },
          confidence_level: { type: "string" },
          confidence_explanation: { type: "string" },
          key_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                factor: { type: "string" },
                impact: { type: "string" },
                description: { type: "string" },
                weight: { type: "string" }
              }
            }
          },
          improvement_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                impact: { type: "string" },
                priority: { type: "string" },
                category: { type: "string" }
              }
            }
          },
          risk_summary: { type: "string" },
          comparable_win_rate: { type: "string" }
        }
      }
    });

    setPrediction(result);
    setLoading(false);
  };

  useEffect(() => {
    if (dispute.reason_code || dispute.reason_category) {
      runPrediction();
    }
  }, []);

  const confidenceColors = {
    High: "bg-blue-100 text-blue-700 border-blue-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const priorityColors = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-slate-100 text-slate-500",
  };

  const categoryColors = {
    Evidence: "bg-blue-50 text-blue-700 border-blue-200",
    Documentation: "bg-violet-50 text-violet-700 border-violet-200",
    Process: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Timing: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Target className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-800">AI Win Prediction</p>
          <p className="text-xs text-slate-500">Outcome forecast · Confidence score · Improvement actions</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
        {!loading && prediction && (
          <button
            onClick={e => { e.stopPropagation(); runPrediction(); }}
            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"
            title="Re-run prediction"
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
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-blue-500 animate-pulse" />
              </div>
              <p className="text-sm text-slate-500">Running AI prediction model...</p>
              <p className="text-xs text-slate-400">Analyzing reason code · Authentication signals · Evidence completeness</p>
            </div>
          )}

          {/* No data */}
          {!loading && !prediction && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-slate-500">Run prediction to get an AI-powered win probability score.</p>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={runPrediction}>
                <Target className="w-3.5 h-3.5 mr-1.5" /> Predict Outcome
              </Button>
            </div>
          )}

          {/* Results */}
          {!loading && prediction && (
            <div className="space-y-4">

              {/* Score + Confidence Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {/* Gauge */}
                <div className="sm:col-span-1 flex justify-center">
                  <GaugeMeter score={prediction.win_probability} />
                </div>

                {/* Outcome summary */}
                <div className="sm:col-span-2 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {prediction.outcome === "Win" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs px-3 py-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Likely Win
                      </Badge>
                    ) : prediction.outcome === "Loss" ? (
                      <Badge className="bg-red-100 text-red-800 border-0 text-xs px-3 py-1 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Likely Loss
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-0 text-xs px-3 py-1 flex items-center gap-1">
                        <Minus className="w-3 h-3" /> Uncertain
                      </Badge>
                    )}
                    <Badge className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColors[prediction.confidence_level] || confidenceColors.Low}`}>
                      <ShieldCheck className="w-3 h-3 inline mr-1" />{prediction.confidence_level} Confidence
                    </Badge>
                    {prediction.comparable_win_rate && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Industry avg: {prediction.comparable_win_rate}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{prediction.confidence_explanation}</p>
                  <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-blue-200 pl-3">{prediction.risk_summary}</p>
                </div>
              </div>

              {/* Key Factors */}
              {prediction.key_factors?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Factors</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {prediction.key_factors.map((f, i) => {
                      const Icon = FACTOR_ICONS[f.impact] || Minus;
                      const color = FACTOR_COLORS[f.impact] || FACTOR_COLORS.neutral;
                      return (
                        <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${color}`}>
                          <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-semibold">{f.factor}</span>
                              <span className="text-[10px] opacity-70">{f.weight} impact</span>
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
              {prediction.improvement_actions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Actions to Improve Win Probability
                  </p>
                  <div className="space-y-2">
                    {prediction.improvement_actions.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex-shrink-0 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityColors[a.priority] || priorityColors.Low}`}>
                            {a.priority}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-xs font-semibold text-slate-800">{a.action}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${categoryColors[a.category] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                              {a.category}
                            </span>
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
        </div>
      )}
    </div>
  );
}