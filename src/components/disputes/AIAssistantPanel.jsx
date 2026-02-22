import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ChevronDown, ChevronUp, Loader2,
  Tag, FileSearch, FileEdit, Zap, CheckCircle, RefreshCw, X
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

    const prompt = `You are a senior chargeback dispute analyst and legal writing expert specializing in winning merchant chargeback disputes. Analyze the following dispute thoroughly and return a structured JSON response.

DISPUTE DETAILS:
- Case ID: ${dispute.case_id}
- Case Type: ${dispute.case_type || "Unknown"}
- Reason Code: ${dispute.reason_code || "Unknown"}
- Reason Category: ${dispute.reason_category || "Unknown"}
- Card Network: ${dispute.card_network || "Unknown"}
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
- Available evidence types: ${evTypeNames.join(", ")}

For the coverLetterDraft, write a COMPLETE, ADVANCED, PROFESSIONAL chargeback rebuttal letter structured as follows:
1. Merchant header block (merchant name, address placeholder, date)
2. Processor/Acquirer address block
3. Subject line referencing the case ID, reason code, and card network
4. Opening paragraph: formal identification of the dispute, assert the transaction was legitimate
5. Transaction verification section: detail the authorization data (auth code, date, amount, AVS/CVV/3DS results)
6. Narrative defense section: tailored to the specific reason code category - address the exact chargeback reason with factual rebuttals
7. Evidence summary table: list each piece of evidence being submitted, what it proves, and why it supports the merchant
8. Legal/network rule reference: cite the relevant card network (${dispute.card_network || "Visa/Mastercard"}) chargeback rules and timeframes that support the merchant's position
9. Closing paragraph: formal request to reverse the chargeback and restore funds, with contact information placeholder
10. Professional sign-off

Use actual dispute data wherever available. Do NOT use generic placeholders like [insert here]. The letter should be compelling, fact-based, and structured to maximize the probability of winning the dispute.

Provide your response in this exact JSON format:
{
  "category": {
    "label": "<short category like 'Fraud - Card Not Present' or 'Unauthorized Transaction'>",
    "confidence": "<High | Medium | Low>",
    "explanation": "<1-2 sentences explaining why this category fits>"
  },
  "evidenceSuggestions": [
    { "type": "<evidence type name from available list>", "reason": "<why it helps for this dispute>", "priority": "<High | Medium | Low>" }
  ],
  "coverLetterDraft": "<The complete advanced cover letter as described above>",
  "nextBestAction": {
    "action": "<specific action title>",
    "urgency": "<Critical | High | Medium | Low>",
    "reason": "<why this is the best next step given status and SLA>",
    "steps": ["<step 1>", "<step 2>", "<step 3>"]
  }
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          category: {
            type: "object",
            properties: {
              label: { type: "string" },
              confidence: { type: "string" },
              explanation: { type: "string" }
            }
          },
          evidenceSuggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                reason: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          coverLetterDraft: { type: "string" },
          nextBestAction: {
            type: "object",
            properties: {
              action: { type: "string" },
              urgency: { type: "string" },
              reason: { type: "string" },
              steps: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    setAnalysis(result);
    onAnalysisComplete?.(result);
    setLoading(false);
  };

  // Auto-run once only if no cached analysis exists
  useEffect(() => {
    if (!cachedAnalysis && (dispute.reason_code || dispute.reason_category)) {
      runAnalysis();
    }
  }, []);

  const urgencyColors = {
    Critical: "bg-red-100 text-red-700 border-red-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-green-100 text-green-700 border-green-200",
  };
  const priorityDot = {
    High: "bg-red-500",
    Medium: "bg-amber-500",
    Low: "bg-green-500",
  };
  const confidenceColor = {
    High: "text-green-600 bg-green-50 border-green-200",
    Medium: "text-amber-600 bg-amber-50 border-amber-200",
    Low: "text-red-600 bg-red-50 border-red-200",
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
          <p className="text-xs text-slate-500">Auto-categorization · Evidence suggestions · Cover letter · Next action</p>
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
              <p className="text-xs text-slate-400">Categorizing · Checking evidence · Drafting cover letter · Assessing next action</p>
            </div>
          )}

          {/* No data yet */}
          {!loading && !analysis && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-slate-500">Run AI analysis to get intelligent suggestions for this dispute.</p>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={runAnalysis}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Analyze Dispute
              </Button>
            </div>
          )}

          {/* Results */}
          {!loading && analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* 1. Category */}
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

              {/* 2. Evidence Suggestions */}
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

              {/* 3. Cover Letter Draft */}
              {!dismissed.coverLetter && (
                <AICard icon={FileEdit} title="Cover Letter Draft" accent="border-emerald-200 bg-white/70">
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

              {/* 4. Next Best Action */}
              {!dismissed.nextAction && (
                <AICard icon={Zap} title="Next Best Action" accent="border-orange-200 bg-white/70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-slate-800">{analysis.nextBestAction?.action}</p>
                        {analysis.nextBestAction?.urgency && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${urgencyColors[analysis.nextBestAction.urgency] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {analysis.nextBestAction.urgency}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{analysis.nextBestAction?.reason}</p>
                    </div>
                    <button onClick={() => setDismissed(d => ({ ...d, nextAction: true }))} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {(analysis.nextBestAction?.steps || []).length > 0 && (
                    <ol className="space-y-1.5 mt-1">
                      {analysis.nextBestAction.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}
                </AICard>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}