import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle2, Activity } from "lucide-react";

function fmtMonthYear(date) {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${m[date.getMonth()]}-${String(date.getFullYear()).slice(2)}`;
}

function getMonths(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { label: fmtMonthYear(d), year: d.getFullYear(), month: d.getMonth() };
  });
}

// Z-score anomaly detection: flag if |z| > threshold
function detectAnomalies(values, threshold = 1.8) {
  const n = values.length;
  if (n < 3) return values.map(() => false);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return values.map(v => std > 0 ? Math.abs((v - mean) / std) > threshold : false);
}

function SeverityBadge({ type }) {
  if (type === "spike") return <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Spike</span>;
  if (type === "drop") return <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Drop</span>;
  return null;
}

function AnomalyChart({ title, data, dataKey, color, anomalyKey, meanVal, yFormatter }) {
  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={yFormatter} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(v, name) => [yFormatter ? yFormatter(v) : v, name === dataKey ? title : name]} />
            <ReferenceLine y={meanVal} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "avg", fill: "#94a3b8", fontSize: 9, position: "insideTopRight" }} />
            <Bar dataKey={dataKey} radius={[3, 3, 0, 0]}
              fill={color}
              shape={(props) => {
                const isAnomaly = props.payload[anomalyKey];
                return <rect {...props} fill={isAnomaly ? "#ef4444" : color} rx={3} />;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-400 mt-1">Red bars indicate statistical anomalies (z-score &gt; 1.8σ). Dashed line = 12-month average.</p>
      </CardContent>
    </Card>
  );
}

export default function AnomalyDetection({ disputes }) {
  const months12 = useMemo(() => getMonths(12), []);

  const monthlyStats = useMemo(() => {
    const map = {};
    disputes.forEach(d => {
      const date = new Date(d.chargeback_date || d.created_date);
      if (!date || isNaN(date)) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!map[key]) map[key] = { count: 0, amount: 0, won: 0, lost: 0 };
      map[key].count++;
      map[key].amount += d.chargeback_amount_usd || d.chargeback_amount || 0;
      if (d.status === "won") map[key].won++;
      if (d.status === "lost") map[key].lost++;
    });

    return months12.map(({ label, year, month }) => {
      const m = map[`${year}-${month}`] || { count: 0, amount: 0, won: 0, lost: 0 };
      const total = m.won + m.lost;
      return {
        label,
        count: m.count,
        amount: parseFloat((m.amount / 1000).toFixed(1)),
        winRate: total > 0 ? parseFloat(((m.won / total) * 100).toFixed(1)) : 0,
      };
    });
  }, [disputes, months12]);

  // Detect anomalies per metric
  const countAnomalies = useMemo(() => detectAnomalies(monthlyStats.map(m => m.count)), [monthlyStats]);
  const amountAnomalies = useMemo(() => detectAnomalies(monthlyStats.map(m => m.amount)), [monthlyStats]);
  const winRateAnomalies = useMemo(() => detectAnomalies(monthlyStats.map(m => m.winRate)), [monthlyStats]);

  const statsWithFlags = useMemo(() => monthlyStats.map((m, i) => ({
    ...m,
    countAnomaly: countAnomalies[i],
    amountAnomaly: amountAnomalies[i],
    winRateAnomaly: winRateAnomalies[i],
  })), [monthlyStats, countAnomalies, amountAnomalies, winRateAnomalies]);

  // Summary of detected anomalies
  const anomalyEvents = useMemo(() => {
    const events = [];
    const means = {
      count: monthlyStats.reduce((s, m) => s + m.count, 0) / monthlyStats.length,
      amount: monthlyStats.reduce((s, m) => s + m.amount, 0) / monthlyStats.length,
      winRate: monthlyStats.reduce((s, m) => s + m.winRate, 0) / monthlyStats.length,
    };

    statsWithFlags.forEach(m => {
      if (m.countAnomaly) events.push({ month: m.label, metric: "Dispute Volume", value: m.count, mean: Math.round(means.count), type: m.count > means.count ? "spike" : "drop", unit: "" });
      if (m.amountAnomaly) events.push({ month: m.label, metric: "CB Amount", value: `$${m.amount}K`, mean: `$${means.amount.toFixed(1)}K`, type: m.amount > means.amount ? "spike" : "drop", unit: "K" });
      if (m.winRateAnomaly) events.push({ month: m.label, metric: "Win Rate", value: `${m.winRate}%`, mean: `${means.winRate.toFixed(1)}%`, type: m.winRate > means.winRate ? "spike" : "drop", unit: "%" });
    });
    return events.reverse(); // most recent first
  }, [statsWithFlags, monthlyStats]);

  const meanCount = monthlyStats.reduce((s, m) => s + m.count, 0) / Math.max(1, monthlyStats.length);
  const meanAmount = monthlyStats.reduce((s, m) => s + m.amount, 0) / Math.max(1, monthlyStats.length);
  const meanWinRate = monthlyStats.reduce((s, m) => s + m.winRate, 0) / Math.max(1, monthlyStats.length);

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Volume Anomalies", count: countAnomalies.filter(Boolean).length, color: "bg-red-50 text-red-700", icon: AlertTriangle },
          { label: "Amount Anomalies", count: amountAnomalies.filter(Boolean).length, color: "bg-amber-50 text-amber-700", icon: TrendingUp },
          { label: "Win Rate Anomalies", count: winRateAnomalies.filter(Boolean).length, color: "bg-violet-50 text-violet-700", icon: Activity },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className={`rounded-2xl p-4 ${count > 0 ? color.split(" ")[0] : "bg-emerald-50"} border ${count > 0 ? "border-red-100" : "border-emerald-100"}`}>
            <div className="flex items-center gap-2">
              {count > 0 ? <Icon className={`w-4 h-4 ${color.split(" ")[1]}`} /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              <span className="text-xs font-semibold text-slate-700">{label}</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${count > 0 ? color.split(" ")[1] : "text-emerald-700"}`}>{count}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{count === 0 ? "No anomalies in 12 months" : `detected in last 12 months`}</p>
          </div>
        ))}
      </div>

      {/* Anomaly event list */}
      {anomalyEvents.length > 0 && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Detected Anomalies — Last 12 Months
            </CardTitle>
            <p className="text-[11px] text-slate-400 mt-0.5">Statistical outliers detected using z-score analysis (threshold: 1.8σ)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalyEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ev.type === "spike" ? "bg-red-100" : "bg-amber-100"}`}>
                    {ev.type === "spike" ? <TrendingUp className="w-3.5 h-3.5 text-red-600" /> : <TrendingDown className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700">{ev.month}</span>
                      <span className="text-[10px] text-slate-500">{ev.metric}</span>
                      <SeverityBadge type={ev.type} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Observed: <strong>{ev.value}</strong> vs avg <strong>{ev.mean}</strong> — unusual {ev.type === "spike" ? "increase" : "decrease"} detected
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {anomalyEvents.length === 0 && (
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="py-12 flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No anomalies detected</p>
            <p className="text-xs text-slate-400 mt-1">All key metrics are within normal ranges over the last 12 months</p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <AnomalyChart
        title="Monthly Dispute Volume"
        data={statsWithFlags}
        dataKey="count"
        anomalyKey="countAnomaly"
        color="#0D50B8"
        meanVal={parseFloat(meanCount.toFixed(1))}
        yFormatter={v => v}
      />
      <AnomalyChart
        title="Monthly CB Amount ($K)"
        data={statsWithFlags}
        dataKey="amount"
        anomalyKey="amountAnomaly"
        color="#8b5cf6"
        meanVal={parseFloat(meanAmount.toFixed(1))}
        yFormatter={v => `$${v}K`}
      />
      <AnomalyChart
        title="Monthly Win Rate (%)"
        data={statsWithFlags}
        dataKey="winRate"
        anomalyKey="winRateAnomaly"
        color="#22c55e"
        meanVal={parseFloat(meanWinRate.toFixed(1))}
        yFormatter={v => `${v}%`}
      />
    </div>
  );
}