import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Area, Line, ReferenceLine, Legend, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

const COLORS = ["#0D50B8", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4"];

function fmtMonthYear(date) {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${m[date.getMonth()]}-${String(date.getFullYear()).slice(2)}`;
}

function getDelta(curr, prev) {
  if (!prev || prev === 0) return null;
  return parseFloat(((curr - prev) / prev * 100).toFixed(1));
}

function getLast6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: fmtMonthYear(d), year: d.getFullYear(), month: d.getMonth() };
  });
}

function linearForecast(data, steps = 3) {
  const n = data.length;
  if (n < 2) return Array(steps).fill(data[0] || 0);
  const xs = data.map((_, i) => i);
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = data.reduce((s, y) => s + y, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (data[i] - meanY), 0);
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  return Array.from({ length: steps }, (_, i) => Math.max(0, Math.round(intercept + slope * (n + i))));
}

const MoMBadge = ({ delta }) => {
  if (delta === null) return <span className="text-[10px] text-slate-400">—</span>;
  const pos = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pos ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
      {pos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {pos ? "+" : ""}{delta}%
    </span>
  );
};

export default function VolumeAnalyzer({ disputes }) {
  const sixMonths = useMemo(() => getLast6Months(), []);

  const byMonthYear = useMemo(() => {
    const map = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || isNaN(date)) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!map[key]) map[key] = { count: 0, amount: 0 };
      map[key].count++;
      map[key].amount += d.chargeback_amount_usd || d.chargeback_amount || 0;
    });
    return map;
  }, [disputes]);

  const momVolumeData = useMemo(() => {
    return sixMonths.map(({ label, year, month }) => {
      const curr = byMonthYear[`${year}-${month}`] || { count: 0, amount: 0 };
      const prevDate = new Date(year, month - 1, 1);
      const prev = byMonthYear[`${prevDate.getFullYear()}-${prevDate.getMonth()}`] || { count: 0, amount: 0 };
      return { label, current: curr.count, previous: prev.count, delta: getDelta(curr.count, prev.count) };
    });
  }, [sixMonths, byMonthYear]);

  const momAmtData = useMemo(() => {
    return sixMonths.map(({ label, year, month }) => {
      const curr = byMonthYear[`${year}-${month}`] || { count: 0, amount: 0 };
      const prevDate = new Date(year, month - 1, 1);
      const prev = byMonthYear[`${prevDate.getFullYear()}-${prevDate.getMonth()}`] || { count: 0, amount: 0 };
      return { label, currentAmt: Math.round(curr.amount), previousAmt: Math.round(prev.amount), delta: getDelta(curr.amount, prev.amount) };
    });
  }, [sixMonths, byMonthYear]);

  const forecastData = useMemo(() => {
    const actuals = momVolumeData.map(d => d.current);
    const forecasts = linearForecast(actuals, 3);
    const now = new Date();
    const futureLabels = [1, 2, 3].map(i => fmtMonthYear(new Date(now.getFullYear(), now.getMonth() + i, 1)));
    const combined = momVolumeData.map(d => ({ label: d.label, actual: d.current, forecast: null }));
    forecasts.forEach((v, i) => combined.push({ label: futureLabels[i], actual: null, forecast: v }));
    return combined;
  }, [momVolumeData]);

  // ── Volume Insights (after forecast) ──
  const volumeInsights = useMemo(() => {
    const insights = [];
    const actuals = momVolumeData.map(d => d.current);

    // Find highest volume month
    const maxIdx = actuals.reduce((best, v, i) => v > actuals[best] ? i : best, 0);
    if (actuals[maxIdx] > 0) {
      insights.push({
        type: "spike",
        label: momVolumeData[maxIdx].label,
        value: actuals[maxIdx],
        text: `Highest volume month was ${momVolumeData[maxIdx].label} with ${actuals[maxIdx]} disputes.`,
      });
    }

    // Month with biggest positive jump
    let biggestJump = null;
    momVolumeData.forEach(d => {
      if (d.delta !== null && d.delta > 0 && (!biggestJump || d.delta > biggestJump.delta)) biggestJump = d;
    });
    if (biggestJump) {
      insights.push({
        type: "growth",
        label: biggestJump.label,
        value: biggestJump.delta,
        text: `Sharpest MoM increase was in ${biggestJump.label} (+${biggestJump.delta}%). Investigate if seasonal, campaign-driven, or new merchant activity.`,
      });
    }

    // Month with biggest drop
    let biggestDrop = null;
    momVolumeData.forEach(d => {
      if (d.delta !== null && d.delta < 0 && (!biggestDrop || d.delta < biggestDrop.delta)) biggestDrop = d;
    });
    if (biggestDrop) {
      insights.push({
        type: "decline",
        label: biggestDrop.label,
        value: biggestDrop.delta,
        text: `Largest MoM decline was in ${biggestDrop.label} (${biggestDrop.delta}%). This may indicate improved fraud prevention or seasonal effects.`,
      });
    }

    // Consistent growth trend
    const lastThree = actuals.slice(-3);
    if (lastThree.length === 3 && lastThree[0] < lastThree[1] && lastThree[1] < lastThree[2]) {
      insights.push({
        type: "trend",
        label: "Rising Trend",
        value: null,
        text: `Volume has increased for 3 consecutive months. Monitor closely — this sustained growth may require additional analyst capacity.`,
      });
    } else if (lastThree.length === 3 && lastThree[0] > lastThree[1] && lastThree[1] > lastThree[2]) {
      insights.push({
        type: "trend",
        label: "Declining Trend",
        value: null,
        text: `Volume has decreased for 3 consecutive months — a positive sign indicating improved dispute prevention or settlement rates.`,
      });
    }

    // Reason code with biggest volume increase (last 2 vs prior 4)
    const byRC = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || isNaN(date)) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const inRange = sixMonths.some(m => m.year === date.getFullYear() && m.month === date.getMonth());
      if (!inRange) return;
      const rc = d.reason_category || "Other";
      if (!byRC[rc]) byRC[rc] = {};
      byRC[rc][key] = (byRC[rc][key] || 0) + 1;
    });
    let topRC = null;
    Object.entries(byRC).forEach(([rc, vals]) => {
      const counts = sixMonths.map(({ year, month }) => vals[`${year}-${month}`] || 0);
      const recent = counts.slice(-2).reduce((s, v) => s + v, 0) / 2;
      const prior = counts.slice(0, 4).reduce((s, v) => s + v, 0) / 4;
      const pct = prior > 0 ? ((recent - prior) / prior) * 100 : 0;
      if (pct > 20 && (!topRC || pct > topRC.pct)) topRC = { rc, pct: parseFloat(pct.toFixed(1)), recent: Math.round(recent) };
    });
    if (topRC) {
      insights.push({
        type: "rc",
        label: topRC.rc,
        value: topRC.pct,
        text: `"${topRC.rc}" is the fastest-growing reason code (+${topRC.pct}% vs prior avg). Proactively prepare evidence templates for this category.`,
      });
    }

    return insights;
  }, [momVolumeData, disputes, sixMonths]);

  const { rcTrendData, top5RCs } = useMemo(() => {
    const byRC = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || isNaN(date)) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const inRange = sixMonths.some(m => m.year === date.getFullYear() && m.month === date.getMonth());
      if (!inRange) return;
      const rc = d.reason_category || "Other";
      if (!byRC[rc]) byRC[rc] = {};
      byRC[rc][key] = (byRC[rc][key] || 0) + 1;
    });
    const top5 = Object.entries(byRC).sort((a, b) =>
      Object.values(b[1]).reduce((s, n) => s + n, 0) - Object.values(a[1]).reduce((s, n) => s + n, 0)
    ).slice(0, 5).map(([rc]) => rc);
    const data = sixMonths.map(({ label, year, month }) => {
      const key = `${year}-${month}`;
      const row = { label };
      top5.forEach(rc => { row[rc] = byRC[rc]?.[key] || 0; });
      return row;
    });
    return { rcTrendData: data, top5RCs: top5 };
  }, [disputes, sixMonths]);

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
      name, volume: v.total, amount: Math.round(v.amount / 1000),
      winRate: v.won + v.lost > 0 ? Math.round((v.won / (v.won + v.lost)) * 100) : 0,
    })).sort((a, b) => b.volume - a.volume);
  }, [disputes]);

  const totalVolume = disputes.length;
  const thisM = momVolumeData[momVolumeData.length - 1];
  const totalAmt = disputes.reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);

  const insightIconColor = { spike: "text-blue-600 bg-blue-50", growth: "text-red-600 bg-red-50", decline: "text-emerald-600 bg-emerald-50", trend: "text-violet-600 bg-violet-50", rc: "text-amber-600 bg-amber-50" };

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Volume", value: totalVolume.toLocaleString(), sub: "Filtered disputes", color: "from-blue-600 to-blue-700" },
          { label: "This Month", value: thisM?.current?.toLocaleString() ?? "—", sub: thisM?.delta !== null ? `MoM: ${thisM?.delta >= 0 ? "+" : ""}${thisM?.delta}%` : "—", color: "from-indigo-500 to-indigo-700" },
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

      {/* MoM Volume + MoM CB Amount */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">Volume — Current vs Prior Month</CardTitle>
              <span className="text-[10px] font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded-full">MoM</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={momVolumeData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previous" name="Prior Month" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="current" name="Current Month" fill="#0D50B8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-1 mt-2 flex-wrap justify-center">
              {momVolumeData.map(d => (
                <div key={d.label} className="flex flex-col items-center gap-0.5 min-w-[52px]">
                  <span className="text-[9px] text-slate-400">{d.label}</span>
                  <MoMBadge delta={d.delta} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">CB Amount — Current vs Prior Month</CardTitle>
              <span className="text-[10px] font-normal text-violet-600 bg-violet-50 px-2 py-1 rounded-full">MoM</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={momAmtData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v, n) => [`$${v.toLocaleString()}`, n === "currentAmt" ? "Current Month" : "Prior Month"]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previousAmt" name="Prior Month ($)" fill="#c4b5fd" radius={[3, 3, 0, 0]} />
                <Bar dataKey="currentAmt" name="Current Month ($)" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-1 mt-2 flex-wrap justify-center">
              {momAmtData.map(d => (
                <div key={d.label} className="flex flex-col items-center gap-0.5 min-w-[52px]">
                  <span className="text-[9px] text-slate-400">{d.label}</span>
                  <MoMBadge delta={d.delta} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">Volume Trend + 3-Month Linear Forecast</CardTitle>
            <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Linear Regression</span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={forecastData}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D50B8" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0D50B8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v, name) => [v, name === "actual" ? "Actual" : "Forecast"]} />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => v === "actual" ? "Actual" : "Forecast"} />
              <Area dataKey="actual" fill="url(#volGrad)" stroke="none" />
              <Line dataKey="actual" stroke="#0D50B8" strokeWidth={2.5} dot={{ r: 4, fill: "#0D50B8" }} connectNulls={false} />
              <Line dataKey="forecast" stroke="#22c55e" strokeWidth={2.5} strokeDasharray="6 3" dot={<circle r={5} fill="#22c55e" stroke="#fff" strokeWidth={2} />} connectNulls={false} />
              <ReferenceLine x={forecastData[5]?.label} stroke="#94a3b8" strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Volume Insights (after forecast) ── */}
      {volumeInsights.length > 0 && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Volume Insights — Where Is Volume Increasing?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {volumeInsights.map((ins, i) => (
                <div key={i} className="flex gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${insightIconColor[ins.type] || "bg-slate-100 text-slate-500"}`}>
                    {ins.type === "spike" || ins.type === "growth" ? <TrendingUp className="w-3.5 h-3.5" /> : ins.type === "decline" ? <TrendingDown className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-slate-700">{ins.label}</p>
                      {ins.value !== null && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ins.value >= 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {ins.value >= 0 ? "+" : ""}{ins.value}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{ins.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top RC Trend */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Top Reason Code Trend — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          {rcTrendData.length === 0 || top5RCs.length === 0 ? (
            <p className="text-slate-400 text-center py-10 text-sm">No trend data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rcTrendData} barCategoryGap="20%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {top5RCs.map((rc, i) => (
                  <Bar key={rc} dataKey={rc} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={18} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By card network */}
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
    </div>
  );
}