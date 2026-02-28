import React from "react";

export default function VampSummaryCards({ rows }) {
  const total = rows.length;
  const healthy = rows.filter(r => r.risk === "healthy").length;
  const standard = rows.filter(r => r.risk === "standard").length;
  const excessive = rows.filter(r => r.risk === "excessive").length;

  const valid = rows.filter(r => r.vamp_ratio !== null);
  const avgVamp = valid.length ? valid.reduce((a, b) => a + b.vamp_ratio, 0) / valid.length : null;

  const cards = [
    { label: "Total MID-Months", value: total, color: "text-slate-800", bg: "bg-white border border-slate-200" },
    { label: "Healthy", value: healthy, color: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200" },
    { label: "Standard Risk", value: standard, color: "text-amber-700", bg: "bg-amber-50 border border-amber-200" },
    { label: "Excessive Risk", value: excessive, color: "text-red-700", bg: "bg-red-50 border border-red-200" },
    {
      label: "Avg VAMP Ratio",
      value: avgVamp !== null ? (avgVamp * 100).toFixed(3) + "%" : "—",
      color: avgVamp !== null && avgVamp >= 0.018 ? "text-red-700" : avgVamp !== null && avgVamp >= 0.009 ? "text-amber-700" : "text-slate-800",
      bg: "bg-white border border-slate-200"
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className={`rounded-2xl p-4 shadow-sm ${c.bg}`}>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}