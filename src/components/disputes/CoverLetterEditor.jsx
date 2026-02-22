import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, Send, Globe, Bold, Italic, Underline, Table, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

// Renders markdown content including tables
function MarkdownPreview({ content }) {
  return (
    <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
      <ReactMarkdown
        components={{
          table: ({ children }) => (
            <table className="w-full border-collapse border border-slate-300 my-3 text-xs">
              {children}
            </table>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-300 px-3 py-2 text-slate-600">
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed">{children}</p>
          ),
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
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
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef(null);

  // Replace {{field}} placeholders with actual dispute values for preview
  const resolvedContent = React.useMemo(() => {
    if (!coverLetter) return "";
    let result = coverLetter;
    // Replace dispute fields
    Object.entries(currentDispute).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        result = result.replaceAll(`{{${k}}}`, String(v));
      }
    });
    // Replace evidence placeholders with image links or filenames
    result = result.replaceAll(/\{\{evidence:([^}]+)\}\}/g, (match, typeName) => {
      const ev = evidence.filter(e => e.evidence_type === typeName);
      if (ev.length === 0) return `*[No ${typeName} uploaded]*`;
      return ev.map(e => {
        const name = (e.file_name || "").toLowerCase();
        const isImage = name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp") || name.endsWith(".gif");
        if (isImage) return `\n\n![${e.file_name}](${e.file_url})\n`;
        return `[${e.file_name}](${e.file_url})`;
      }).join("\n");
    });
    return result;
  }, [coverLetter, currentDispute, evidence]);

  const wrapSelection = (before, after) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const current = coverLetter || "";
    const selected = current.slice(start, end) || "text";
    const newContent = current.slice(0, start) + before + selected + after + current.slice(end);
    setCoverLetter(newContent);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  };

  const insertAtCursor = (text) => {
    const ta = textareaRef.current;
    if (!ta) { setCoverLetter((coverLetter || "") + text); return; }
    const start = ta.selectionStart;
    const current = coverLetter || "";
    setCoverLetter(current.slice(0, start) + text + current.slice(start));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); }, 0);
  };

  const insertTable = () => {
    const tableTemplate = "\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n";
    insertAtCursor(tableTemplate);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar row */}
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
        <Button variant="outline" size="sm" onClick={onExportPDF} disabled={!hasCoverLetter} title="Export as PDF">
          <Download className="w-3.5 h-3.5 mr-1" /> Export PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreview(v => !v)}
          className={preview ? "bg-blue-50 border-blue-300 text-blue-700" : ""}
        >
          {preview ? <><EyeOff className="w-3.5 h-3.5 mr-1" /> Edit</> : <><Eye className="w-3.5 h-3.5 mr-1" /> Preview</>}
        </Button>
      </div>

      {/* Format toolbar (only in edit mode) */}
      {!preview && (
        <div className="flex items-center gap-1 px-2 py-1.5 border border-b-0 border-slate-200 rounded-t-md bg-slate-50">
          <button type="button" onClick={() => wrapSelection("**", "**")} title="Bold" className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => wrapSelection("_", "_")} title="Italic" className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => wrapSelection("__", "__")} title="Underline" className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
            <Underline className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <button type="button" onClick={insertTable} title="Insert table" className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-1 text-xs">
            <Table className="w-3.5 h-3.5" /> Table
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <span className="text-[10px] text-slate-400">Select text then click format. Placeholders like <code className="bg-slate-200 px-0.5 rounded text-[9px]">{"{{case_id}}"}</code> are replaced in preview.</span>
        </div>
      )}

      {/* Editor / Preview */}
      {preview ? (
        <div className="border border-slate-200 rounded-lg bg-white p-6 min-h-[420px]">
          {/* Header */}
          <div className="border-b border-slate-200 pb-4 mb-4">
            <p className="text-base font-bold text-slate-800">Chargeback Dispute Cover Letter</p>
            <p className="text-xs text-slate-400 mt-0.5">Case ID: {currentDispute.case_id} | Date: {new Date().toLocaleDateString()}</p>
          </div>

          {resolvedContent ? (
            <MarkdownPreview content={resolvedContent} />
          ) : (
            <p className="text-slate-300 italic text-sm">No cover letter content yet. Write or generate one in edit mode.</p>
          )}

          {/* Evidence images inline */}
          {(() => {
            const imageEvidence = evidence.filter(ev => {
              const name = (ev.file_name || "").toLowerCase();
              return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".gif") || name.endsWith(".webp");
            });
            // Only show images NOT already embedded via {{evidence:...}} tags
            const embeddedUrls = evidence.filter(ev => coverLetter?.includes(`{{evidence:${ev.evidence_type}}}`)).map(ev => ev.file_url);
            const unembedded = imageEvidence.filter(ev => !embeddedUrls.includes(ev.file_url));
            if (unembedded.length === 0) return null;
            return (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Supporting Evidence (appended in PDF)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {unembedded.map(ev => (
                    <div key={ev.id} className="space-y-1">
                      <a href={ev.file_url} target="_blank" rel="noreferrer">
                        <img src={ev.file_url} alt={ev.file_name} className="w-full h-28 object-cover rounded-lg border border-slate-200 hover:opacity-90 cursor-zoom-in" />
                      </a>
                      <p className="text-[10px] text-slate-400 truncate">{ev.evidence_type} — {ev.file_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className="w-full border border-slate-200 rounded-b-md px-3 py-2 text-sm min-h-[420px] focus:outline-none focus:ring-1 focus:ring-[#0D50B8] resize-y font-mono leading-relaxed rounded-t-none"
          placeholder={"Dear Sir/Madam,\n\nCase ID: {{case_id}}\nDispute Date: {{chargeback_date}}\nAmount: {{chargeback_currency}} {{chargeback_amount}}\nReason Code: {{reason_code}}\n\nEvidence: {{evidence:Invoice}}\n\n| Field | Value |\n|-------|-------|\n| ARN   | {{arn_number}} |\n| Card  | {{card_last4}} |\n\nYours sincerely,\nDispute Team"}
          value={coverLetter}
          onChange={e => setCoverLetter(e.target.value)}
        />
      )}

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
    </div>
  );
}