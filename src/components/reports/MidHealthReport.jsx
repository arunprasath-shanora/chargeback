import React, { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle, XCircle, Info, Download, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

// VAMP thresholds (Visa VAMP effective Apr 2025)
const VAMP_THRESHOLDS = {
  visa: {
    fraud: {
      standard: { count: 0.009, usd: 75000 },   // 0.90%
      excessive: { count: 0.018, usd: 250000 },  // 1.80%
    },
    chargeback: {
      standard: { count: 0.009 },  // 0.90%
      excessive: { count: 0.018 }, // 1.80%
    },
  },
  mastercard: {
    chargeback: {
      standard: { count: 0.01 },   // 1.00% - MCCM
      excessive: { count: 0.015 }, // 1.50% - ECM
    },
  },
};

function getRisk(ratio, network) {
  const thresholds = network?.toLowerCase() === "mastercard"
    ? VAMP_THRESHOLDS.mastercard.chargeback
    : VAMP_THRESHOLDS.visa.chargeback;

  if (ratio >= thresholds.excessive.count) return "excessive";
  if (ratio >= thresholds.standard.count) return "standard";
  return "healthy";
}

const RISK_CONFIG = {
  healthy:   { label: "Healthy",          color: "#10B981", bg: "bg-emerald-50",  text: "text-emerald-700",  badge: "bg-emerald-100 text-emerald-700",  icon: CheckCircle },
  standard:  { label: "Standard Risk",    color: "#F59E0B", bg: "bg-amber-50",   text: "text-amber-700",   badge: "bg-amber-100 text-amber-700",   icon: AlertTriangle },
  excessive: { label: "Excessive Risk",   color: "#EF4444", bg: "bg-red-50",     text: "text-red-700",     badge: "bg-red-100 text-red-700",     icon: XCircle },
};

function exportCSV(rows) {
  const headers = [
    "MID", "Merchant Alias", "Processor", "Card Network", "Transactions (Count)",
    "Transactions ($)", "Chargebacks (Count)", "Chargebacks ($)", "CB Count Ratio (%)",
    "CB Amount Ratio (%)", "Fraud CBs (Count)", "CB Amt USD", "VAMP Risk Level"
  ];
  const lines = [headers.join(","), ...rows.map(r => [
    r.mid, r.alias, r.processor, r.network, r.txnCount, r.txnAmtUsd,
    r.cbCount, r.cbAmtUsd, (r.cbCountRatio * 100).toFixed(4),
    (r.cbAmtRatio * 100).toFixed(4), r.fraudCbCount, r.cbAmtUsd, r.risk
  ].join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "mid_health_report.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function MidHealthReport({ disputes, projects }) {
  const [networkFilter, setNetworkFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("cbCountRatio");
  const [sortDir, setSortDir] = useState("desc");
  const [showManualInput, setShowManualInput] = useState(false);
  // Manual transaction volume overrides keyed by MID
  const [manualTxnCounts, setManualTxnCounts] = useState({});
  const [manualTxnAmounts, setManualTxnAmounts] = useState({});

  // Aggregate chargeback data per MID from disputes
  const midRows = useMemo(() => {
    const map = {};
    disputes.forEach(d => {
      const mid = d.merchant_id || "Unknown";
      if (!map[mid]) {
        map[mid] = {
          mid,
          alias: d.merchant_alias || d.dba_name || d.sub_unit_name || mid,
          processor: d.processor || "—",
          network: d.card_network || "—",
          cbCount: 0, cbAmtUsd: 0, fraudCbCount: 0,
        };
      }
      map[mid].cbCount += 1;
      map[mid].cbAmtUsd += d.chargeback_amount_usd || 0;
      if (d.reason_category?.toLowerCase().includes("fraud") || d.fought_decision === "fought") {
        map[mid].fraudCbCount += 1;
      }
    });

    return Object.values(map).map(r => {
      const txnCount = Number(manualTxnCounts[r.mid]) || null;
      const txnAmtUsd = Number(manualTxnAmounts[r.mid]) || null;
      const cbCountRatio = txnCount ? r.cbCount / txnCount : null;
      const cbAmtRatio = txnAmtUsd ? r.cbAmtUsd / txnAmtUsd : null;
      const fraudRatio = txnCount ? r.fraudCbCount / txnCount : null;
      const risk = cbCountRatio !== null ? getRisk(cbCountRatio, r.network) : "unknown";
      return { ...r, txnCount, txnAmtUsd, cbCountRatio, cbAmtRatio, fraudRatio, risk };
    });
  }, [disputes, manualTxnCounts, manualTxnAmounts]);

  const filtered = useMemo(() => {
    return midRows
      .filter(r => networkFilter === "all" || r.network === networkFilter)
      .filter(r => riskFilter === "all" || r.risk === riskFilter)
      .sort((a, b) => {
        let av = a[sortBy] ?? -Infinity;
        let bv = b[sortBy] ?? -Infinity;
        return sortDir === "desc" ? bv - av : av - bv;
      });
  }, [midRows, networkFilter, riskFilter, sortBy, sortDir]);

  const networks = [...new Set(midRows.map(r => r.network).filter(v => v !== "—"))].sort();
  const summary = {
    total: midRows.length,
    healthy: midRows.filter(r => r.risk === "healthy").length,
    standard: midRows.filter(r => r.risk === "standard").length,
    excessive: midRows.filter(r => r.risk === "excessive").length,
    unknown: midRows.filter(r => r.risk === "unknown").length,
  };

  const chartData = filtered
    .filter(r => r.cbCountRatio !== null)
    .slice(0, 20)
    .map(r => ({
      name: r.alias.length > 12 ? r.alias.slice(0, 12) + "…" : r.alias,
      ratio: parseFloat((r.cbCountRatio * 100).toFixed(3)),
      risk: r.risk,
    }));

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const Th = ({ label, field }) => (
    <th
      className="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-[#0D50B8] transition-colors"
      onClick={() => field && handleSort(field)}
    >
      {label}
      {field && sortBy === field && <span className="ml-1 text-[#0D50B8]">{sortDir === "desc" ? "↓" : "↑"}</span>}
    </th>
  );

  return (
    <div className="space-y-5">
      {/* VAMP Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>VAMP (Visa Acquirer Monitoring Program)</strong> — Effective April 2025, Visa monitors fraud & chargeback ratios per MID.
          Standard threshold: <strong>≥0.90%</strong>. Excessive: <strong>≥1.80%</strong>.
          Enter your monthly transaction counts & amounts per MID below to calculate ratios. Mastercard thresholds: Standard ≥1.00%, Excessive ≥1.50%.
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total MIDs", value: summary.total, color: "text-slate-800", bg: "bg-white border border-slate-200" },
          { label: "Healthy", value: summary.healthy, color: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200" },
          { label: "Standard Risk", value: summary.standard, color: "text-amber-700", bg: "bg-amber-50 border border-amber-200" },
          { label: "Excessive Risk", value: summary.excessive, color: "text-red-700", bg: "bg-red-50 border border-red-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 shadow-sm ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Card Network</label>
          <select value={networkFilter} onChange={e => setNetworkFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
            <option value="all">All Networks</option>
            {networks.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Risk Level</label>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
            <option value="all">All Risk Levels</option>
            <option value="healthy">Healthy</option>
            <option value="standard">Standard Risk</option>
            <option value="excessive">Excessive Risk</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2 items-end">
          <button
            onClick={() => setShowManualInput(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#0D50B8] text-[#0D50B8] text-sm font-medium hover:bg-blue-50 transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            {showManualInput ? "Hide" : "Enter"} Transaction Volumes
          </button>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D50B8] text-white text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Manual transaction input table */}
      {showManualInput && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Enter Monthly Transaction Volumes per MID</p>
          <p className="text-xs text-slate-500">These values are used to calculate CB ratio = Chargebacks ÷ Total Transactions. Populate from your processor portal.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">MID</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Merchant / DBA</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Total Txn Count</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Total Txn Amount (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {midRows.map(r => (
                  <tr key={r.mid}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.mid}</td>
                    <td className="px-3 py-2 text-slate-700 text-xs">{r.alias}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min="0"
                        value={manualTxnCounts[r.mid] || ""}
                        onChange={e => setManualTxnCounts(prev => ({ ...prev, [r.mid]: e.target.value }))}
                        placeholder="e.g. 5000"
                        className="w-36 border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min="0"
                        value={manualTxnAmounts[r.mid] || ""}
                        onChange={e => setManualTxnAmounts(prev => ({ ...prev, [r.mid]: e.target.value }))}
                        placeholder="e.g. 250000"
                        className="w-40 border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-4">CB Count Ratio by MID (%) — Top {chartData.length}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + "%"} />
              <Tooltip formatter={(v) => [v + "%", "CB Ratio"]} />
              <ReferenceLine y={0.90} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: "0.90% Standard", position: "insideTopRight", fontSize: 10, fill: "#F59E0B" }} />
              <ReferenceLine y={1.80} stroke="#EF4444" strokeDasharray="4 4" label={{ value: "1.80% Excessive", position: "insideTopRight", fontSize: 10, fill: "#EF4444" }} />
              <Bar dataKey="ratio" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={RISK_CONFIG[entry.risk]?.color || "#94A3B8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} MID{filtered.length !== 1 ? "s" : ""}</p>
          <p className="text-xs text-slate-400">Click column headers to sort</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <Th label="MID" />
                <Th label="Merchant / DBA" />
                <Th label="Processor" />
                <Th label="Network" />
                <Th label="Txn Count" field="txnCount" />
                <Th label="Txn Amt (USD)" field="txnAmtUsd" />
                <Th label="CB Count" field="cbCount" />
                <Th label="CB Amt (USD)" field="cbAmtUsd" />
                <Th label="CB Count Ratio" field="cbCountRatio" />
                <Th label="CB Amt Ratio" field="cbAmtRatio" />
                <Th label="Fraud CBs" field="fraudCbCount" />
                <Th label="VAMP Risk" field="risk" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(r => {
                const rc = RISK_CONFIG[r.risk] || { label: "N/A", badge: "bg-slate-100 text-slate-500", icon: Info };
                const RIcon = rc.icon;
                return (
                  <tr key={r.mid} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">{r.mid}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{r.alias}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{r.processor}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{r.network}</td>
                    <td className="px-3 py-2.5 text-slate-700">{r.txnCount?.toLocaleString() ?? <span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-3 py-2.5 text-slate-700">{r.txnAmtUsd ? `$${r.txnAmtUsd.toLocaleString()}` : <span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{r.cbCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">${r.cbAmtUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2.5">
                      {r.cbCountRatio !== null ? (
                        <span className={`font-bold ${r.risk === "excessive" ? "text-red-600" : r.risk === "standard" ? "text-amber-600" : "text-emerald-600"}`}>
                          {(r.cbCountRatio * 100).toFixed(3)}%
                        </span>
                      ) : <span className="text-slate-300 text-xs">Enter txn count</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.cbAmtRatio !== null ? (
                        <span className="font-medium text-slate-600">{(r.cbAmtRatio * 100).toFixed(3)}%</span>
                      ) : <span className="text-slate-300 text-xs">Enter txn amt</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{r.fraudCbCount}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${rc.badge}`}>
                        <RIcon className="w-3 h-3" />
                        {rc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-slate-300 text-sm">No MID data found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}