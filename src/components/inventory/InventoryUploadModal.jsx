import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";

const REQUIRED_COLS = ["case_id"];
const SAMPLE_CSV = `case_id,case_type,arn_number,reason_code,reason_category,transaction_date,transaction_amount,currency,chargeback_date,chargeback_amount,processor,card_network,card_type,bin_first6,bin_last4,due_date,sub_unit_name,merchant_id,notes
CB-2024-001,First Chargeback,123456789,4853,Not As Described,2024-01-10,250.00,USD,2024-01-20,250.00,Fiserv,Visa,Credit,411111,1234,2024-02-05,Main Store,MID001,
CB-2024-002,First Chargeback,987654321,4853,Fraudulent Transaction,2024-01-12,89.99,USD,2024-01-22,89.99,Stripe,Mastercard,Debit,520000,5678,2024-02-07,Online Store,MID002,`;

export default function InventoryUploadModal({ open, onClose, projects, onSuccess }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null); // parsed rows
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedProject, setSelectedProject] = useState("");
  const fileRef = useRef();

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(",");
      const row = {};
      headers.forEach((h, i) => { row[h] = (vals[i] || "").trim(); });
      return row;
    });
  };

  const handleFile = async (f) => {
    setFile(f);
    setResult(null);
    setErrors([]);
    setPreview(null);
    const text = await f.text();
    const rows = parseCSV(text);
    const errs = [];
    rows.forEach((r, i) => {
      REQUIRED_COLS.forEach(col => { if (!r[col]) errs.push(`Row ${i + 2}: missing ${col}`); });
    });
    setErrors(errs);
    setPreview(rows.slice(0, 5));
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const rows = parseCSV(text);
    let success = 0, failed = 0;
    for (const row of rows) {
      try {
        await base44.entities.InventoryItem.create({
          ...row,
          project_id: selectedProject || row.project_id || undefined,
          transaction_amount: row.transaction_amount ? parseFloat(row.transaction_amount) : undefined,
          chargeback_amount: row.chargeback_amount ? parseFloat(row.chargeback_amount) : undefined,
          status: "received",
          source: "Manual",
        });
        success++;
      } catch { failed++; }
    }
    setResult({ success, failed, total: rows.length });
    setImporting(false);
    if (success > 0) onSuccess();
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "inventory_sample.csv"; a.click();
  };

  const reset = () => { setFile(null); setPreview(null); setErrors([]); setResult(null); setSelectedProject(""); };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#0D50B8]" /> Bulk Upload Inventory (CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button size="sm" variant="outline" onClick={downloadSample} className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Download Sample CSV
          </Button>

          {/* Project assignment */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Assign all to Project (optional — overrides CSV project_id)</label>
            <select
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0D50B8]"
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
            >
              <option value="">— Use project_id from CSV —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-[#0D50B8] bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); }} />
            <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            {file ? (
              <p className="text-sm font-medium text-[#0D50B8]"><FileText className="w-4 h-4 inline mr-1" />{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-slate-600">Drag & drop CSV file here, or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">Only .csv files supported</p>
              </>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Validation Errors</p>
              {errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-600">• {e}</p>)}
              {errors.length > 5 && <p className="text-xs text-red-400">...and {errors.length - 5} more</p>}
            </div>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && !result && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">Preview (first 5 rows)</p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead className="bg-slate-50">
                    <tr>{Object.keys(preview[0]).slice(0, 7).map(k => <th key={k} className="px-2 py-1.5 text-left font-medium text-slate-500 whitespace-nowrap">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {Object.values(r).slice(0, 7).map((v, j) => <td key={j} className="px-2 py-1.5 text-slate-600 truncate max-w-[120px]">{v || "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Import Complete</p>
                <p className="text-xs text-green-700">{result.success} of {result.total} records imported successfully{result.failed > 0 ? `, ${result.failed} failed` : ""}.</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1 border-t border-slate-100">
            <Button variant="outline" onClick={() => { onClose(); reset(); }} className="flex-1">Close</Button>
            {!result && (
              <Button
                className="flex-1 bg-[#0D50B8] hover:bg-[#0a3d8f]"
                disabled={!file || errors.length > 0 || importing}
                onClick={handleImport}
              >
                {importing ? "Importing..." : "Import"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}