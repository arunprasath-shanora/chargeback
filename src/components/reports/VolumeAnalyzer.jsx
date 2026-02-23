import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, ComposedChart, Area, Legend, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getDelta(curr, prev) {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function DeltaBadge({ delta }) {
  if (delta === null) return null;
  const pos = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${pos ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
      {pos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {pos ? "+" : ""}{delta}%
    </span>
  );
}

const CustomVolumeBar = (props) => {
  const { x, y, width, height, fill, delta } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} />
      {delta !== undefined && delta !== null && (
        <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={9} fontWeight="bold"
          fill={delta >= 0 ? "#16a34a" : "#dc2626"}>
          {delta >= 0 ? "+" : ""}{delta}%
        </text>
      )}
    </g>
  );
};

export default function VolumeAnalyzer({ disputes }) {
  const [compareMode, setCompareMode] = useState("yoy"); // yoy | mom

  const monthlyData = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;

    const byMonthYear = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date) return;
      const m = date.getMonth();
      const y = date.getFullYear();
      const key = `${y}-${m}`;
      if (!byMonthYear[key]) byMonthYear[key] = { count: 0, amount: 0 };
      byMonthYear[key].count += 1;
      byMonthYear[key].amount += d.chargeback_amount_usd || d.chargeback_amount || 0;
    });

    return MONTHS.map((month, i) => {
      const cy = byMonthYear[`${thisYear}-${i}`] || { count: 0, amount: 0 };
      const py = byMonthYear[`${lastYear}-${i}`] || { count: 0, amount: 0 };
      return {
        month,
        current: cy.count,
        previous: py.count,
        currentAmt: Math.round(cy.amount),
        previousAmt: Math.round(py.amount),
        deltaCount: getDelta(cy.count, py.count),
        deltaAmt: getDelta(cy.amount, py.amount),
      };
    }).filter((_, i) => i <= now.getMonth());
  }, [disputes]);

  const networkData = useMemo(() => {
    const nets = {};
    disputes.forEach(d => {
      const n = d.card_network || "Other";
      if (!nets[n]) nets[n] = { won: 0, lost: 0, total: 0, amount: 0 };
      nets[n].total++;
      nets[n].amount += d.chargeback_amount_usd || d.chargeback_amount || 0;
      if (d.status === "won") nets[n].won++;
      if (d.status === "lost") nets[n].lost++;
    });
    return Object.entries(nets).map(([name, v]) => ({
      name,
      volume: v.total,
      amount: Math.round(v.amount / 1000),
      winRate: v.won + v.lost > 0 ? Math.round((v.won / (v.won + v.lost)) * 100) : 0,
    })).sort((a, b) => b.volume - a.volume);
  }, [disputes]);

  const forecastData = useMemo(() => {
    const now = new Date();
    const recent = monthlyData.slice(-3);
    const avgGrowth = recent.length >= 2
      ? recent.slice(1).reduce((s, m, i) => s + getDelta(m.current, recent[i].current || 1), 0) / (recent.length - 1) / 100
      : 0.05;

    const last = monthlyData[monthlyData.length - 1]?.current || 0;
    const nextMonths = [1, 2, 3].map(i => {
      const mIdx = (now.getMonth() + i) % 12;
      return {
        month: MONTHS[mIdx] + " (F)",
        current: Math.round(last * Math.pow(1 + avgGrowth, i)),
        isForecast: true,
      };
    });
    return [...monthlyData, ...nextMonths];
  }, [monthlyData]);

  const reasonTrendData = useMemo(() => {
    const now = new Date();
    const byRC = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || date.getFullYear() !== now.getFullYear()) return;
      const m = date.getMonth();
      const rc = d.reason_category || "Other";
      if (!byRC[rc]) byRC[rc] = Array(12).fill(0);
      byRC[rc][m]++;
    });
    const top5 = Object.entries(byRC).sort((a, b) => b[1].reduce((s, v) => s + v, 0) - a[1].reduce((s, v) => s + v, 0)).slice(0, 5);
    return MONTHS.slice(0, now.getMonth() + 1).map((month, i) => {
      const row = { month };
      top5.forEach(([rc, vals]) => { row[rc] = vals[i]; });
      return row;
    });
  }, [disputes]);

  const rcKeys = useMemo(() => {
    if (!reasonTrendData.length) return [];
    return Object.keys(reasonTrendData[0]).filter(k => k !== "month");
  }, [reasonTrendData]);

  const COLORS = ["#0D50B8", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4"];

  const totalVolume = disputes.length;
  const thisMonthVol = monthlyData[monthlyData.length - 1]?.current || 0;
  const lastMonthVol = monthlyData[monthlyData.length - 2]?.current || 0;
  const momChange = getDelta(thisMonthVol, lastMonthVol);
  const totalAmt = disputes.reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Volume", value: totalVolume.toLocaleString(), sub: "All time disputes", color: "from-blue-600 to-blue-700" },
          { label: "This Month", value: thisMonthVol.toLocaleString(), sub: momChange !== null ? `${momChange >= 0 ? "+" : ""}${momChange}% vs last month` : "—", color: "from-indigo-500 to-indigo-700", delta: momChange },
          { label: "Total CB Amount", value: `$${(totalAmt / 1000).toFixed(1)}K`, sub: "USD equivalent", color: "from-violet-500 to-violet-700" },
          { label: "Avg CB Amount", value: totalVolume > 0 ? `$${(totalAmt / totalVolume).toFixed(0)}` : "$0", sub: "Per dispute", color: "from-sky-500 to-sky-700" },
        ].map(k => (
          <div key={k.label} className={`bg-gradient-to-br ${k.color} rounded-2xl p-4 text-white shadow-lg`}>
            <p className="text-white/70 text-xs font-medium mb-1">{k.label}</p>
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-white/60 text-[11px] mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Volume comparison + forecast */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center justify-between">
              Volume Comparison — CY vs PY
              <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Year-on-Year</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previous" name="Prior Year" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="current" name="Current Year" fill="#0D50B8" radius={[3, 3, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill="#0D50B8" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center justify-between">
              Volume Trend + 3-Month Forecast
              <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">AI Forecast</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={forecastData}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D50B8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0D50B8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v, n, p) => [v, p.payload.isForecast ? "Forecast" : "Actual"]} />
                <Area dataKey="current" fill="url(#volGrad)" stroke="none" />
                <Line dataKey="current" stroke="#0D50B8" strokeWidth={2} dot={(p) =>
                  p.payload.isForecast
                    ? <circle key={p.key} cx={p.cx} cy={p.cy} r={5} fill="#22c55e" stroke="#fff" strokeWidth={2} />
                    : <circle key={p.key} cx={p.cx} cy={p.cy} r={3} fill="#0D50B8" />
                } name="Volume" />
                <ReferenceLine x={monthlyData[monthlyData.length - 1]?.month} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Forecast →", position: "insideTopRight", fontSize: 9, fill: "#94a3b8" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Reason code trend */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Top Reason Code Trend — Monthly</CardTitle>
        </CardHeader>
        <CardContent>
          {reasonTrendData.length === 0 ? (
            <p className="text-slate-400 text-center py-10 text-sm">No trend data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reasonTrendData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {rcKeys.map((rc, i) => (
                  <Bar key={rc} dataKey={rc} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === rcKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By card network */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Volume by Card Network</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {networkData.map((n, i) => (
                <div key={n.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-28 truncate font-medium">{n.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                    <div className="h-full rounded-full flex items-center pl-2"
                      style={{ width: `${Math.max(5, (n.volume / networkData[0]?.volume) * 100)}%`, background: COLORS[i % COLORS.length] }}>
                      <span className="text-[10px] text-white font-bold">{n.volume}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 w-12 text-right">{n.winRate}% WR</span>
                </div>
              ))}
              {networkData.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No data</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">CB Amount — CY vs PY</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={v => [`$${v.toLocaleString()}`, ""]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previousAmt" name="PY Amount ($)" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="currentAmt" name="CY Amount ($)" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}