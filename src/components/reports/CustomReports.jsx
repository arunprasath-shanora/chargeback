import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { FileText, Play, TrendingUp as TrendingUpIcon } from "lucide-react";

const COLORS = ["#0D50B8", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#ef4444", "#14b8a6"];

const METRICS = [
  { value: "volume", label: "Dispute Volume (Count)" },
  { value: "cb_amount", label: "Chargeback Amount ($)" },
  { value: "win_rate", label: "Win Rate (%)" },
  { value: "win_rate_amt", label: "Win Rate by Amount (%)" },
  { value: "won_amt", label: "Won Amount ($)" },
  { value: "recovery", label: "Recovered Amount ($)" },
];

// Fields that influence win rate — used in win rate analysis mode
const WIN_RATE_INFLUENCER_FIELDS = [
  { value: "reason_category", label: "Reason Category" },
  { value: "processor", label: "Processor" },
  { value: "card_network", label: "Card Network" },
  { value: "card_type", label: "Card Type" },
  { value: "status", label: "Status" },
  { value: "business_unit", label: "Business Unit" },
  { value: "case_type", label: "Case Type" },
  { value: "fought_decision", label: "Fought Decision" },
  { value: "not_fought_reason", label: "Not Fought Reason" },
  { value: "authorization_type", label: "Authorization Type" },
  { value: "product_type", label: "Product Type" },
  { value: "avs_match", label: "AVS Match" },
  { value: "cvv_match", label: "CVV Match" },
  { value: "three_d_secure", label: "3D Secure" },
  { value: "transaction_country", label: "Transaction Country" },
  { value: "customer_type", label: "Customer Type" },
  { value: "sale_type", label: "Sale Type" },
  { value: "missing_evidence", label: "Missing Evidence" },
];

const GROUP_BY = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "reason_category", label: "Reason Category" },
  { value: "processor", label: "Processor" },
  { value: "card_network", label: "Card Network" },
  { value: "card_type", label: "Card Type" },
  { value: "status", label: "Status" },
  { value: "business_unit", label: "Business Unit" },
  { value: "case_type", label: "Case Type" },
  { value: "fought_decision", label: "Fought Decision" },
  { value: "product_type", label: "Product Type" },
  { value: "transaction_country", label: "Transaction Country" },
];

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "area", label: "Area Chart" },
  { value: "pie", label: "Pie Chart" },
];

function getPeriodKey(date, groupBy) {
  const d = new Date(date);
  if (isNaN(d)) return null;
  if (groupBy === "month") {
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[d.getMonth()]}-${d.getFullYear()}`;
  }
  if (groupBy === "quarter") return `Q${Math.ceil((d.getMonth() + 1) / 3)}-${d.getFullYear()}`;
  if (groupBy === "year") return `${d.getFullYear()}`;
  return null;
}

function computeMetric(disputes, metric) {
  const won = disputes.filter(d => d.status === "won");
  const lost = disputes.filter(d => d.status === "lost");
  const total = won.length + lost.length;
  const cbAmt = disputes.reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);
  const wonAmt = won.reduce((s, d) => s + (d.chargeback_amount_usd || d.chargeback_amount || 0), 0);
  const recov = disputes.reduce((s, d) => s + (d.recovery_amount || 0), 0);
  if (metric === "volume") return disputes.length;
  if (metric === "cb_amount") return parseFloat((cbAmt / 1000).toFixed(2));
  if (metric === "win_rate") return total > 0 ? parseFloat(((won.length / total) * 100).toFixed(1)) : 0;
  if (metric === "win_rate_amt") return cbAmt > 0 ? parseFloat(((wonAmt / cbAmt) * 100).toFixed(1)) : 0;
  if (metric === "won_amt") return parseFloat((wonAmt / 1000).toFixed(2));
  if (metric === "recovery") return parseFloat((recov / 1000).toFixed(2));
  return 0;
}

function buildChartData(disputes, metric, groupBy) {
  const isPeriod = ["month", "quarter", "year"].includes(groupBy);
  const grouped = {};

  disputes.forEach(d => {
    let key;
    if (isPeriod) {
      key = getPeriodKey(d.chargeback_date || d.created_date, groupBy);
      if (!key) return;
    } else {
      key = d[groupBy] || "Unknown";
    }
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  let entries = Object.entries(grouped).map(([key, items]) => ({
    name: key,
    value: computeMetric(items, metric),
    count: items.length,
  }));

  if (isPeriod) {
    // Sort chronologically
    entries.sort((a, b) => {
      const parseKey = k => {
        if (groupBy === "year") return new Date(`${k}-01-01`);
        if (groupBy === "quarter") {
          const [q, y] = k.split("-");
          return new Date(`${y}-${(parseInt(q[1]) - 1) * 3 + 1}-01`);
        }
        return new Date(`01-${k}`);
      };
      return parseKey(a.name) - parseKey(b.name);
    });
  } else {
    entries.sort((a, b) => b.value - a.value);
  }

  return entries;
}

function formatValue(val, metric) {
  if (metric === "win_rate" || metric === "win_rate_amt") return `${val}%`;
  if (["cb_amount", "won_amt", "recovery"].includes(metric)) return `$${val}K`;
  return val.toLocaleString();
}

// ── Win Rate by influencer field ──
function buildWinRateInfluencerData(disputes, field) {
  const grouped = {};
  disputes.forEach(d => {
    const key = d[field] || "Unknown";
    if (!grouped[key]) grouped[key] = { won: 0, lost: 0, wonAmt: 0, totalAmt: 0, count: 0 };
    grouped[key].count++;
    const amt = d.chargeback_amount_usd || d.chargeback_amount || 0;
    grouped[key].totalAmt += amt;
    if (d.status === "won") { grouped[key].won++; grouped[key].wonAmt += amt; }
    if (d.status === "lost") grouped[key].lost++;
  });
  return Object.entries(grouped)
    .map(([name, v]) => {
      const total = v.won + v.lost;
      return {
        name,
        winRate: total > 0 ? parseFloat(((v.won / total) * 100).toFixed(1)) : 0,
        winRateAmt: v.totalAmt > 0 ? parseFloat(((v.wonAmt / v.totalAmt) * 100).toFixed(1)) : 0,
        count: v.count,
        won: v.won,
      };
    })
    .filter(r => r.count >= 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export default function CustomReports({ disputes }) {
  const [mode, setMode] = useState("standard"); // "standard" | "winrate"
  const [metric, setMetric] = useState("volume");
  const [groupBy, setGroupBy] = useState("month");
  const [chartType, setChartType] = useState("bar");
  const [wrField, setWrField] = useState("reason_category");
  const [wrChartType, setWrChartType] = useState("bar");
  const [hasRun, setHasRun] = useState(false);
  const [runConfig, setRunConfig] = useState(null);

  const handleRun = () => {
    setRunConfig({ metric, groupBy, chartType, mode, wrField, wrChartType });
    setHasRun(true);
  };

  const chartData = useMemo(() => {
    if (!runConfig) return [];
    return buildChartData(disputes, runConfig.metric, runConfig.groupBy);
  }, [disputes, runConfig]);

  const metricLabel = METRICS.find(m => m.value === runConfig?.metric)?.label || "";
  const groupLabel = GROUP_BY.find(g => g.value === runConfig?.groupBy)?.label || "";

  const tooltipFormatter = (val) => [formatValue(val, runConfig?.metric || "volume"), metricLabel];

  const renderChart = () => {
    if (chartData.length === 0) return <p className="text-slate-400 text-sm text-center py-16">No data for selected criteria</p>;

    if (runConfig.chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={110} paddingAngle={2}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={true} fontSize={11}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (runConfig.chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Line dataKey="value" stroke="#0D50B8" strokeWidth={2.5} dot={{ r: 4, fill: "#0D50B8" }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (runConfig.chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="crGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D50B8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0D50B8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Area dataKey="value" stroke="#0D50B8" strokeWidth={2.5} fill="url(#crGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // bar (default)
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-5">
      {/* Builder */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Custom Report Builder
          </CardTitle>
          <p className="text-[11px] text-slate-400 mt-0.5">Select a metric, grouping, and chart type — then run the report</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1.5">Metric</label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="h-9 text-xs border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRICS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1.5">Group By</label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="h-9 text-xs border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_BY.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1.5">Chart Type</label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="h-9 text-xs border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <button onClick={handleRun}
            className="flex items-center gap-2 px-5 py-2 bg-[#0D50B8] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm">
            <Play className="w-3.5 h-3.5" />
            Run Report
          </button>
        </CardContent>
      </Card>

      {/* Result */}
      {hasRun && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                {metricLabel} — by {groupLabel}
              </CardTitle>
              <div className="flex gap-2 items-center">
                <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{chartData.length} groups · {disputes.length} disputes</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart()}
            {/* Summary table */}
            {chartData.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-2 text-slate-500 font-semibold">{groupLabel}</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-semibold">{metricLabel}</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-semibold">Dispute Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-1.5 px-2 text-slate-700 font-medium">{row.name}</td>
                        <td className="py-1.5 px-2 text-right text-slate-600">{formatValue(row.value, runConfig.metric)}</td>
                        <td className="py-1.5 px-2 text-right text-slate-400">{row.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}