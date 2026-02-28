import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Plus, X, FileText, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import VampStripeImport from "./VampStripeImport";

const BLANK_ROW = {
  merchant_id: "", merchant_alias: "", period_month: "",
  card_network: "Visa",
  settled_txn_count: "", settled_txn_amount_usd: "",
  tc40_count: "", tc40_amount_usd: "",
  tc15_count: "", tc15_amount_usd: "",
  ce30_count: "", notes: "",
};

const CSV_HEADERS = [
  "merchant_id", "merchant_alias", "period_month", "card_network",
  "settled_txn_count", "settled_txn_amount_usd",
  "tc40_count", "tc40_amount_usd",
  "tc15_count", "tc15_amount_usd",
  "ce30_count", "notes",
];

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/ /g, "_"));
  return lines.slice(1).map(line => {
    const vals = line.split(",");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i]?.trim() || ""; });
    return obj;
  });
}

function cleanRow(row) {
  const numFields = ["settled_txn_count", "settled_txn_amount_usd", "tc40_count", "tc40_amount_usd", "tc15_count", "tc15_amount_usd", "ce30_count"];
  const out = { ...row, source: row.source || "manual" };
  numFields.forEach(f => { if (out[f] !== "" && out[f] !== undefined) out[f] = Number(out[f]) || 0; else delete out[f]; });
  return out;
}

export default function VampImportModal({ onClose, onSaved }) {
  const [tab, setTab] = useState("manual");
  const [rows, setRows] = useState([{ ...BLANK_ROW }]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const addRow = () => setRows(prev => [...prev, { ...BLANK_ROW }]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const saveManual = async () => {
    setSaving(true);
    const toSave = rows.filter(r => r.merchant_id && r.period_month).map(r => cleanRow({ ...r, source: "manual" }));
    if (!toSave.length) { setSaving(false); return; }
    let success = 0, failed = 0;
    for (const r of toSave) {
      try { await base44.entities.VampTransaction.create(r); success++; } catch { failed++; }
    }
    setSaving(false); setResult({ success, failed });
  };

  const handleCSVFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed.length) { setCsvError("Could not parse CSV. Check the format."); setCsvRows([]); }
      else { setCsvError(""); setCsvRows(parsed); }
    };
    reader.readAsText(file);
  };

  const saveCSV = async () => {
    setSaving(true);
    let success = 0, failed = 0;
    for (const r of csvRows) {
      try { await base44.entities.VampTransaction.create(cleanRow({ ...r, source: "csv_upload" })); success++; } catch { failed++; }
    }
    setSaving(false); setResult({ success, failed });
  };

  const downloadTemplate = () => {
    const header = CSV_HEADERS.join(",");
    const example = ["MID_001","Demo Merchant","2025-01","Visa","10000","500000","45","2200","32","1600","5","optional notes"].join(",");
    const blob = new Blob([[header, example].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "vamp_import_template.csv"; a.click();
  };

  const tabClass = (t) => `px-4 py-2 text-sm font-medium rounded-xl transition-all ${tab === t ? "bg-[#0D50B8] text-white shadow" : "text-slate-500 hover:bg-slate-100"}`;

  const handleStripeDone = () => { onSaved(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Import VAMP Data</h2>
            <p className="text-xs text-slate-400 mt-0.5">Add TC40, TC15, TC05 and CE3.0 data per MID per month</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-2 px-6 pt-4 pb-2">
          <button className={tabClass("manual")} onClick={() => setTab("manual")}>✏️ Manual Entry</button>
          <button className={tabClass("csv")} onClick={() => setTab("csv")}>📄 CSV Upload</button>
          <button className={tabClass("stripe")} onClick={() => setTab("stripe")}>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-[#635BFF] inline-flex items-center justify-center text-white text-[9px] font-bold">S</span>
              Stripe Auto-Fetch
            </span>
          </button>
          <button className={tabClass("api")} onClick={() => setTab("api")}>🔌 API Import</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {result && (
            <div className={`flex items-center gap-3 rounded-2xl p-3 mb-4 mt-2 ${result.failed > 0 ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200"}`}>
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-slate-700">{result.success} record{result.success !== 1 ? "s" : ""} saved. {result.failed > 0 ? `${result.failed} failed.` : ""}</p>
              <button onClick={onSaved} className="ml-auto text-sm font-medium text-[#0D50B8] hover:underline">Done</button>
            </div>
          )}

          {tab === "manual" && (
            <div className="space-y-3 mt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase tracking-wide">
                      <th className="text-left px-2 py-1">MID *</th>
                      <th className="text-left px-2 py-1">Alias / DBA</th>
                      <th className="text-left px-2 py-1">Period (YYYY-MM) *</th>
                      <th className="text-left px-2 py-1">Network *</th>
                      <th className="text-left px-2 py-1">TC05 Settled Count</th>
                      <th className="text-left px-2 py-1">TC05 Settled USD</th>
                      <th className="text-left px-2 py-1">TC40 Fraud Count</th>
                      <th className="text-left px-2 py-1">TC40 Fraud USD</th>
                      <th className="text-left px-2 py-1">TC15 CB Count</th>
                      <th className="text-left px-2 py-1">TC15 CB USD</th>
                      <th className="text-left px-2 py-1">CE3.0 Count</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="bg-slate-50 rounded-xl">
                        {["merchant_id", "merchant_alias", "period_month"].map(k => (
                          <td key={k} className="px-1 py-1">
                            <input value={row[k]} onChange={e => updateRow(i, k, e.target.value)}
                              placeholder={k === "period_month" ? "2025-01" : k === "merchant_id" ? "MID001" : "DBA Name"}
                              className="w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <select value={row.card_network} onChange={e => updateRow(i, "card_network", e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                            <option value="Visa">Visa</option>
                            <option value="Mastercard">Mastercard</option>
                          </select>
                        </td>
                        {["settled_txn_count", "settled_txn_amount_usd", "tc40_count", "tc40_amount_usd", "tc15_count", "tc15_amount_usd", "ce30_count"].map(k => (
                          <td key={k} className="px-1 py-1">
                            <input type="number" min="0" value={row[k]} onChange={e => updateRow(i, k, e.target.value)}
                              placeholder="0"
                              className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <button onClick={() => removeRow(i)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addRow} className="flex items-center gap-2 text-sm text-[#0D50B8] hover:underline">
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>
          )}

          {tab === "csv" && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-3">Upload a CSV file with VAMP metrics per MID per month</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={downloadTemplate}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-white transition">
                    📥 Download Template
                  </button>
                  <label className="cursor-pointer px-4 py-2 text-sm bg-[#0D50B8] text-white rounded-xl hover:bg-blue-700 transition">
                    <Upload className="w-4 h-4 inline mr-2" />Choose CSV File
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
                  </label>
                </div>
              </div>
              {csvError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{csvError}</div>}
              {csvRows.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">{csvRows.length} rows parsed — preview (first 5):</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {Object.keys(csvRows[0]).map(k => <th key={k} className="text-left px-3 py-2 text-slate-400 whitespace-nowrap">{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-b border-slate-50">
                            {Object.values(r).map((v, j) => <td key={j} className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{v || "—"}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "stripe" && (
            <VampStripeImport onSaved={handleStripeDone} />
          )}

          {tab === "api" && (
            <div className="space-y-4 mt-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                API import calls your processor's endpoint directly. Contact support for custom API integrations.
              </div>
              <p className="text-xs text-slate-400">
                ℹ️ After entering details below, your IT team or Shanora support can configure the exact field mappings for this processor.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {tab === "manual" && (
            <Button onClick={saveManual} disabled={saving} className="bg-[#0D50B8] hover:bg-blue-700">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Records"}
            </Button>
          )}
          {tab === "csv" && csvRows.length > 0 && (
            <Button onClick={saveCSV} disabled={saving} className="bg-[#0D50B8] hover:bg-blue-700">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</> : `Import ${csvRows.length} Rows`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}