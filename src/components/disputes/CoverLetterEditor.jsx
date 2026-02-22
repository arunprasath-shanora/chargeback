import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, Send, Globe, Bold, Italic, Underline, Table, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Strikethrough } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Convert stored markdown-like text to HTML for the editor
function toEditorHtml(text, dispute, evidence) {
  if (!text) return "";
  let html = text;

  // Replace {{field}} placeholders with actual values
  Object.entries(dispute).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      html = html.replaceAll(`{{${k}}}`, `<span class="field-value" data-key="${k}">${v}</span>`);
    }
  });

  // Replace {{evidence:TypeName}} with actual images or file links
  html = html.replace(/\{\{evidence:([^}]+)\}\}/g, (match, typeName) => {
    const evItems = evidence.filter(e => e.evidence_type === typeName);
    if (evItems.length === 0) return match; // keep placeholder if no upload yet
    return evItems.map(ev => {
      const name = (ev.file_name || "").toLowerCase();
      const isImage = name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp") || name.endsWith(".gif");
      if (isImage) {
        return `<div class="evidence-block" data-type="${typeName}" data-url="${ev.file_url}" data-name="${ev.file_name}">
          <p style="font-size:11px;color:#64748b;margin:4px 0 2px;">${ev.evidence_type}: ${ev.file_name}</p>
          <img src="${ev.file_url}" alt="${ev.file_name}" style="max-width:100%;border:1px solid #e2e8f0;border-radius:6px;display:block;" />
        </div>`;
      }
      return `<a href="${ev.file_url}" target="_blank" style="color:#0D50B8;">${ev.file_name}</a>`;
    }).join("");
  });

  // Convert markdown-like table syntax to HTML table
  html = html.replace(/(\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)*)/g, (tableBlock) => {
    const lines = tableBlock.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return tableBlock;
    const headers = lines[0].split("|").map(c => c.trim()).filter(c => c);
    const rows = lines.slice(2).map(l => l.split("|").map(c => c.trim()).filter(c => c));
    const thead = `<thead style="background:#f8fafc;"><tr>${headers.map(h => `<th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:left;font-size:12px;">${h}</th>`).join("")}</tr></thead>`;
    const tbody = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:12px;">${c}</td>`).join("")}</tr>`).join("");
    return `<table style="border-collapse:collapse;width:100%;margin:8px 0;">${thead}<tbody>${tbody}</tbody></table>`;
  });

  // Convert **bold**, _italic_, __underline__
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<u>$1</u>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Convert newlines to <br> (except inside table blocks)
  html = html.replace(/\n/g, "<br>");

  return html;
}

// Extract raw text back from editor HTML (convert HTML back to storable format)
function fromEditorHtml(html) {
  let text = html;
  // Replace <br> and block endings with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");

  // Restore evidence blocks back to placeholders only if no evidence uploaded
  text = text.replace(/<div[^>]*class="evidence-block"[^>]*data-type="([^"]*)"[^>]*>[\s\S]*?<\/div>/g, "{{evidence:$1}}");

  // Convert <table> back to markdown table
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (match, inner) => {
    const headers = [];
    const rows = [];
    const thMatches = inner.matchAll(/<th[^>]*>(.*?)<\/th>/gi);
    for (const m of thMatches) headers.push(m[1].replace(/<[^>]+>/g, "").trim());
    const trMatches = inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    let isFirst = true;
    for (const tr of trMatches) {
      if (isFirst) { isFirst = false; continue; } // skip header row
      const cells = [];
      const tdMatches = tr[1].matchAll(/<td[^>]*>(.*?)<\/td>/gi);
      for (const td of tdMatches) cells.push(td[1].replace(/<[^>]+>/g, "").trim());
      if (cells.length) rows.push(cells);
    }
    if (!headers.length) return "";
    const headerRow = `| ${headers.join(" | ")} |`;
    const sepRow = `| ${headers.map(() => "----------").join(" | ")} |`;
    const dataRows = rows.map(r => `| ${r.join(" | ")} |`).join("\n");
    return `\n${headerRow}\n${sepRow}\n${dataRows}\n`;
  });

  // Convert formatting tags
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  text = text.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  text = text.replace(/<u>(.*?)<\/u>/gi, "__$1__");
  text = text.replace(/<em>(.*?)<\/em>/gi, "_$1_");
  text = text.replace(/<i>(.*?)<\/i>/gi, "_$1_");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  const d = document.createElement("div");
  d.innerHTML = text;
  text = d.textContent || d.innerText || text;

  return text.trim();
}

export default function CoverLetterEditor({
  coverLetter,
  setCoverLetter,
  currentDispute,
  evidence,
  coverTemplates,
  selectedTemplate,
  setSelectedTemplate,
  generatingCL,
  savingCL,
  hasCoverLetter,
  hasEvidence,
  canSubmit,
  savingStatus,
  onApplyTemplate,
  onGenerate,
  onSave,
  onExportPDF,
  onSubmit,
  onApiAutomation,
  isFought,
}) {
  const editorRef = useRef(null);
  const isInternalUpdate = useRef(false);

  // Initialize editor content when coverLetter or evidence changes
  useEffect(() => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    const html = toEditorHtml(coverLetter || "", currentDispute, evidence);
    editorRef.current.innerHTML = html;
    isInternalUpdate.current = false;
  }, [coverLetter, evidence]);

  const handleEditorInput = useCallback(() => {
    if (isInternalUpdate.current || !editorRef.current) return;
    const raw = fromEditorHtml(editorRef.current.innerHTML);
    setCoverLetter(raw);
  }, [setCoverLetter]);

  const exec = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const insertTable = () => {
    const rows = 3, cols = 3;
    let tableHtml = `<table style="border-collapse:collapse;width:100%;margin:8px 0;">`;
    tableHtml += `<thead style="background:#f8fafc;"><tr>`;
    for (let c = 0; c < cols; c++) tableHtml += `<th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:left;font-size:12px;" contenteditable="true">Header ${c + 1}</th>`;
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 0; r < rows - 1; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < cols; c++) tableHtml += `<td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:12px;" contenteditable="true">Cell</td>`;
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><br>`;
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, tableHtml);
  };

  const addTableRow = () => {
    // Insert a row to the last focused table
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const cell = sel.anchorNode?.parentElement?.closest("td, th");
    const row = cell?.closest("tr");
    const table = row?.closest("table");
    if (!table) return;
    const cols = row.cells.length;
    const newRow = document.createElement("tr");
    for (let i = 0; i < cols; i++) {
      const td = document.createElement("td");
      td.style.cssText = "border:1px solid #cbd5e1;padding:6px 10px;font-size:12px;";
      td.contentEditable = "true";
      td.textContent = "";
      newRow.appendChild(td);
    }
    row.parentElement.appendChild(newRow);
    handleEditorInput();
  };

  const addTableCol = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const cell = sel.anchorNode?.parentElement?.closest("td, th");
    const table = cell?.closest("table");
    if (!table) return;
    table.querySelectorAll("tr").forEach((row, ri) => {
      const newCell = ri === 0 ? document.createElement("th") : document.createElement("td");
      newCell.style.cssText = ri === 0
        ? "border:1px solid #cbd5e1;padding:6px 10px;text-align:left;font-size:12px;background:#f8fafc;"
        : "border:1px solid #cbd5e1;padding:6px 10px;font-size:12px;";
      newCell.contentEditable = "true";
      newCell.textContent = ri === 0 ? "Header" : "Cell";
      row.appendChild(newCell);
    });
    handleEditorInput();
  };

  const ToolBtn = ({ title, onClick, children, active }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition-colors text-slate-600 ${active ? "bg-slate-300" : "hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Top toolbar: template + actions */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[200px] space-y-1">
          <p className="text-xs font-medium text-slate-600">Apply Template</p>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
            <SelectContent>
              {coverTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={onApplyTemplate} disabled={!selectedTemplate}>Apply Template</Button>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={generatingCL}>
          <Wand2 className="w-3.5 h-3.5 mr-1" />
          {generatingCL ? "Generating..." : "AI Generate"}
        </Button>
        <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" size="sm" onClick={onSave} disabled={savingCL}>
          {savingCL ? "Saving..." : "Save Cover Letter"}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPDF} disabled={!hasCoverLetter}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Word-processor editor */}
      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200 flex-wrap">
          <ToolBtn title="Bold (Ctrl+B)" onClick={() => exec("bold")}><Bold className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Italic (Ctrl+I)" onClick={() => exec("italic")}><Italic className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Underline (Ctrl+U)" onClick={() => exec("underline")}><Underline className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}><Strikethrough className="w-3.5 h-3.5" /></ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolBtn title="Align Left" onClick={() => exec("justifyLeft")}><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Align Center" onClick={() => exec("justifyCenter")}><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Align Right" onClick={() => exec("justifyRight")}><AlignRight className="w-3.5 h-3.5" /></ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolBtn title="Bullet List" onClick={() => exec("insertUnorderedList")}><List className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Numbered List" onClick={() => exec("insertOrderedList")}><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolBtn title="Insert Table" onClick={insertTable}>
            <span className="flex items-center gap-1 text-xs font-medium"><Table className="w-3.5 h-3.5" /> Table</span>
          </ToolBtn>
          <ToolBtn title="Add Row to selected table" onClick={addTableRow}>
            <span className="text-xs font-medium">+Row</span>
          </ToolBtn>
          <ToolBtn title="Add Column to selected table" onClick={addTableCol}>
            <span className="text-xs font-medium">+Col</span>
          </ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <select
            className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white text-slate-600"
            onChange={e => exec("fontSize", e.target.value)}
            defaultValue="3"
          >
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt</option>
            <option value="4">14pt</option>
            <option value="5">18pt</option>
            <option value="6">24pt</option>
          </select>
          <select
            className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white text-slate-600 ml-1"
            onChange={e => exec("formatBlock", e.target.value)}
            defaultValue="p"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
        </div>

        {/* A4-style page editor */}
        <div className="bg-slate-100 p-6 min-h-[500px]">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onKeyDown={(e) => {
              // Tab in table moves to next cell
              if (e.key === "Tab") {
                const cell = window.getSelection()?.anchorNode?.parentElement?.closest("td, th");
                if (cell) {
                  e.preventDefault();
                  const allCells = Array.from(cell.closest("table").querySelectorAll("td, th"));
                  const idx = allCells.indexOf(cell);
                  if (idx < allCells.length - 1) {
                    allCells[idx + 1].focus();
                    const range = document.createRange();
                    range.selectNodeContents(allCells[idx + 1]);
                    range.collapse(false);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                  }
                }
              }
            }}
            className="bg-white mx-auto shadow-md rounded-sm min-h-[480px] p-10 text-sm text-slate-800 leading-relaxed focus:outline-none"
            style={{
              maxWidth: "750px",
              fontFamily: "'Times New Roman', Times, serif",
              lineHeight: "1.8",
              caretColor: "#0D50B8",
            }}
            data-placeholder="Start typing your cover letter... Use the toolbar to format. {{evidence:TypeName}} tags will show the actual uploaded images inline."
          />
        </div>
      </div>

      {/* Submit to Portal section */}
      {isFought && !["awaiting_decision","won","lost"].includes(currentDispute.status) && (
        <Card className={`border-2 ${canSubmit ? "border-green-200 bg-green-50/40" : "border-dashed border-slate-200 bg-slate-50/40"}`}>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Submit to Processor Portal</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1 text-xs">
                <span className={`flex items-center gap-1.5 font-medium ${hasEvidence ? "text-green-700" : "text-amber-600"}`}>
                  {hasEvidence ? "✓" : "○"} Evidence Uploaded
                </span>
                <span className="text-slate-400">{evidence.length} file(s) attached</span>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <span className={`flex items-center gap-1.5 font-medium ${hasCoverLetter ? "text-green-700" : "text-amber-600"}`}>
                  {hasCoverLetter ? "✓" : "○"} Cover Letter Saved
                </span>
                <span className="text-slate-400">{hasCoverLetter ? "Ready to export as PDF" : "Generate & save above"}</span>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className={`w-full ${canSubmit ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                  disabled={!canSubmit || savingStatus}
                  onClick={onSubmit}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {savingStatus ? "Submitting..." : "Manual Submit"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  disabled={!canSubmit}
                  onClick={onApiAutomation}
                >
                  <Globe className="w-3.5 h-3.5 mr-1.5" /> API / Automation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          font-style: italic;
        }
        [contenteditable] table td, [contenteditable] table th {
          border: 1px solid #cbd5e1 !important;
          padding: 6px 10px !important;
          min-width: 80px;
        }
        [contenteditable] table td:focus, [contenteditable] table th:focus {
          outline: 2px solid #0D50B8;
          outline-offset: -2px;
        }
        [contenteditable] .field-value {
          background: #eff6ff;
          border-radius: 3px;
          padding: 0 3px;
          color: #1d4ed8;
          font-size: 0.85em;
        }
        [contenteditable] .evidence-block {
          border: 1px dashed #94a3b8;
          border-radius: 6px;
          padding: 8px;
          margin: 8px 0;
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}