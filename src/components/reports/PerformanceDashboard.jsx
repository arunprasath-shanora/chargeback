import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Award, Target, CheckCircle2, Lightbulb, AlertTriangle } from "lucide-react";

const COLORS = ["#0D50B8", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#ef4444", "#14b8a6"];

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

function getDelta(curr, prev) {
  if (!prev || prev === 0) return null;
  return parseFloat(((curr - prev) / prev * 100).toFixed(1));
}

function MoMBadge({ delta }) {
  if (delta === null) return <span className="text-[10px] text-slate-400">—</span>;
  const pos = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pos ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
      {pos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {pos ? "+" : ""}{delta}%
    </span>
  );
}

export default function PerformanceDashboard({ disputes }) {
  const sixMonths = useMemo(() => getLast6Months(), []);

  const won = disputes.filter(d => d.status === "won").length;
  const lost = disputes.filter(d => d.status === "lost").length;
  const fought = disputes.filter(d => d.fought_decision === "fought").length;
  const notFought = disputes.filter(d => d.fought_decision === "not_fought").length;
  const winRate = (won + lost) > 0 ? ((won / (won + lost)) * 100).toFixed(1) : "0.0";
  const totalAmt = disputes.reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);
  const wonAmt = disputes.filter(d => d.status === "won").reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);
  const lostAmt = disputes.filter(d => d.status === "lost").reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);
  const recoveredAmt = disputes.reduce((s, d) => s + (d.recovery_amount || 0), 0);
  const winRatePct = totalAmt > 0 ? ((wonAmt / totalAmt) * 100).toFixed(1) : "0.0";

  // Monthly data — last 6 months
  const monthlyData = useMemo(() => {
    const byKey = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || isNaN(date)) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!byKey[key]) byKey[key] = { won: 0, lost: 0, wonAmt: 0, lostAmt: 0, totalAmt: 0, recovered: 0 };
      const amt = d.chargeback_amount_usd || d.chargeback_amount || 0;
      if (d.status === "won") { byKey[key].won++; byKey[key].wonAmt += amt; }
      if (d.status === "lost") { byKey[key].lost++; byKey[key].lostAmt += amt; }
      byKey[key].totalAmt += amt;
      byKey[key].recovered += d.recovery_amount || 0;
    });

    return sixMonths.map(({ label, year, month }, idx) => {
      const m = byKey[`${year}-${month}`] || { won: 0, lost: 0, wonAmt: 0, lostAmt: 0, totalAmt: 0, recovered: 0 };
      const total = m.won + m.lost;
      const wr = total > 0 ? parseFloat(((m.won / total) * 100).toFixed(1)) : 0;
      const wrAmt = m.totalAmt > 0 ? parseFloat(((m.wonAmt / m.totalAmt) * 100).toFixed(1)) : 0;

      let prevWR = 0, prevWRAmt = 0;
      if (idx > 0) {
        const { year: py, month: pm } = sixMonths[idx - 1];
        const prev = byKey[`${py}-${pm}`] || { won: 0, lost: 0, wonAmt: 0, totalAmt: 0 };
        const prevTotal = prev.won + prev.lost;
        prevWR = prevTotal > 0 ? parseFloat(((prev.won / prevTotal) * 100).toFixed(1)) : 0;
        prevWRAmt = prev.totalAmt > 0 ? parseFloat(((prev.wonAmt / prev.totalAmt) * 100).toFixed(1)) : 0;
      }

      return {
        label,
        winRate: wr,
        winRateAmt: wrAmt,
        won: m.won,
        lost: m.lost,
        wonAmt: parseFloat((m.wonAmt / 1000).toFixed(1)),
        lostAmt: parseFloat((m.lostAmt / 1000).toFixed(1)),
        totalAmt: parseFloat((m.totalAmt / 1000).toFixed(1)),
        recovered: parseFloat((m.recovered / 1000).toFixed(1)),
        wrDelta: idx > 0 ? parseFloat((wr - prevWR).toFixed(1)) : null,
        wrAmtDelta: idx > 0 ? parseFloat((wrAmt - prevWRAmt).toFixed(1)) : null,
        recovDelta: idx > 0 ? getDelta(m.recovered, byKey[`${sixMonths[idx-1].year}-${sixMonths[idx-1].month}`]?.recovered || 0) : null,
      };
    });
  }, [disputes, sixMonths]);

  const rcWinRate = useMemo(() => {
    const byRC = {};
    disputes.forEach(d => {
      const rc = d.reason_category || "Others";
      if (!byRC[rc]) byRC[rc] = { won: 0, total: 0, wonAmt: 0, totalAmt: 0 };
      const amt = d.chargeback_amount_usd || d.chargeback_amount || 0;
      byRC[rc].total++;
      byRC[rc].totalAmt += amt;
      if (d.status === "won") { byRC[rc].won++; byRC[rc].wonAmt += amt; }
    });
    return Object.entries(byRC)
      .map(([name, v]) => ({
        name,
        winRate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
        winRateAmt: v.totalAmt > 0 ? Math.round((v.wonAmt / v.totalAmt) * 100) : 0,
        total: v.total, won: v.won,
        wonAmt: Math.round(v.wonAmt / 1000),
        totalAmt: Math.round(v.totalAmt / 1000),
      }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
  }, [disputes]);

  // Win rate influencer model
  const winRateInfluencers = useMemo(() => {
    const recs = [];
    const threshold = 40;

    // By reason code
    rcWinRate.filter(r => r.winRate < threshold && r.total >= 3).forEach(r => {
      recs.push({
        field: "Reason Code",
        value: r.name,
        winRate: r.winRate,
        winRateAmt: r.winRateAmt,
        count: r.total,
        amtAtRisk: r.totalAmt - r.wonAmt,
        rec: `Review cover letter templates and evidence types assigned to "${r.name}" in Project Setup. Current count-based win rate is ${r.winRate}% and amount-based is ${r.winRateAmt}%.`,
      });
    });

    // By card type
    const byCardType = {};
    disputes.forEach(d => {
      const ct = d.card_type || "Other";
      if (!byCardType[ct]) byCardType[ct] = { won: 0, total: 0, wonAmt: 0, totalAmt: 0 };
      byCardType[ct].total++;
      const amt = d.chargeback_amount_usd || d.chargeback_amount || 0;
      byCardType[ct].totalAmt += amt;
      if (d.status === "won") { byCardType[ct].won++; byCardType[ct].wonAmt += amt; }
    });
    Object.entries(byCardType).filter(([, v]) => v.total >= 3).forEach(([ct, v]) => {
      const wr = Math.round((v.won / v.total) * 100);
      const wrAmt = v.totalAmt > 0 ? Math.round((v.wonAmt / v.totalAmt) * 100) : 0;
      if (wr < threshold) {
        recs.push({
          field: "Card Type",
          value: ct,
          winRate: wr,
          winRateAmt: wrAmt,
          count: v.total,
          amtAtRisk: Math.round((v.totalAmt - v.wonAmt) / 1000),
          rec: `"${ct}" card type disputes have low win rates (${wr}% count, ${wrAmt}% amount). Verify if issuer-specific rules apply and tailor evidence accordingly.`,
        });
      }
    });

    // By processor
    const byProc = {};
    disputes.forEach(d => {
      const p = d.processor || "Unknown";
      if (!byProc[p]) byProc[p] = { won: 0, total: 0, wonAmt: 0, totalAmt: 0 };
      byProc[p].total++;
      const amt = d.chargeback_amount_usd || d.chargeback_amount || 0;
      byProc[p].totalAmt += amt;
      if (d.status === "won") { byProc[p].won++; byProc[p].wonAmt += amt; }
    });
    Object.entries(byProc).filter(([, v]) => v.total >= 3).forEach(([p, v]) => {
      const wr = Math.round((v.won / v.total) * 100);
      const wrAmt = v.totalAmt > 0 ? Math.round((v.wonAmt / v.totalAmt) * 100) : 0;
      if (wr < threshold) {
        recs.push({
          field: "Processor",
          value: p,
          winRate: wr,
          winRateAmt: wrAmt,
          count: v.total,
          amtAtRisk: Math.round((v.totalAmt - v.wonAmt) / 1000),
          rec: `Disputes via "${p}" are underperforming (${wr}% win rate by count, ${wrAmt}% by amount). Check portal submission requirements and SLA timing.`,
        });
      }
    });

    return recs.sort((a, b) => a.winRate - b.winRate).slice(0, 6);
  }, [disputes, rcWinRate]);

  const cardTypeData = useMemo(() => {
    const by = {};
    disputes.forEach(d => {
      const ct = d.card_type || "Other";
      if (!by[ct]) by[ct] = { won: 0, lost: 0, total: 0 };
      by[ct].total++;
      if (d.status === "won") by[ct].won++;
      if (d.status === "lost") by[ct].lost++;
    });
    return Object.entries(by).map(([name, v]) => ({
      name, winRate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
      won: v.won, lost: v.lost, total: v.total
    })).sort((a, b) => b.total - a.total);
  }, [disputes]);

  const processorData = useMemo(() => {
    const by = {};
    disputes.forEach(d => {
      const p = d.processor || "Unknown";
      if (!by[p]) by[p] = { won: 0, total: 0, amount: 0, recovered: 0 };
      by[p].total++;
      by[p].amount += d.chargeback_amount_usd || d.chargeback_amount || 0;
      by[p].recovered += d.recovery_amount || 0;
      if (d.status === "won") by[p].won++;
    });
    return Object.entries(by).map(([name, v]) => ({
      name, winRate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
      total: v.total, amount: Math.round(v.amount / 1000),
      recovered: parseFloat((v.recovered / 1000).toFixed(1)),
    })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [disputes]);

  const networkData = useMemo(() => {
    const nets = {};
    disputes.forEach(d => {
      const n = d.card_network || "Other";
      if (!nets[n]) nets[n] = { won: 0, lost: 0, total: 0, amount: 0, recovered: 0 };
      nets[n].total++;
      nets[n].amount += d.chargeback_amount_usd || d.chargeback_amount || 0;
      nets[n].recovered += d.recovery_amount || 0;
      if (d.status === "won") nets[n].won++;
      if (d.status === "lost") nets[n].lost++;
    });
    return Object.entries(nets).map(([name, v]) => ({
      name, volume: v.total, amount: Math.round(v.amount / 1000),
      recovered: parseFloat((v.recovered / 1000).toFixed(1)),
      winRate: v.won + v.lost > 0 ? Math.round((v.won / (v.won + v.lost)) * 100) : 0,
    })).sort((a, b) => b.volume - a.volume);
  }, [disputes]);

  const foughtPieData = [{ name: "Fought", value: fought }, { name: "Not Fought", value: notFought }];

  const KPI = ({ label, value, sub, icon: Icon, color, bg }) => (
    <div className={`${bg} rounded-2xl p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
    </div>
  );

  const lastM = monthlyData[monthlyData.length - 1];

  return (
    <div className="space-y-5">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Win Rate (Count)" value={`${winRate}%`} sub={`${won} won / ${lost} lost`} icon={Award} color="text-blue-700" bg="bg-blue-50" />
        <KPI label="Win Rate ($)" value={`${winRatePct}%`} sub={`$${(wonAmt/1000).toFixed(1)}K won / $${(totalAmt/1000).toFixed(1)}K total`} icon={TrendingUp} color="text-emerald-700" bg="bg-emerald-50" />
        <KPI label="Disputes Fought" value={fought.toLocaleString()} sub={`${notFought} not fought`} icon={Target} color="text-violet-700" bg="bg-violet-50" />
        <KPI label="Recovered" value={`$${(recoveredAmt/1000).toFixed(1)}K`} sub="Recovery amount logged" icon={CheckCircle2} color="text-amber-700" bg="bg-amber-50" />
      </div>

      {/* ── Win Rate Count Trend ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="border-slate-100 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Win Rate (Count) — Won, Lost & Win Rate %</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v, name) => [name === "winRate" ? `${v}%` : v, { winRate: "Win Rate %", won: "Won", lost: "Lost" }[name] || name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => ({ winRate: "Win Rate %", won: "Won", lost: "Lost" }[v] || v)} />
                <Bar yAxisId="left" dataKey="won" name="won" fill="#22c55e" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar yAxisId="left" dataKey="lost" name="lost" fill="#fca5a5" radius={[0, 0, 0, 0]} stackId="a" />
                <Line yAxisId="right" dataKey="winRate" name="winRate" stroke="#0D50B8" strokeWidth={2.5} dot={{ r: 4, fill: "#0D50B8" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex gap-1 mt-2 flex-wrap justify-center">
              {monthlyData.map(d => (
                <div key={d.label} className="flex flex-col items-center gap-0.5 min-w-[52px]">
                  <span className="text-[9px] text-slate-400">{d.label}</span>
                  <MoMBadge delta={d.wrDelta} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Fought vs Not Fought</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={foughtPieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                  paddingAngle={3} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  <Cell fill="#0D50B8" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-xs">
              {foughtPieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: i === 0 ? "#0D50B8" : "#e2e8f0" }} />
                  <span className="text-slate-600">{d.name}: <b>{d.value}</b></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Win Rate $ Trend ── */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Win Rate ($) — Won $, Lost $ & Win Rate % by Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}K`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(v, name) => [name === "winRateAmt" ? `${v}%` : `$${v}K`, { winRateAmt: "Win Rate $%", wonAmt: "Won $K", lostAmt: "Lost $K" }[name] || name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => ({ winRateAmt: "Win Rate $%", wonAmt: "Won ($K)", lostAmt: "Lost ($K)" }[v] || v)} />
              <Bar yAxisId="left" dataKey="wonAmt" name="wonAmt" fill="#22c55e" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar yAxisId="left" dataKey="lostAmt" name="lostAmt" fill="#fca5a5" radius={[0, 0, 0, 0]} stackId="a" />
              <Line yAxisId="right" dataKey="winRateAmt" name="winRateAmt" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-1 mt-2 flex-wrap justify-center">
            {monthlyData.map(d => (
              <div key={d.label} className="flex flex-col items-center gap-0.5 min-w-[52px]">
                <span className="text-[9px] text-slate-400">{d.label}</span>
                <MoMBadge delta={d.wrAmtDelta} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Win rate by RC group — grouped bar chart */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Win Rate by Reason Code Group — Count % & Amount %</CardTitle>
        </CardHeader>
        <CardContent>
          {rcWinRate.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, rcWinRate.length * 42)}>
              <BarChart data={rcWinRate} layout="vertical" barCategoryGap="25%" barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={130} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  formatter={(v, name) => [`${v}%`, name === "winRate" ? "Win Rate (Count)" : "Win Rate (Amount)"]}
                  labelFormatter={label => `${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => v === "winRate" ? "Win Rate % (Count)" : "Win Rate % (Amount)"} />
                <Bar dataKey="winRate" name="winRate" radius={[0, 3, 3, 0]} maxBarSize={14}>
                  {rcWinRate.map((entry, i) => (
                    <Cell key={i} fill={entry.winRate >= 60 ? "#22c55e" : entry.winRate >= 40 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
                <Bar dataKey="winRateAmt" name="winRateAmt" radius={[0, 3, 3, 0]} maxBarSize={14}>
                  {rcWinRate.map((entry, i) => (
                    <Cell key={i} fill={entry.winRateAmt >= 60 ? "#6366f1" : entry.winRateAmt >= 40 ? "#8b5cf6" : "#a855f7"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Win Rate Influencer Recommendations ── */}
      {winRateInfluencers.length > 0 && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Win Rate Recommendations — Where to Improve
            </CardTitle>
            <p className="text-[11px] text-slate-400 mt-1">Fields with win rate below 40% — ranked by count win rate (lowest first)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {winRateInfluencers.map((r, i) => (
                <div key={i} className="flex gap-3 p-3.5 bg-red-50 rounded-xl border border-red-100">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{r.field}</span>
                      <span className="text-xs font-semibold text-slate-700">{r.value}</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">{r.winRate}% count WR</span>
                      <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">{r.winRateAmt}% amt WR</span>
                      <span className="text-[9px] text-slate-400">{r.count} cases · ${r.amtAtRisk}K at risk</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{r.rec}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card type + processor */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Win Rate by Card Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cardTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={65} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={v => [`${v}%`, "Win Rate"]} />
                <Bar dataKey="winRate" name="Win Rate %" radius={[0, 4, 4, 0]}>
                  {cardTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.winRate >= 60 ? "#22c55e" : entry.winRate >= 40 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Volume & Win Rate by Processor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processorData.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-24 truncate font-medium">{p.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full rounded-full flex items-center px-2"
                      style={{ width: `${Math.max(8, (p.total / processorData[0]?.total) * 100)}%`, background: COLORS[i % COLORS.length] }}>
                      <span className="text-[10px] text-white font-bold">{p.total}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold w-16 text-right"
                    style={{ color: p.winRate >= 60 ? "#16a34a" : p.winRate >= 40 ? "#d97706" : "#dc2626" }}>
                    {p.winRate}% WR
                  </span>
                </div>
              ))}
              {processorData.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No data</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}