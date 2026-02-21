import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, CheckCircle, AlertTriangle, Info, X } from "lucide-react";

const VALID_STATUSES = ["awaiting_decision", "won", "lost", "not_fought", "submitted"];

export default function StatusUpdateModal({ open, onClose, awaitingDisputes, onDone }) {
  const [step, setStep] = useState("intro"); // intro | uploading | results
  const [results, setResults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleClose = () => {
    setStep("intro");
    setResults(null);
    onClose();
  };

  // Download awaiting_decision cases as CSV template
  const handleDownloadTemplate = () => {
    const headers = ["case_id", "new_status", "resolution_date", "notes"];
    const rows = awaitingDisputes.map(d => [
      d.case_id,
      "awaiting_decision", // prefilled, user changes to won/lost
      "",
      ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "awaiting_decision_cases.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const processFile = async (file) => {
    setUploading(true);
    setStep("uploading");

    const text = await file.text();
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      setResults({ error: "File is empty or has no data rows." });
      setStep("results");
      setUploading(false);
      return;
    }

    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
    const caseIdIdx = headers.indexOf("case_id");
    const statusIdx = headers.indexOf("new_status");
    const resDateIdx = headers.indexOf("resolution_date");
    const notesIdx = headers.indexOf("notes");

    if (caseIdIdx === -1 || statusIdx === -1) {
      setResults({ error: "CSV must have columns: case_id, new_status" });
      setStep("results");
      setUploading(false);
      return;
    }

    const parseRow = (line) => line.split(",").map(v => v.replace(/^"|"$/g, "").trim());

    const rows = lines.slice(1).map(parseRow);
    const updated = [], skipped = [], errors = [];

    // Fetch all disputes once to match by case_id
    const allDisputes = await base44.entities.Dispute.list("-created_date", 2000);
    const disputeMap = {};
    allDisputes.forEach(d => { disputeMap[d.case_id] = d; });

    for (const row of rows) {
      const caseId = row[caseIdIdx];
      const newStatus = row[statusIdx]?.toLowerCase().replace(/ /g, "_");
      const resDate = resDateIdx >= 0 ? row[resDateIdx] : "";
      const notes = notesIdx >= 0 ? row[notesIdx] : "";

      if (!caseId) continue;
      if (!VALID_STATUSES.includes(newStatus)) {
        errors.push({ case_id: caseId, reason: `Invalid status "${newStatus}". Allowed: ${VALID_STATUSES.join(", ")}` });
        continue;
      }

      const dispute = disputeMap[caseId];
      if (!dispute) {
        errors.push({ case_id: caseId, reason: "Case ID not found in system" });
        continue;
      }

      // Only update status (and optionally resolution_date/notes), never wipe other fields
      const patch = { status: newStatus };
      if (resDate) patch.resolution_date = resDate;
      if (notes) patch.notes = notes;

      await base44.entities.Dispute.update(dispute.id, patch);
      updated.push({ case_id: caseId, old_status: dispute.status, new_status: newStatus });
    }

    setResults({ updated, skipped, errors });
    setStep("results");
    setUploading(false);
    onDone();
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Processor Status Update</DialogTitle>
        </DialogHeader>

        {step === "intro" && (
          <div className="space-y-5">
            {/* Manual Upload */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Manual Upload</h3>
                <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">Recommended</Badge>
              </div>
              <p className="text-sm text-slate-500">
                Download the awaiting-decision case list, update the <code className="bg-slate-100 px-1 rounded text-xs">new_status</code> column in Excel (won / lost / not_fought), then upload back. Only matching records are updated — no data is deleted.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadTemplate}>
                  <Download className="w-3.5 h-3.5" />
                  Download Template ({awaitingDisputes.length} cases)
                </Button>
                <span className="text-xs text-slate-400">→ Edit in Excel → Upload below</span>
              </div>

              {/* Upload dropzone */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("status-csv-input").click()}
              >
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Drop your updated CSV here or <span className="text-blue-600 underline">browse</span></p>
                <p className="text-xs text-slate-400 mt-1">Accepts .csv files only</p>
                <input id="status-csv-input" type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Valid values for <strong>new_status</strong>: <code>won</code>, <code>lost</code>, <code>not_fought</code>, <code>submitted</code>, <code>awaiting_decision</code>. All other dispute fields remain unchanged.
                </p>
              </div>
            </div>

            {/* API */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <span className="text-violet-600 text-xs font-bold">API</span>
                </div>
                <h3 className="font-semibold text-slate-800">API Integration</h3>
              </div>
              <p className="text-sm text-slate-500">
                Use the Base44 entity API to programmatically update dispute statuses from your processor portal or middleware. Filter by <code className="bg-slate-100 px-1 rounded text-xs">status=awaiting_decision</code> and PATCH only the <code className="bg-slate-100 px-1 rounded text-xs">status</code> field.
              </p>
              <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-x-auto">
                <div className="text-slate-500 mb-1">{"// PATCH /api/entities/Dispute/{id}"}</div>
                <div>{`{ "status": "won", "resolution_date": "2026-02-21" }`}</div>
              </div>
              <p className="text-xs text-slate-400">Go to Dashboard → Code → Functions to find your API endpoint and credentials.</p>
            </div>

            {/* Automation */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <span className="text-emerald-600 text-xs font-bold">⚡</span>
                </div>
                <h3 className="font-semibold text-slate-800">Scheduled Automation</h3>
              </div>
              <p className="text-sm text-slate-500">
                Set up a scheduled backend function to poll your processor portal daily, fetch decision updates, and automatically update dispute statuses. Ask your administrator to configure this under <strong>Dashboard → Automations</strong>.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600">
                <p className="font-medium mb-1">Suggested automation:</p>
                <ul className="list-disc ml-4 space-y-1 text-slate-500">
                  <li>Run daily at a set time</li>
                  <li>Query all disputes with <code>status = awaiting_decision</code></li>
                  <li>Check processor portal API for each case</li>
                  <li>PATCH status to <code>won</code> / <code>lost</code> if a decision is found</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-600 text-sm">Processing your CSV and updating records...</p>
          </div>
        )}

        {step === "results" && results && (
          <div className="space-y-4">
            {results.error ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">Upload Failed</p>
                  <p className="text-red-600 text-sm mt-1">{results.error}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{results.updated.length}</p>
                    <p className="text-xs text-green-600 mt-1">Updated</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-slate-600">{results.skipped.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Skipped</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{results.errors.length}</p>
                    <p className="text-xs text-red-500 mt-1">Errors</p>
                  </div>
                </div>

                {results.updated.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Updated Records</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {results.updated.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-green-50 rounded-lg px-3 py-2">
                          <span className="font-medium text-slate-700">{r.case_id}</span>
                          <span className="text-slate-400">{r.old_status} → <strong className="text-green-700">{r.new_status}</strong></span>
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-2 uppercase tracking-wide">Errors</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {results.errors.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs bg-red-50 rounded-lg px-3 py-2">
                          <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-700">{e.case_id}</span>
                          <span className="text-red-600">{e.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep("intro")}>Upload Another</Button>
              <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}