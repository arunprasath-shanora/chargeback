import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const RISK_COLORS = {
  healthy: "#10B981",
  standard: "#F59E0B",
  excessive: "#EF4444",
  unknown: "#94A3B8",
};

export default function VampChart({ rows }) {
  const chartData = rows
    .filter(r => r.vamp_ratio !== null)
    .slice(0, 20)
    .map(r => ({
      name: (r.merchant_alias || r.merchant_id || "").slice(0, 14) + ((r.merchant_alias || r.merchant_id || "").length > 14 ? "…" : ""),
      period: r.period_month,
      vamp: parseFloat((r.vamp_ratio * 100).toFixed(4)),
      risk: r.risk,
    }));

  if (!chartData.length) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-700 mb-1">VAMP Ratio by MID (%) — Top {chartData.length}</p>
      <p className="text-xs text-slate-400 mb-4">Bars show the combined VAMP ratio. Colour indicates risk tier.</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 50 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + "%"} />
          <Tooltip
            formatter={(v) => [`${v}%`, "VAMP Ratio"]}
            labelFormatter={(label, payload) => {
              const p = payload?.[0]?.payload;
              return `${label}${p?.period ? ` · ${p.period}` : ""}`;
            }}
          />
          <ReferenceLine y={0.90} stroke="#F59E0B" strokeDasharray="4 4"
            label={{ value: "0.90% Standard", position: "insideTopRight", fontSize: 9, fill: "#F59E0B" }} />
          <ReferenceLine y={1.80} stroke="#EF4444" strokeDasharray="4 4"
            label={{ value: "1.80% Excessive", position: "insideTopRight", fontSize: 9, fill: "#EF4444" }} />
          <Bar dataKey="vamp" name="VAMP Ratio %" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={RISK_COLORS[entry.risk] || "#94A3B8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}