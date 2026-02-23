import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ComposedChart, Line, Legend
} from "recharts";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info, Zap, Target, Shield } from "lucide-react";

const COLORS = ["#0D50B8", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#ef4444"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function InsightCard({ icon: Icon, iconBg, iconColor, title, text, badge, badgeColor }) {
  return (
    <div className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          {badge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export default function AIInsights({ disputes }) {
  const won = disputes.filter(d => d.status === "won").length;
  const lost = disputes.filter(d => d.status === "lost").length;
  const winRate = (won + lost) > 0 ? ((won / (won + lost)) * 100) : 0;
  const notFought = disputes.filter(d => d.fought_decision === "not_fought").length;

  // Risk heatmap: reason code group × month
  const riskHeatmap = useMemo(() => {
    const now = new Date();
    const byRC = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || date.getFullYear() !== now.getFullYear()) return;
      const m = MONTHS[date.getMonth()];
      const rc = d.reason_category || "Other";
      if (!byRC[rc]) byRC[rc] = {};
      byRC[rc][m] = (byRC[rc][m] || 0) + 1;
    });
    const topRCs = Object.entries(byRC).sort((a, b) =>
      Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)
    ).slice(0, 5);
    const months = MONTHS.slice(0, now.getMonth() + 1);
    return { topRCs, months };
  }, [disputes]);

  // RC win rate radar
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

  // Best & worst performing RC
  const bestRC = radarData.reduce((best, r) => r.winRate > (best?.winRate || 0) ? r : best, null);
  const worstRC = radarData.reduce((worst, r) => r.winRate < (worst?.winRate ?? 999) ? r : worst, null);

  // SLA risk (disputes due in <5 days)
  const now = new Date();
  const slaAtRisk = disputes.filter(d => {
    if (!d.sla_deadline || d.status === "won" || d.status === "lost" || d.status === "not_fought") return false;
    const days = Math.ceil((new Date(d.sla_deadline) - now) / 86400000);
    return days >= 0 && days <= 5;
  }).length;

  const overdueSla = disputes.filter(d => {
    if (!d.sla_deadline || d.status === "won" || d.status === "lost" || d.status === "not_fought") return false;
    return new Date(d.sla_deadline) < now;
  }).length;

  // Month over month WR trend
  const wrTrend = useMemo(() => {
    const byMonth = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || date.getFullYear() !== now.getFullYear()) return;
      const m = date.getMonth();
      if (!byMonth[m]) byMonth[m] = { won: 0, lost: 0 };
      if (d.status === "won") byMonth[m].won++;
      if (d.status === "lost") byMonth[m].lost++;
    });
    return MONTHS.slice(0, now.getMonth() + 1).map((month, i) => {
      const m = byMonth[i] || { won: 0, lost: 0 };
      const total = m.won + m.lost;
      return { month, winRate: total > 0 ? parseFloat(((m.won / total) * 100).toFixed(1)) : 0 };
    });
  }, [disputes]);

  const wrDelta = wrTrend.length >= 2 ? (wrTrend[wrTrend.length - 1].winRate - wrTrend[wrTrend.length - 2].winRate).toFixed(1) : null;
  const wrImproving = wrDelta !== null && parseFloat(wrDelta) > 0;

  // Not fought opportunity
  const notFoughtAmt = disputes.filter(d => d.fought_decision === "not_fought").reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);

  // Fraud vs non fraud split
  const fraudCodes = disputes.filter(d => d.reason_category === "Fraudulent Transaction").length;
  const fraudPct = disputes.length > 0 ? ((fraudCodes / disputes.length) * 100).toFixed(1) : 0;

  // AI-generated insight text
  const insights = [
    {
      icon: wrImproving ? TrendingUp : TrendingDown,
      iconBg: wrImproving ? "bg-emerald-50" : "bg-red-50",
      iconColor: wrImproving ? "text-emerald-600" : "text-red-600",
      title: "Win Rate Momentum",
      text: wrDelta !== null
        ? `Win rate ${wrImproving ? "improved" : "declined"} by ${Math.abs(wrDelta)}pp this month. ${wrImproving ? "Maintain current evidence quality and SLA compliance." : "Review recent losses — consider improving cover letter templates for weaker reason code groups."}`
        : "Not enough monthly data yet to assess momentum.",
      badge: wrDelta !== null ? `${wrImproving ? "+" : ""}${wrDelta}pp MoM` : null,
      badgeColor: wrImproving ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
    },
    {
      icon: AlertTriangle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      title: "SLA Risk Alert",
      text: slaAtRisk > 0
        ? `${slaAtRisk} dispute${slaAtRisk > 1 ? "s" : ""} are due within 5 days and ${overdueSla > 0 ? `${overdueSla} are already overdue` : "none are overdue yet"}. Prioritise these in the dispute queue immediately.`
        : overdueSla > 0
          ? `${overdueSla} dispute${overdueSla > 1 ? "s" : ""} have passed their SLA deadline. These may no longer be recoverable.`
          : "No SLA risks detected for active disputes. SLA compliance is healthy.",
      badge: slaAtRisk + overdueSla > 0 ? `${slaAtRisk + overdueSla} at risk` : "All Clear",
      badgeColor: slaAtRisk + overdueSla > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
    },
    {
      icon: Target,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      title: "Best Performing Reason Code",
      text: bestRC
        ? `"${bestRC.name}" has the highest win rate at ${bestRC.winRate}%. Use this reason code's evidence and cover letter approach as a benchmark for other categories.`
        : "Not enough won/lost data to identify best performing reason code.",
      badge: bestRC ? `${bestRC.winRate}% WR` : null,
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      icon: Zap,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      title: "Weakest Reason Code",
      text: worstRC && worstRC !== bestRC
        ? `"${worstRC.name}" has only a ${worstRC.winRate}% win rate. Review cover letter templates and evidence types assigned to this group in Project Setup.`
        : "Not enough resolved disputes to identify weakest category.",
      badge: worstRC && worstRC !== bestRC ? `${worstRC.winRate}% WR` : null,
      badgeColor: "bg-red-100 text-red-700",
    },
    {
      icon: Shield,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      title: "Fraud Rate",
      text: `${fraudPct}% of disputes are fraud-related. ${parseFloat(fraudPct) > 40 ? "This is high — consider reviewing fraud prevention tooling with your client." : parseFloat(fraudPct) > 20 ? "Moderate fraud rate. Monitor for issuer pattern changes." : "Fraud rate is low — most disputes are non-fraud category."}`,
      badge: `${fraudPct}% fraud`,
      badgeColor: parseFloat(fraudPct) > 40 ? "bg-red-100 text-red-700" : "bg-violet-100 text-violet-700",
    },
    {
      icon: Info,
      iconBg: "bg-slate-50",
      iconColor: "text-slate-500",
      title: "Not-Fought Opportunity",
      text: notFought > 0
        ? `${notFought} disputes ($${(notFoughtAmt / 1000).toFixed(1)}K) were not fought. Review the "not fought" reason distribution — some may be eligible to fight with improved evidence collection.`
        : "All disputes with a decision have been fought — no missed opportunities detected.",
      badge: notFought > 0 ? `${notFought} cases` : "Optimal",
      badgeColor: notFought > 0 ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700",
    },
  ];

  // Heatmap cell intensity
  const maxVal = useMemo(() => {
    let max = 0;
    riskHeatmap.topRCs.forEach(([, v]) => Object.values(v).forEach(n => { if (n > max) max = n; }));
    return max || 1;
  }, [riskHeatmap]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl text-white shadow-lg">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm">AI Insights & Predictions</p>
          <p className="text-white/70 text-[11px]">Analysing {disputes.length} dispute records — updated in real time</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
          <p className="text-white/60 text-[10px]">Overall Win Rate</p>
        </div>
      </div>

      {/* Insight cards */}
      <div className="grid md:grid-cols-2 gap-3">
        {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
      </div>

      {/* Radar + WR trend */}
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
            <CardTitle className="text-sm font-semibold text-slate-700">Win Rate Trend — Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={wrTrend}>
                <defs>
                  <linearGradient id="wrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D50B8" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0D50B8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={v => [`${v}%`, "Win Rate"]} />
                <Line dataKey="winRate" stroke="#0D50B8" strokeWidth={2.5} dot={{ r: 4, fill: "#0D50B8" }} name="Win Rate %" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk heatmap */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Volume Heatmap — Top Reason Codes × Month
            <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Darker = Higher Volume</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riskHeatmap.topRCs.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-sm">No data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-slate-400 font-medium py-1.5 pr-4 w-44">Reason Code</th>
                    {riskHeatmap.months.map(m => (
                      <th key={m} className="text-center text-slate-400 font-medium py-1.5 px-2 min-w-[48px]">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riskHeatmap.topRCs.map(([rc, vals]) => (
                    <tr key={rc}>
                      <td className="text-slate-600 font-medium py-1.5 pr-4 truncate max-w-[176px]">{rc}</td>
                      {riskHeatmap.months.map(m => {
                        const v = vals[m] || 0;
                        const intensity = Math.round((v / maxVal) * 100);
                        return (
                          <td key={m} className="text-center py-1.5 px-1">
                            <span className="inline-flex items-center justify-center w-10 h-7 rounded-md text-[10px] font-bold"
                              style={{
                                background: v === 0 ? "#f8fafc" : `rgba(13, 80, 184, ${0.1 + (intensity / 100) * 0.85})`,
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
  );
}