import React, { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, Send, Globe,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Table, Image, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Build HTML to show inside the contenteditable editor.
// {{field}} → highlighted span with actual value
// {{evidence:TypeName}} → rendered image block (only if evidence uploaded for that type)
function buildEditorHtml(rawText, dispute, evidence) {
  if (!rawText) return "";

  let html = rawText;

  // Replace {{evidence:TypeName}} first
  html = html.replace(/\{\{evidence:([^}]+)\}\}/g, (_match, typeName) => {
    const evItems = evidence.filter(e => e.evidence_type === typeName);
    if (evItems.length === 0) {
      // Keep placeholder visually but styled
      return `<span class="ev-placeholder" data-ev-type="${typeName}" contenteditable="false" style="display:inline-block;border:1.5px dashed #94a3b8;border-radius:5px;padding:4px 10px;font-size:11px;color:#64748b;background:#f8fafc;margin:4px 0;">{{evidence:${typeName}}}</span>`;
    }
    return evItems.map(ev => {
      const name = (ev.file_name || "").toLowerCase();
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/.test(name);
      if (isImage) {
        return `<div class="ev-block" data-ev-type="${typeName}" data-ev-url="${ev.file_url}" data-ev-name="${ev.file_name}" contenteditable="false" style="border:1.5px dashed #94a3b8;border-radius:6px;padding:8px;margin:8px 0;background:#f8fafc;display:block;">
          <p style="font-size:11px;color:#64748b;margin:0 0 4px 0;">${ev.evidence_type}: ${ev.file_name}</p>
          <img src="${ev.file_url}" alt="${ev.file_name}" style="max-width:100%;max-height:400px;border:1px solid #e2e8f0;border-radius:4px;display:block;" crossorigin="anonymous" />
        </div>`;
      }
      return `<a href="${ev.file_url}" target="_blank" style="color:#0D50B8;">${ev.file_name}</a>`;
    }).join("");
  });

  // Replace {{field}} with styled spans
  Object.entries(dispute).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      const escaped = String(v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
      html = html.replaceAll(
        `{{${k}}}`,
        `<span class="field-chip" data-key="${k}" style="background:#eff6ff;border-radius:3px;padding:0 4px;color:#1d4ed8;font-size:0.88em;">${escaped}</span>`
      );
    }
  });

  // Markdown table → HTML table (Word-like styling)
  html = html.replace(/(\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)*)/g, (block) => {
    const lines = block.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return block;
    const headers = lines[0].split("|").map(c => c.trim()).filter(Boolean);
    const dataRows = lines.slice(2).map(l => l.split("|").map(c => c.trim()).filter(Boolean));
    const thead = `<thead><tr>${headers.map(h => `<th style="border:1.5px solid #2563eb;padding:7px 12px;text-align:left;font-size:12px;font-family:inherit;background:#1d4ed8;color:#ffffff;font-weight:600;letter-spacing:0.02em;">${h}</th>`).join("")}</tr></thead>`;
    const tbody = dataRows.map((r, ri) => `<tr style="background:${ri % 2 === 0 ? "#ffffff" : "#eff6ff"};">${r.map(c => `<td style="border:1px solid #93c5fd;padding:7px 12px;font-size:12px;font-family:inherit;color:#1e293b;">${c}</td>`).join("")}</tr>`).join("");
    return `<table style="border-collapse:collapse;width:100%;margin:12px 0;box-shadow:0 1px 4px rgba(37,99,235,0.08);border-radius:4px;overflow:hidden;">${thead}<tbody>${tbody}</tbody></table>`;
  });

  // **bold**, __underline__, _italic_
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_\n]+)__/g, "<u>$1</u>");
  html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");

  // newlines → <br>
  html = html.replace(/\n/g, "<br>");

  return html;
}

// Strip editor HTML back to raw storable text
function extractRawText(html) {
  let text = html;

  // ev-block/ev-placeholder → restore {{evidence:Type}}
  text = text.replace(/<div[^>]*class="ev-block"[^>]*data-ev-type="([^"]*)"[^>]*>[\s\S]*?<\/div>/g, "{{evidence:$1}}");
  text = text.replace(/<span[^>]*class="ev-placeholder"[^>]*data-ev-type="([^"]*)"[^>]*>[\s\S]*?<\/span>/g, "{{evidence:$1}}");

  // field chips → restore {{key}}
  text = text.replace(/<span[^>]*class="field-chip"[^>]*data-key="([^"]*)"[^>]*>[\s\S]*?<\/span>/g, "{{$1}}");

  // <br> → newline
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>|<\/div>|<\/tr>/gi, "\n");

  // HTML table → markdown
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, inner) => {
    const headers = [];
    const rows = [];
    for (const m of inner.matchAll(/<th[^>]*>(.*?)<\/th>/gi)) headers.push(m[1].replace(/<[^>]+>/g, "").trim());
    let first = true;
    for (const tr of inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      if (first) { first = false; continue; }
      const cells = [];
      for (const td of tr[1].matchAll(/<td[^>]*>(.*?)<\/td>/gi)) cells.push(td[1].replace(/<[^>]+>/g, "").trim());
      if (cells.length) rows.push(cells);
    }
    if (!headers.length) return "";
    return `\n| ${headers.join(" | ")} |\n| ${headers.map(() => "----------").join(" | ")} |\n${rows.map(r => `| ${r.join(" | ")} |`).join("\n")}\n`;
  });

  // <strong> → **text**
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  text = text.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  text = text.replace(/<u>(.*?)<\/u>/gi, "__$1__");
  text = text.replace(/<em>(.*?)<\/em>/gi, "_$1_");
  text = text.replace(/<i>(.*?)<\/i>/gi, "_$1_");

  // strip remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // decode HTML entities
  const tmp = document.createElement("div");
  tmp.innerHTML = text;
  return (tmp.textContent || tmp.innerText || "").trim();
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
  onExportPDF: _onExportPDF, // we override this
  onSubmit,
  onApiAutomation,
  isFought,
}) {
  const editorRef = useRef(null);
  const skipInput = useRef(false);
  const [evDropdownOpen, setEvDropdownOpen] = useState(false);
  const evDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (evDropdownRef.current && !evDropdownRef.current.contains(e.target)) {
        setEvDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Re-render editor HTML whenever coverLetter text or evidence changes
  useEffect(() => {
    if (!editorRef.current) return;
    const html = buildEditorHtml(coverLetter || "", currentDispute, evidence);
    skipInput.current = true;
    editorRef.current.innerHTML = html;
    skipInput.current = false;
  }, [coverLetter, evidence]);

  const handleInput = useCallback(() => {
    if (skipInput.current || !editorRef.current) return;
    const raw = extractRawText(editorRef.current.innerHTML);
    setCoverLetter(raw);
  }, [setCoverLetter]);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const insertTable = () => {
    const cols = 3, rows = 3;
    let t = `<table style="border-collapse:collapse;width:100%;margin:12px 0;box-shadow:0 1px 4px rgba(37,99,235,0.08);overflow:hidden;"><thead><tr>`;
    for (let c = 0; c < cols; c++) t += `<th style="border:1.5px solid #2563eb;padding:7px 12px;text-align:left;font-size:12px;background:#1d4ed8;color:#ffffff;font-weight:600;">Header ${c + 1}</th>`;
    t += `</tr></thead><tbody>`;
    for (let r = 0; r < rows - 1; r++) {
      t += `<tr style="background:${r % 2 === 0 ? "#ffffff" : "#eff6ff"};">`;
      for (let c = 0; c < cols; c++) t += `<td style="border:1px solid #93c5fd;padding:7px 12px;font-size:12px;color:#1e293b;">Cell</td>`;
      t += `</tr>`;
    }
    t += `</tbody></table><br>`;
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, t);
  };

  const insertEvidence = (ev) => {
    setEvDropdownOpen(false);
    editorRef.current?.focus();
    const name = (ev.file_name || "").toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/.test(name);
    let html;
    if (isImage) {
      html = `<div class="ev-block" data-ev-type="${ev.evidence_type}" data-ev-url="${ev.file_url}" data-ev-name="${ev.file_name}" contenteditable="false" style="border:1.5px dashed #94a3b8;border-radius:6px;padding:8px;margin:8px 0;background:#f8fafc;display:block;">
        <p style="font-size:11px;color:#64748b;margin:0 0 4px 0;">${ev.evidence_type}: ${ev.file_name}</p>
        <img src="${ev.file_url}" alt="${ev.file_name}" style="max-width:100%;max-height:400px;border:1px solid #e2e8f0;border-radius:4px;display:block;" crossorigin="anonymous" />
      </div><br>`;
    } else {
      html = `<a href="${ev.file_url}" target="_blank" style="color:#0D50B8;">${ev.file_name}</a><br>`;
    }
    document.execCommand("insertHTML", false, html);
    handleInput();
  };

  const addTableRow = () => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const cell = sel.anchorNode?.parentElement?.closest("td,th");
    const row = cell?.closest("tr");
    if (!row) return;
    const cols = row.cells.length;
    const newRow = document.createElement("tr");
    for (let i = 0; i < cols; i++) {
      const td = document.createElement("td");
      td.style.cssText = "border:1px solid #cbd5e1;padding:6px 10px;font-size:12px;";
      td.textContent = "";
      newRow.appendChild(td);
    }
    row.parentElement.appendChild(newRow);
    handleInput();
  };

  const addTableCol = () => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const cell = sel.anchorNode?.parentElement?.closest("td,th");
    const table = cell?.closest("table");
    if (!table) return;
    table.querySelectorAll("tr").forEach((row, ri) => {
      const el = ri === 0 ? document.createElement("th") : document.createElement("td");
      el.style.cssText = ri === 0
        ? "border:1px solid #cbd5e1;padding:6px 10px;text-align:left;font-size:12px;background:#f8fafc;"
        : "border:1px solid #cbd5e1;padding:6px 10px;font-size:12px;";
      el.textContent = ri === 0 ? "Header" : "Cell";
      row.appendChild(el);
    });
    handleInput();
  };

  // PDF export: capture the editor page visually with html2canvas
  const exportPDF = async () => {
    if (!editorRef.current) return;
    const pageEl = editorRef.current;

    // Wait for images to load
    const imgs = Array.from(pageEl.querySelectorAll("img"));
    await Promise.all(imgs.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(res => { img.onload = res; img.onerror = res; });
    }));

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentW = pdfW - margin * 2;
    const contentH = (canvas.height / canvas.width) * contentW;

    // If content fits in one page
    if (contentH + margin * 2 <= pdfH) {
      pdf.addImage(imgData, "JPEG", margin, margin, contentW, contentH);
    } else {
      // Slice into pages
      const pageContentH = pdfH - margin * 2;
      const totalPages = Math.ceil(contentH / pageContentH);
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const srcY = (page * pageContentH / contentH) * canvas.height;
        const srcH = Math.min((pageContentH / contentH) * canvas.height, canvas.height - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        sliceCanvas.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
        const sliceH = (srcH / canvas.height) * contentH;
        pdf.addImage(sliceData, "JPEG", margin, margin, contentW, sliceH);
      }
    }

    pdf.save(`cover_letter_${currentDispute.case_id}.pdf`);
  };

  const ToolBtn = ({ title, onClick, children }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-0.5"
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Action row */}
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
          {savingCL ? "Saving..." : "Save"}
        </Button>
        <Button variant="outline" size="sm" onClick={exportPDF} disabled={!hasCoverLetter}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Editor */}
      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200 flex-wrap">
          <ToolBtn title="Bold" onClick={() => exec("bold")}><Bold className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Italic" onClick={() => exec("italic")}><Italic className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Underline" onClick={() => exec("underline")}><Underline className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}><Strikethrough className="w-3.5 h-3.5" /></ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolBtn title="Align Left" onClick={() => exec("justifyLeft")}><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Align Center" onClick={() => exec("justifyCenter")}><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Align Right" onClick={() => exec("justifyRight")}><AlignRight className="w-3.5 h-3.5" /></ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolBtn title="Bullet List" onClick={() => exec("insertUnorderedList")}><List className="w-3.5 h-3.5" /></ToolBtn>
          <ToolBtn title="Numbered List" onClick={() => exec("insertOrderedList")}><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolBtn title="Insert Table (3×3)" onClick={insertTable}><Table className="w-3.5 h-3.5" /><span className="text-xs">Table</span></ToolBtn>
          <ToolBtn title="Add Row" onClick={addTableRow}><span className="text-xs font-medium">+Row</span></ToolBtn>
          <ToolBtn title="Add Column" onClick={addTableCol}><span className="text-xs font-medium">+Col</span></ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <select className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white text-slate-600"
            onChange={e => exec("fontSize", e.target.value)} defaultValue="3">
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt</option>
            <option value="4">14pt</option>
            <option value="5">18pt</option>
            <option value="6">24pt</option>
          </select>
          <select className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white text-slate-600 ml-1"
            onChange={e => exec("formatBlock", e.target.value)} defaultValue="p">
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
        </div>

        {/* A4 page */}
        <div className="bg-slate-100 p-6 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={e => {
              if (e.key === "Tab") {
                const cell = window.getSelection()?.anchorNode?.parentElement?.closest("td,th");
                if (cell) {
                  e.preventDefault();
                  const all = Array.from(cell.closest("table").querySelectorAll("td,th"));
                  const next = all[all.indexOf(cell) + 1];
                  if (next) {
                    next.focus();
                    const r = document.createRange();
                    r.selectNodeContents(next);
                    r.collapse(false);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(r);
                  }
                }
              }
            }}
            className="bg-white mx-auto shadow-md rounded-sm min-h-[500px] focus:outline-none"
            style={{
              maxWidth: "750px",
              padding: "48px 56px",
              fontFamily: "'Times New Roman', Times, serif",
              fontSize: "13px",
              lineHeight: "1.8",
              color: "#1e293b",
              caretColor: "#0D50B8",
            }}
            data-placeholder="Start typing your cover letter here. Use {{evidence:TypeName}} to embed uploaded evidence images inline..."
          />
        </div>
      </div>

      {/* Submit to Portal */}
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
                <span className="text-slate-400">{hasCoverLetter ? "Ready to export as PDF" : "Write & save above"}</span>
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
                <Button size="sm" variant="outline" className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  disabled={!canSubmit} onClick={onApiAutomation}>
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
          font-size: 12px;
        }
        [contenteditable] table td,
        [contenteditable] table th {
          border: 1px solid #cbd5e1 !important;
          padding: 6px 10px !important;
          min-width: 60px;
        }
        [contenteditable] table td:focus,
        [contenteditable] table th:focus {
          outline: 2px solid #0D50B8;
          outline-offset: -2px;
        }
        [contenteditable] .ev-block {
          user-select: none;
        }
        [contenteditable] .ev-placeholder {
          user-select: none;
        }
      `}</style>
    </div>
  );
}