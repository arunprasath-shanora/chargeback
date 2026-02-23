import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend, Area, ReferenceLine
} from "recharts";
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Info, Zap, Target, Shield, Activity, BarChart2, Eye, BrainCircuit
} from "lucide-react";

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtMonthYear(date) {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${m[date.getMonth()]}-${String(date.getFullYear()).slice(2)}`;
}

function getLast6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: fmtMonthYear(d), year: d.getFullYear(), month: d.getMonth() };
  });
}

// Linear regression: returns { slope, intercept, predict(x) }
function linearRegression(ys) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, predict: () => ys[0] || 0 };
  const xs = ys.map((_, i) => i);
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = ys.reduce((s, y) => s + y, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  return { slope, intercept, predict: (x) => Math.max(0, Math.round(intercept + slope * x)) };
}

// Exponential smoothing (alpha=0.4)
function exponentialSmooth(ys, alpha = 0.4) {
  if (!ys.length) return [];
  const smoothed = [ys[0]];
  for (let i = 1; i < ys.length; i++) {
    smoothed.push(alpha * ys[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

// Detect emerging trend: compare last 2 months vs prior 4 months avg
function emergingTrend(counts) {
  if (counts.length < 4) return null;
  const recent = counts.slice(-2).reduce((s, v) => s + v, 0) / 2;
  const baseline = counts.slice(0, counts.length - 2).reduce((s, v) => s + v, 0) / Math.max(1, counts.length - 2);
  const pct = baseline > 0 ? ((recent - baseline) / baseline) * 100 : 0;
  return { recent: Math.round(recent), baseline: Math.round(baseline), pct: parseFloat(pct.toFixed(1)) };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InsightCard({ icon: Icon, iconBg, iconColor, title, text, badge, badgeColor }) {
  return (
    <div className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          {badge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function RiskBadge({ score }) {
  const cfg =
    score >= 75 ? { label: "Critical", bg: "bg-red-100 text-red-700" } :
    score >= 50 ? { label: "High", bg: "bg-orange-100 text-orange-700" } :
    score >= 25 ? { label: "Medium", bg: "bg-amber-100 text-amber-700" } :
    { label: "Low", bg: "bg-emerald-100 text-emerald-700" };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg}`}>{cfg.label} Risk</span>;
}

const SCENARIO_COLORS = { pessimistic: "#ef4444", base: "#0D50B8", optimistic: "#22c55e" };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIInsights({ disputes }) {
  const [activeScenario, setActiveScenario] = useState("base");
  const sixMonths = useMemo(() => getLast6Months(), []);
  const now = new Date();

  const won = disputes.filter(d => d.status === "won").length;
  const lost = disputes.filter(d => d.status === "lost").length;
  const winRate = (won + lost) > 0 ? ((won / (won + lost)) * 100) : 0;
  const notFought = disputes.filter(d => d.fought_decision === "not_fought").length;

  // ── Build monthly lookup ──
  const byKey = useMemo(() => {
    const map = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || isNaN(date)) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!map[key]) map[key] = { count: 0, won: 0, lost: 0, amount: 0 };
      map[key].count++;
      map[key].amount += d.chargeback_amount_usd || d.chargeback_amount || 0;
      if (d.status === "won") map[key].won++;
      if (d.status === "lost") map[key].lost++;
    });
    return map;
  }, [disputes]);

  // ── Historical monthly actuals (last 6 months) ──
  const historicalMonthly = useMemo(() => {
    return sixMonths.map(({ label, year, month }) => {
      const m = byKey[`${year}-${month}`] || { count: 0, won: 0, lost: 0, amount: 0 };
      const total = m.won + m.lost;
      return {
        label,
        volume: m.count,
        winRate: total > 0 ? parseFloat(((m.won / total) * 100).toFixed(1)) : null,
        amount: Math.round(m.amount / 1000),
      };
    });
  }, [sixMonths, byKey]);

  // ── Scenario Forecasting ──
  const scenarioForecast = useMemo(() => {
    const volumes = historicalMonthly.map(m => m.volume);
    const winRates = historicalMonthly.map(m => m.winRate ?? 0);

    const volReg = linearRegression(volumes);
    const wrReg = linearRegression(winRates);
    const smoothedVols = exponentialSmooth(volumes);
    const smoothSlope = smoothedVols.length >= 2
      ? smoothedVols[smoothedVols.length - 1] - smoothedVols[smoothedVols.length - 2]
      : 0;

    const n = volumes.length;
    return [1, 2, 3].map(i => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = fmtMonthYear(d);
      const baseVol = volReg.predict(n + i - 1);
      const baseWR = Math.min(100, Math.max(0, parseFloat(wrReg.predict(n + i - 1).toFixed(1))));

      // Pessimistic: +20% volume, -8pp win rate
      // Base: linear regression
      // Optimistic: -10% volume, +5pp win rate
      return {
        label,
        pessimisticVol: Math.round(baseVol * 1.20),
        baseVol,
        optimisticVol: Math.round(baseVol * 0.90),
        pessimisticWR: Math.max(0, parseFloat((baseWR - 8).toFixed(1))),
        baseWR,
        optimisticWR: Math.min(100, parseFloat((baseWR + 5).toFixed(1))),
        isForecast: true,
      };
    });
  }, [historicalMonthly]);

  const forecastCombined = useMemo(() => {
    const hist = historicalMonthly.map(d => ({
      label: d.label,
      actual: d.volume,
      actualWR: d.winRate,
      baseVol: null, pessimisticVol: null, optimisticVol: null,
      baseWR: null, pessimisticWR: null, optimisticWR: null,
      isForecast: false,
    }));
    return [...hist, ...scenarioForecast];
  }, [historicalMonthly, scenarioForecast]);

  // ── Emerging Trends Detection ──
  const emergingTrends = useMemo(() => {
    const byRC = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || isNaN(date)) return;
      const inRange = sixMonths.some(m => m.year === date.getFullYear() && m.month === date.getMonth());
      if (!inRange) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const rc = d.reason_category || "Other";
      if (!byRC[rc]) byRC[rc] = {};
      byRC[rc][key] = (byRC[rc][key] || 0) + 1;
    });

    return Object.entries(byRC).map(([rc, vals]) => {
      const counts = sixMonths.map(({ year, month }) => vals[`${year}-${month}`] || 0);
      const trend = emergingTrend(counts);
      return { rc, counts, trend };
    })
    .filter(d => d.trend && Math.abs(d.trend.pct) >= 15)
    .sort((a, b) => Math.abs(b.trend.pct) - Math.abs(a.trend.pct))
    .slice(0, 5);
  }, [disputes, sixMonths]);

  // ── High-Risk Dispute Assessment ──
  const highRiskDisputes = useMemo(() => {
    return disputes
      .filter(d => !["won","lost","not_fought"].includes(d.status))
      .map(d => {
        let score = 0;
        const amt = d.chargeback_amount_usd || d.chargeback_amount || 0;
        if (amt > 5000) score += 30;
        else if (amt > 1000) score += 15;

        // SLA days
        if (d.sla_deadline) {
          const days = Math.ceil((new Date(d.sla_deadline) - now) / 86400000);
          if (days < 0) score += 35;
          else if (days <= 3) score += 25;
          else if (days <= 7) score += 10;
        } else {
          score += 10;
        }

        // Fraud category
        if (d.reason_category === "Fraudulent Transaction") score += 15;

        // High-value case types
        if (["Pre-Arbitration","Arbitration"].includes(d.case_type)) score += 20;

        // No evidence assigned
        if (d.missing_evidence === "Yes") score += 15;

        return {
          case_id: d.case_id,
          amount: amt,
          sla_deadline: d.sla_deadline,
          reason_category: d.reason_category || "—",
          case_type: d.case_type || "—",
          status: d.status,
          score: Math.min(100, score),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [disputes]);

  // ── Win rate radar ──
  const radarData = useMemo(() => {
    const byRC = {};
    disputes.forEach(d => {
      const rc = d.reason_category || "Other";
      if (!byRC[rc]) byRC[rc] = { won: 0, total: 0 };
      byRC[rc].total++;
      if (d.status === "won") byRC[rc].won++;
    });
    return Object.entries(byRC)
      .map(([name, v]) => ({ name: name.length > 14 ? name.slice(0, 14) + "…" : name, winRate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0 }))
      .sort((a, b) => b.winRate - a.winRate).slice(0, 8);
  }, [disputes]);

  // ── Insight cards ──
  const bestRC = radarData.reduce((best, r) => r.winRate > (best?.winRate || 0) ? r : best, null);
  const worstRC = radarData.reduce((worst, r) => r.winRate < (worst?.winRate ?? 999) ? r : worst, null);
  const slaAtRisk = disputes.filter(d => {
    if (!d.sla_deadline || ["won","lost","not_fought"].includes(d.status)) return false;
    const days = Math.ceil((new Date(d.sla_deadline) - now) / 86400000);
    return days >= 0 && days <= 5;
  }).length;
  const overdueSla = disputes.filter(d => {
    if (!d.sla_deadline || ["won","lost","not_fought"].includes(d.status)) return false;
    return new Date(d.sla_deadline) < now;
  }).length;
  const wrTrend = historicalMonthly.map(m => m.winRate ?? 0);
  const wrDelta = wrTrend.length >= 2 ? parseFloat((wrTrend[wrTrend.length-1] - wrTrend[wrTrend.length-2]).toFixed(1)) : null;
  const wrImproving = wrDelta !== null && wrDelta > 0;
  const fraudCodes = disputes.filter(d => d.reason_category === "Fraudulent Transaction").length;
  const fraudPct = disputes.length > 0 ? ((fraudCodes / disputes.length) * 100).toFixed(1) : 0;
  const notFoughtAmt = disputes.filter(d => d.fought_decision === "not_fought").reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);

  const insights = [
    {
      icon: wrImproving ? TrendingUp : TrendingDown,
      iconBg: wrImproving ? "bg-emerald-50" : "bg-red-50",
      iconColor: wrImproving ? "text-emerald-600" : "text-red-600",
      title: "Win Rate Momentum",
      text: wrDelta !== null ? `Win rate ${wrImproving ? "improved" : "declined"} by ${Math.abs(wrDelta)}pp MoM. ${wrImproving ? "Maintain current evidence quality and SLA compliance." : "Review recent losses — improve cover letter templates for weaker reason code groups."}` : "Not enough monthly data to assess momentum.",
      badge: wrDelta !== null ? `${wrImproving ? "+" : ""}${wrDelta}pp MoM` : null,
      badgeColor: wrImproving ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
    },
    {
      icon: AlertTriangle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      title: "SLA Risk Alert",
      text: slaAtRisk + overdueSla > 0 ? `${slaAtRisk} dispute${slaAtRisk !== 1 ? "s" : ""} due in ≤5 days${overdueSla > 0 ? ` and ${overdueSla} already overdue` : ""}. Prioritise these immediately.` : "No SLA risks detected — SLA compliance is healthy.",
      badge: slaAtRisk + overdueSla > 0 ? `${slaAtRisk + overdueSla} at risk` : "All Clear",
      badgeColor: slaAtRisk + overdueSla > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
    },
    {
      icon: Target,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      title: "Best Performing Reason Code",
      text: bestRC ? `"${bestRC.name}" leads with ${bestRC.winRate}% win rate. Use its evidence and cover letter approach as a benchmark.` : "Not enough data to identify best performing reason code.",
      badge: bestRC ? `${bestRC.winRate}% WR` : null,
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      icon: Zap,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      title: "Weakest Reason Code",
      text: worstRC && worstRC !== bestRC ? `"${worstRC.name}" has only ${worstRC.winRate}% win rate. Review templates and evidence types in Project Setup.` : "Not enough resolved disputes to identify weakest category.",
      badge: worstRC && worstRC !== bestRC ? `${worstRC.winRate}% WR` : null,
      badgeColor: "bg-red-100 text-red-700",
    },
    {
      icon: Shield,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      title: "Fraud Rate",
      text: `${fraudPct}% of disputes are fraud-related. ${parseFloat(fraudPct) > 40 ? "High — review fraud prevention with your client." : parseFloat(fraudPct) > 20 ? "Moderate — monitor for issuer pattern changes." : "Low — most disputes are non-fraud category."}`,
      badge: `${fraudPct}% fraud`,
      badgeColor: parseFloat(fraudPct) > 40 ? "bg-red-100 text-red-700" : "bg-violet-100 text-violet-700",
    },
    {
      icon: Info,
      iconBg: "bg-slate-50",
      iconColor: "text-slate-500",
      title: "Not-Fought Opportunity",
      text: notFought > 0 ? `${notFought} disputes ($${(notFoughtAmt/1000).toFixed(1)}K) not fought. Some may be eligible with improved evidence collection.` : "All disputes have been fought — no missed opportunities.",
      badge: notFought > 0 ? `${notFought} cases` : "Optimal",
      badgeColor: notFought > 0 ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700",
    },
  ];

  // ── Heatmap ──
  const riskHeatmap = useMemo(() => {
    const byRC = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || isNaN(date)) return;
      const inRange = sixMonths.some(m => m.year === date.getFullYear() && m.month === date.getMonth());
      if (!inRange) return;
      const rc = d.reason_category || "Other";
      if (!byRC[rc]) byRC[rc] = {};
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      byRC[rc][key] = (byRC[rc][key] || 0) + 1;
    });
    const topRCs = Object.entries(byRC).sort((a, b) =>
      Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)
    ).slice(0, 5);
    return { topRCs };
  }, [disputes, sixMonths]);

  const maxHeatVal = useMemo(() => {
    let max = 0;
    riskHeatmap.topRCs.forEach(([, v]) => Object.values(v).forEach(n => { if (n > max) max = n; }));
    return max || 1;
  }, [riskHeatmap]);

  const nextMonth = scenarioForecast[0];

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-600 rounded-2xl text-white shadow-lg">
        <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <BrainCircuit className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">AI Insights & Predictive Analytics</p>
          <p className="text-white/70 text-[11px]">Analysing {disputes.length} dispute records · Linear regression + exponential smoothing · Updated in real time</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
          <p className="text-white/60 text-[10px]">Overall Win Rate</p>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="grid md:grid-cols-2 gap-3">
        {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
      </div>

      {/* ── Section 1: Scenario Volume Forecast ── */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Predictive Volume Forecast — 3 Scenarios
            </CardTitle>
            <div className="flex gap-1.5">
              {["pessimistic","base","optimistic"].map(s => (
                <button key={s} onClick={() => setActiveScenario(s)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${activeScenario === s ? "text-white shadow" : "text-slate-500 bg-slate-100 hover:bg-slate-200"}`}
                  style={{ background: activeScenario === s ? SCENARIO_COLORS[s] : undefined }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            <b>Base:</b> Linear regression on 6-month trend &nbsp;·&nbsp;
            <b>Pessimistic:</b> +20% volume spike &nbsp;·&nbsp;
            <b>Optimistic:</b> −10% volume reduction
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={forecastCombined}>
              <defs>
                <linearGradient id="aiActualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D50B8" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0D50B8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(v, name) => {
                  const labels = { actual: "Actual", baseVol: "Forecast (Base)", pessimisticVol: "Forecast (Pessimistic)", optimisticVol: "Forecast (Optimistic)" };
                  return [v, labels[name] || name];
                }} />
              <Legend wrapperStyle={{ fontSize: 10 }}
                formatter={v => ({ actual: "Actual", baseVol: "Base", pessimisticVol: "Pessimistic", optimisticVol: "Optimistic" }[v] || v)} />
              <Area dataKey="actual" fill="url(#aiActualGrad)" stroke="none" />
              <Line dataKey="actual" stroke="#0D50B8" strokeWidth={2.5} dot={{ r: 4, fill: "#0D50B8" }} connectNulls={false} name="actual" />
              <Line dataKey="baseVol" stroke={SCENARIO_COLORS.base} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: SCENARIO_COLORS.base }} connectNulls={false} name="baseVol" />
              {activeScenario !== "base" && (
                <Line
                  dataKey={activeScenario === "pessimistic" ? "pessimisticVol" : "optimisticVol"}
                  stroke={SCENARIO_COLORS[activeScenario]}
                  strokeWidth={2} strokeDasharray="4 3"
                  dot={{ r: 4, fill: SCENARIO_COLORS[activeScenario] }}
                  connectNulls={false}
                  name={activeScenario === "pessimistic" ? "pessimisticVol" : "optimisticVol"}
                />
              )}
              <ReferenceLine x={historicalMonthly[historicalMonthly.length - 1]?.label} stroke="#94a3b8" strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
          {/* Scenario summary cards */}
          {nextMonth && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: "Pessimistic", vol: nextMonth.pessimisticVol, wr: nextMonth.pessimisticWR, color: "border-red-200 bg-red-50", text: "text-red-700" },
                { label: "Base Case", vol: nextMonth.baseVol, wr: nextMonth.baseWR, color: "border-blue-200 bg-blue-50", text: "text-blue-700" },
                { label: "Optimistic", vol: nextMonth.optimisticVol, wr: nextMonth.optimisticWR, color: "border-emerald-200 bg-emerald-50", text: "text-emerald-700" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
                  <p className="text-[10px] text-slate-500 font-medium mb-1">{s.label} — Next Month</p>
                  <p className={`text-lg font-bold ${s.text}`}>{s.vol} disputes</p>
                  <p className={`text-xs font-semibold ${s.text}`}>{s.wr}% est. win rate</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Win Rate Forecast ── */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Win Rate Forecast — Scenario Comparison
          </CardTitle>
          <p className="text-[11px] text-slate-400">Projected win rate under each scenario for next 3 months</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={forecastCombined}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={v => v !== null ? [`${v}%`, ""] : ["—", ""]} />
              <Legend wrapperStyle={{ fontSize: 10 }}
                formatter={v => ({ actualWR: "Actual WR", baseWR: "Base WR", pessimisticWR: "Pessimistic WR", optimisticWR: "Optimistic WR" }[v] || v)} />
              <Line dataKey="actualWR" stroke="#0D50B8" strokeWidth={2.5} dot={{ r: 4, fill: "#0D50B8" }} connectNulls={false} name="actualWR" />
              <Line dataKey="baseWR" stroke={SCENARIO_COLORS.base} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls={false} name="baseWR" />
              <Line dataKey="pessimisticWR" stroke={SCENARIO_COLORS.pessimistic} strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 3 }} connectNulls={false} name="pessimisticWR" />
              <Line dataKey="optimisticWR" stroke={SCENARIO_COLORS.optimistic} strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 3 }} connectNulls={false} name="optimisticWR" />
              <ReferenceLine x={historicalMonthly[historicalMonthly.length - 1]?.label} stroke="#94a3b8" strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Section 3: Emerging Trends ── */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-500" />
            Emerging Dispute Trends
            <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Last 2 months vs prior 4-month avg</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emergingTrends.length === 0 ? (
            <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              No significant emerging trends detected in the last 6 months.
            </div>
          ) : (
            <div className="space-y-3">
              {emergingTrends.map(({ rc, counts, trend }) => {
                const rising = trend.pct > 0;
                return (
                  <div key={rc} className={`rounded-xl border p-3.5 ${rising ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50"}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {rising ? <TrendingUp className="w-3.5 h-3.5 text-red-600" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />}
                        <span className="text-xs font-semibold text-slate-700">{rc}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rising ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {rising ? "+" : ""}{trend.pct}% vs baseline
                        </span>
                        <span className="text-[10px] text-slate-400">{trend.baseline} → {trend.recent} avg/month</span>
                      </div>
                    </div>
                    {/* Mini sparkline */}
                    <div className="flex items-end gap-1 h-8">
                      {counts.map((v, i) => {
                        const maxC = Math.max(...counts, 1);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full rounded-sm"
                              style={{
                                height: `${Math.max(4, (v / maxC) * 28)}px`,
                                background: i >= counts.length - 2
                                  ? (rising ? "#ef4444" : "#22c55e")
                                  : "#cbd5e1"
                              }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      {sixMonths.map(m => (
                        <span key={m.label} className="text-[8px] text-slate-400 flex-1 text-center">{m.label}</span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {rising
                        ? `⚠ ${rc} disputes are accelerating. Consider proactive evidence preparation and issuer engagement for this category.`
                        : `✓ ${rc} disputes are declining — current strategy appears effective for this reason code group.`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 4: High-Risk Dispute Assessment ── */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-red-500" />
            Proactive Risk Assessment — Active Disputes
            <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Risk scored by amount · SLA · case type · evidence</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {highRiskDisputes.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No active disputes to assess.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-slate-400 font-medium py-2 pr-3">Case ID</th>
                    <th className="text-left text-slate-400 font-medium py-2 pr-3">Reason</th>
                    <th className="text-left text-slate-400 font-medium py-2 pr-3">Type</th>
                    <th className="text-right text-slate-400 font-medium py-2 pr-3">Amount</th>
                    <th className="text-center text-slate-400 font-medium py-2 pr-3">SLA</th>
                    <th className="text-center text-slate-400 font-medium py-2 pr-3">Risk Score</th>
                    <th className="text-center text-slate-400 font-medium py-2">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {highRiskDisputes.map((d, i) => {
                    const daysLeft = d.sla_deadline
                      ? Math.ceil((new Date(d.sla_deadline) - now) / 86400000)
                      : null;
                    return (
                      <tr key={i} className={`hover:bg-slate-50 ${d.score >= 75 ? "bg-red-50/40" : ""}`}>
                        <td className="py-2 pr-3 font-mono text-slate-600 truncate max-w-[100px]">{d.case_id}</td>
                        <td className="py-2 pr-3 text-slate-500 truncate max-w-[120px]">{d.reason_category}</td>
                        <td className="py-2 pr-3 text-slate-500 truncate max-w-[100px]">{d.case_type}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-slate-700">
                          ${d.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 pr-3 text-center">
                          {daysLeft === null
                            ? <span className="text-slate-400">—</span>
                            : daysLeft < 0
                              ? <span className="text-red-600 font-bold">Overdue</span>
                              : <span className={daysLeft <= 3 ? "text-red-600 font-bold" : daysLeft <= 7 ? "text-amber-600 font-semibold" : "text-slate-500"}>
                                  {daysLeft}d
                                </span>
                          }
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{
                                  width: `${d.score}%`,
                                  background: d.score >= 75 ? "#ef4444" : d.score >= 50 ? "#f97316" : d.score >= 25 ? "#f59e0b" : "#22c55e"
                                }} />
                            </div>
                            <span className="font-bold text-slate-600">{d.score}</span>
                          </div>
                        </td>
                        <td className="py-2 text-center"><RiskBadge score={d.score} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-400 mt-3">
                Risk score factors: CB amount (30pts) · SLA proximity (35pts) · Case type complexity (20pts) · Fraud category (15pts) · Missing evidence (15pts). Max 100.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Radar + Heatmap ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Win Rate Radar — by Reason Code</CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length === 0 ? (
              <p className="text-slate-400 text-center py-10 text-sm">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <Radar dataKey="winRate" stroke="#0D50B8" fill="#0D50B8" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={v => [`${v}%`, "Win Rate"]} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              Volume Heatmap — RC × Month
              <span className="text-[9px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Darker = Higher</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskHeatmap.topRCs.length === 0 ? (
              <p className="text-slate-400 text-center py-8 text-sm">No data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left text-slate-400 font-medium py-1.5 pr-2 w-36">Reason Code</th>
                      {sixMonths.map(m => <th key={m.label} className="text-center text-slate-400 font-medium py-1.5 px-1 min-w-[44px]">{m.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {riskHeatmap.topRCs.map(([rc, vals]) => (
                      <tr key={rc}>
                        <td className="text-slate-600 font-medium py-1.5 pr-2 truncate max-w-[140px]">{rc}</td>
                        {sixMonths.map(({ label, year, month }) => {
                          const v = vals[`${year}-${month}`] || 0;
                          const intensity = Math.round((v / maxHeatVal) * 100);
                          return (
                            <td key={label} className="text-center py-1.5 px-0.5">
                              <span className="inline-flex items-center justify-center w-9 h-6 rounded text-[10px] font-bold"
                                style={{
                                  background: v === 0 ? "#f8fafc" : `rgba(13,80,184,${0.1 + (intensity/100)*0.85})`,
                                  color: intensity > 50 ? "#fff" : "#0D50B8"
                                }}>
                                {v || "—"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}