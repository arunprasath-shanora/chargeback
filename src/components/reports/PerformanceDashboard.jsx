import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, ReferenceLine, Legend, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from "recharts";
import { TrendingUp, TrendingDown, Award, Target, AlertTriangle, CheckCircle2 } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#0D50B8", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#ef4444", "#14b8a6"];
const RC_GROUPS = ["Fraudulent Transaction","Pre-Arbitration","Cancelled Services","Authorization","Services Not Provided","Not As Described","Duplicate Processing","Credit Not Processed","Incorrect Amount","Others"];

export default function PerformanceDashboard({ disputes }) {
  const won = disputes.filter(d => d.status === "won").length;
  const lost = disputes.filter(d => d.status === "lost").length;
  const fought = disputes.filter(d => d.fought_decision === "fought").length;
  const notFought = disputes.filter(d => d.fought_decision === "not_fought").length;
  const winRate = (won + lost) > 0 ? ((won / (won + lost)) * 100).toFixed(1) : "0.0";
  const totalAmt = disputes.reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);
  const wonAmt = disputes.filter(d => d.status === "won").reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);
  const recoveredAmt = disputes.reduce((s, d) => s + (d.recovery_amount || 0), 0);

  // Monthly win rate trend
  const monthlyWinRate = useMemo(() => {
    const now = new Date();
    const byMonth = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || date.getFullYear() !== now.getFullYear()) return;
      const m = date.getMonth();
      if (!byMonth[m]) byMonth[m] = { won: 0, lost: 0, fought: 0, notFought: 0, wonAmt: 0, totalAmt: 0 };
      if (d.status === "won") { byMonth[m].won++; byMonth[m].wonAmt += d.chargeback_amount_usd || d.chargeback_amount || 0; }
      if (d.status === "lost") byMonth[m].lost++;
      if (d.fought_decision === "fought") byMonth[m].fought++;
      if (d.fought_decision === "not_fought") byMonth[m].notFought++;
      byMonth[m].totalAmt += d.chargeback_amount_usd || d.chargeback_amount || 0;
    });
    return MONTHS.slice(0, now.getMonth() + 1).map((month, i) => {
      const m = byMonth[i] || { won: 0, lost: 0, fought: 0, notFought: 0, wonAmt: 0, totalAmt: 0 };
      const total = m.won + m.lost;
      return {
        month,
        winRate: total > 0 ? parseFloat(((m.won / total) * 100).toFixed(1)) : 0,
        fought: m.fought,
        notFought: m.notFought,
        wonAmt: Math.round(m.wonAmt / 1000),
        totalAmt: Math.round(m.totalAmt / 1000),
        won: m.won,
        lost: m.lost,
      };
    });
  }, [disputes]);

  // By reason code group
  const rcWinRate = useMemo(() => {
    const byRC = {};
    disputes.forEach(d => {
      const rc = d.reason_category || "Others";
      if (!byRC[rc]) byRC[rc] = { won: 0, total: 0 };
      byRC[rc].total++;
      if (d.status === "won") byRC[rc].won++;
    });
    return Object.entries(byRC)
      .map(([name, v]) => ({ name, winRate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0, total: v.total, won: v.won }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
  }, [disputes]);

  // By card type
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
      name,
      winRate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
      won: v.won, lost: v.lost, total: v.total
    })).sort((a, b) => b.total - a.total);
  }, [disputes]);

  // By processor
  const processorData = useMemo(() => {
    const by = {};
    disputes.forEach(d => {
      const p = d.processor || "Unknown";
      if (!by[p]) by[p] = { won: 0, total: 0, amount: 0 };
      by[p].total++;
      by[p].amount += d.chargeback_amount_usd || d.chargeback_amount || 0;
      if (d.status === "won") by[p].won++;
    });
    return Object.entries(by).map(([name, v]) => ({
      name,
      winRate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
      total: v.total,
      amount: Math.round(v.amount / 1000),
    })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [disputes]);

  const foughtPieData = [
    { name: "Fought", value: fought },
    { name: "Not Fought", value: notFought },
  ];
  const wonLostPie = [
    { name: "Won", value: won },
    { name: "Lost", value: lost },
  ];

  const KPI = ({ label, value, sub, icon: Icon, color, bg }) => (
    <div className={`${bg} rounded-2xl p-4 border border-opacity-20`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl ${bg.replace("bg-", "bg-").replace("50", "100")} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Overall Win Rate" value={`${winRate}%`} sub={`${won} won / ${lost} lost`} icon={Award} color="text-blue-700" bg="bg-blue-50" />
        <KPI label="Disputes Fought" value={fought.toLocaleString()} sub={`${notFought} not fought`} icon={Target} color="text-violet-700" bg="bg-violet-50" />
        <KPI label="Total CB Amount" value={`$${(totalAmt/1000).toFixed(1)}K`} sub={`$${(wonAmt/1000).toFixed(1)}K won value`} icon={TrendingUp} color="text-emerald-700" bg="bg-emerald-50" />
        <KPI label="Recovered" value={`$${(recoveredAmt/1000).toFixed(1)}K`} sub="Recovery amount logged" icon={CheckCircle2} color="text-amber-700" bg="bg-amber-50" />
      </div>

      {/* Win rate trend + Fought vs Not Fought */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="border-slate-100 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Win Rate Trend — Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthlyWinRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="won" name="Won" fill="#22c55e" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar yAxisId="left" dataKey="lost" name="Lost" fill="#fca5a5" radius={[0, 0, 0, 0]} stackId="a" />
                <Line yAxisId="right" dataKey="winRate" name="Win Rate %" stroke="#0D50B8" strokeWidth={2.5} dot={{ r: 4, fill: "#0D50B8" }} />
              </ComposedChart>
            </ResponsiveContainer>
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
                  paddingAngle={3} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
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

      {/* Win rate by RC group */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Win Rate by Reason Code Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {rcWinRate.map((rc, i) => (
              <div key={rc.name} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-44 truncate">{rc.name}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                  <div className="h-full rounded-full flex items-center justify-between px-2"
                    style={{ width: `${Math.max(8, rc.winRate)}%`, background: rc.winRate >= 60 ? "#22c55e" : rc.winRate >= 40 ? "#f59e0b" : "#ef4444" }}>
                    <span className="text-[10px] text-white font-bold">{rc.winRate}%</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 w-16 text-right">{rc.won}/{rc.total} cases</span>
              </div>
            ))}
            {rcWinRate.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No data</p>}
          </div>
        </CardContent>
      </Card>

      {/* By card type + processor */}
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

      {/* Won value trend */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">$ Value Won vs Total CB Amount — Monthly</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={monthlyWinRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}K`} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={v => [`$${v}K`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="totalAmt" name="Total CB ($K)" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
              <Bar dataKey="wonAmt" name="Won ($K)" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}