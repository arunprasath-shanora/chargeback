import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import VampTable from "@/components/vamp/VampTable.jsx";
import VampSummaryCards from "@/components/vamp/VampSummaryCards.jsx";
import VampChart from "@/components/vamp/VampChart.jsx";
import VampImportModal from "@/components/vamp/VampImportModal.jsx";
import VampInfoBanner from "@/components/vamp/VampInfoBanner.jsx";
import { Download, RefreshCw, Upload, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const VAMP_THRESHOLDS = {
  Visa: {
    standard: 0.009,
    excessive: 0.018,
  },
  Mastercard: {
    standard: 0.010,
    excessive: 0.015,
  },
};

export function getRiskLevel(vampRatio, network) {
  const t = VAMP_THRESHOLDS[network] || VAMP_THRESHOLDS.Visa;
  if (vampRatio === null || vampRatio === undefined) return "unknown";
  if (vampRatio >= t.excessive) return "excessive";
  if (vampRatio >= t.standard) return "standard";
  return "healthy";
}

// VAMP = (TC40 + TC15 - CE3.0) / TC05
export function calcVampRatio(row) {
  const numerator = (row.tc40_count || 0) + (row.tc15_count || 0) - (row.ce30_count || 0);
  const denominator = row.settled_txn_count || 0;
  if (!denominator) return null;
  return numerator / denominator;
}

export default function VampReport() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [networkFilter, setNetworkFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("vamp_ratio");
  const [sortDir, setSortDir] = useState("desc");

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.VampTransaction.list("-period_month", 500);
      setRecords(data);
    } catch (e) {
      setRecords([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => records.map(r => {
    const vamp_ratio = calcVampRatio(r);
    const risk = getRiskLevel(vamp_ratio, r.card_network);
    const fraud_ratio = r.settled_txn_count ? (r.tc40_count || 0) / r.settled_txn_count : null;
    const cb_ratio = r.settled_txn_count ? (r.tc15_count || 0) / r.settled_txn_count : null;
    return { ...r, vamp_ratio, risk, fraud_ratio, cb_ratio };
  }), [records]);

  const periods = useMemo(() => [...new Set(enriched.map(r => r.period_month).filter(Boolean))].sort().reverse(), [enriched]);
  const networks = useMemo(() => [...new Set(enriched.map(r => r.card_network).filter(Boolean))].sort(), [enriched]);

  const filtered = useMemo(() => {
    return enriched
      .filter(r => networkFilter === "all" || r.card_network === networkFilter)
      .filter(r => periodFilter === "all" || r.period_month === periodFilter)
      .filter(r => riskFilter === "all" || r.risk === riskFilter)
      .sort((a, b) => {
        const av = a[sortBy] ?? -Infinity;
        const bv = b[sortBy] ?? -Infinity;
        return sortDir === "desc" ? bv - av : av - bv;
      });
  }, [enriched, networkFilter, periodFilter, riskFilter, sortBy, sortDir]);

  const exportCSV = () => {
    const headers = ["MID", "Merchant Alias", "Period", "Card Network", "TC05 Settled Count",
      "TC05 Settled USD", "TC40 Fraud Count", "TC40 Fraud USD", "TC15 CB Count",
      "TC15 CB USD", "CE3.0 Count", "VAMP Ratio (%)", "Fraud Ratio (%)", "CB Ratio (%)", "Risk Level", "Source"];
    const lines = [headers.join(","), ...filtered.map(r => [
      r.merchant_id, r.merchant_alias, r.period_month, r.card_network,
      r.settled_txn_count, r.settled_txn_amount_usd,
      r.tc40_count, r.tc40_amount_usd,
      r.tc15_count, r.tc15_amount_usd,
      r.ce30_count,
      r.vamp_ratio !== null ? (r.vamp_ratio * 100).toFixed(4) : "",
      r.fraud_ratio !== null ? (r.fraud_ratio * 100).toFixed(4) : "",
      r.cb_ratio !== null ? (r.cb_ratio * 100).toFixed(4) : "",
      r.risk, r.source
    ].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `vamp_report_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">VAMP — Visa Acquirer Monitoring Program</h1>
          <p className="text-slate-500 text-sm mt-1">TC40 + TC15 ÷ TC05 · April 2025 thresholds · Dedicated reporting database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="bg-[#0D50B8] hover:bg-blue-700 gap-2" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" /> Import / Add Data
          </Button>
        </div>
      </div>

      <VampInfoBanner />

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading VAMP data…</div>
      ) : (
        <>
          <VampSummaryCards rows={filtered} allRows={enriched} />

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Card Network</label>
              <Select value={networkFilter} onValueChange={setNetworkFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  {networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Period (Month)</label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Risk Level</label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="standard">Standard Risk</SelectItem>
                  <SelectItem value="excessive">Excessive Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <VampChart rows={filtered} />
          <VampTable rows={filtered} sortBy={sortBy} sortDir={sortDir}
            onSort={(f) => { if (sortBy === f) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(f); setSortDir("desc"); } }}
            onRefresh={load}
          />
        </>
      )}

      {showImport && (
        <VampImportModal onClose={() => setShowImport(false)} onSaved={() => { setShowImport(false); load(); }} />
      )}
    </div>
  );
}