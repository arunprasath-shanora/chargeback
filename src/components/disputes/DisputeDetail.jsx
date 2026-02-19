import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Pencil, Upload, FileText, Trash2, RefreshCw, Wand2 } from "lucide-react";
import DisputeForm from "./DisputeForm";

const statusColors = {
  new: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  pending: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
    <p className="text-sm text-slate-800 font-medium">{value || "—"}</p>
  </div>
);

const SectionGrid = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">{title}</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

export default function DisputeDetail({ dispute, projects, onBack, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [evidence, setEvidence] = useState([]);
  const [evidenceTypes, setEvidenceTypes] = useState([]);
  const [coverLetter, setCoverLetter] = useState(dispute.cover_letter_content || "");
  const [coverTemplates, setCoverTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(false);
  const [savingCL, setSavingCL] = useState(false);
  const [currentDispute, setCurrentDispute] = useState(dispute);

  useEffect(() => {
    Promise.all([
      base44.entities.DisputeEvidence.filter({ dispute_id: dispute.id }),
      base44.entities.EvidenceType.list(),
      base44.entities.CoverLetterTemplate.list(),
    ]).then(([ev, et, ct]) => {
      setEvidence(ev);
      setEvidenceTypes(et);
      setCoverTemplates(ct);
    }).catch(() => {});
  }, [dispute.id]);

  const handleFileUpload = async (e, evidenceTypeName) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.DisputeEvidence.create({
      dispute_id: dispute.id,
      evidence_type: evidenceTypeName,
      file_url,
      file_name: file.name,
      file_size_mb: +(file.size / (1024 * 1024)).toFixed(2),
      status: "uploaded",
    });
    const updated = await base44.entities.DisputeEvidence.filter({ dispute_id: dispute.id });
    setEvidence(updated);
    setUploading(false);
  };

  const handleDeleteEvidence = async (id) => {
    await base44.entities.DisputeEvidence.delete(id);
    setEvidence(ev => ev.filter(e => e.id !== id));
  };

  const handleApplyTemplate = () => {
    const tpl = coverTemplates.find(t => t.id === selectedTemplate);
    if (!tpl) return;
    let content = tpl.content || "";
    // Replace dynamic placeholders
    Object.entries(currentDispute).forEach(([k, v]) => {
      if (v !== undefined && v !== null) content = content.replaceAll(`{{${k}}}`, String(v));
    });
    setCoverLetter(content);
  };

  const handleGenerateCoverLetter = async () => {
    setGeneratingCL(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a professional chargeback dispute cover letter for the following case:
Case ID: ${currentDispute.case_id}
Reason Code: ${currentDispute.reason_code}
Reason Category: ${currentDispute.reason_category}
Dispute Amount: ${currentDispute.dispute_currency} ${currentDispute.dispute_amount}
Dispute Date: ${currentDispute.dispute_date}
Transaction ID: ${currentDispute.transaction_id}
Transaction Date: ${currentDispute.transaction_date}
Product Type: ${currentDispute.product_type}
Card Type: ${currentDispute.card_type}
Cardholder: ${currentDispute.cardholder_name}
Customer: ${currentDispute.customer_name}
Business Unit: ${currentDispute.business_unit}

Write a formal, concise cover letter defending against this chargeback. Include all relevant dispute details. Use professional language.`,
    });
    setCoverLetter(result);
    setGeneratingCL(false);
  };

  const handleSaveCoverLetter = async () => {
    setSavingCL(true);
    const updated = await base44.entities.Dispute.update(currentDispute.id, { cover_letter_content: coverLetter });
    setCurrentDispute(prev => ({ ...prev, cover_letter_content: coverLetter }));
    setSavingCL(false);
  };

  if (editing) {
    return (
      <DisputeForm
        dispute={currentDispute}
        projects={projects}
        onSave={async () => {
          const updated = await base44.entities.Dispute.filter({ case_id: currentDispute.case_id });
          const d = updated[0] || currentDispute;
          setCurrentDispute(d);
          onUpdate(d);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{currentDispute.case_id}</h1>
            <Badge className={`${statusColors[currentDispute.status] || "bg-slate-100"} border-0`}>
              {currentDispute.status?.replace("_", " ")}
            </Badge>
            {currentDispute.missing_evidence === "Yes" && (
              <Badge className="bg-red-100 text-red-800 border-0">Missing Evidence</Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{currentDispute.business_unit} {currentDispute.reason_code ? `· ${currentDispute.reason_code}` : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="details" className="text-xs">Case Details</TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs">Evidence</TabsTrigger>
          <TabsTrigger value="cover_letter" className="text-xs">Cover Letter</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-5">
          <SectionGrid title="Case Information">
            <InfoRow label="Case ID" value={currentDispute.case_id} />
            <InfoRow label="Case Type" value={currentDispute.case_type} />
            <InfoRow label="Status" value={currentDispute.status?.replace("_", " ")} />
            <InfoRow label="Assigned To" value={currentDispute.assigned_to} />
            <InfoRow label="SLA Deadline" value={currentDispute.sla_deadline} />
            <InfoRow label="Business Unit" value={currentDispute.business_unit} />
            <InfoRow label="Sub Unit" value={currentDispute.sub_unit_name} />
            <InfoRow label="Processor" value={currentDispute.processor} />
            <InfoRow label="Merchant ID" value={currentDispute.merchant_id} />
            <InfoRow label="DBA Name" value={currentDispute.dba_name} />
          </SectionGrid>

          <SectionGrid title="Dispute Details">
            <InfoRow label="Dispute Date" value={currentDispute.dispute_date} />
            <InfoRow label="Dispute Amount" value={`${currentDispute.dispute_currency || ""} ${currentDispute.dispute_amount?.toLocaleString() || "—"}`} />
            <InfoRow label="Reason Code" value={currentDispute.reason_code} />
            <InfoRow label="Reason Category" value={currentDispute.reason_category} />
            <InfoRow label="ARN Number" value={currentDispute.arn_number} />
            <InfoRow label="Cardholder Name" value={currentDispute.cardholder_name} />
          </SectionGrid>

          <SectionGrid title="Card & Authorization">
            <InfoRow label="Card Type" value={currentDispute.card_type} />
            <InfoRow label="Card BIN" value={currentDispute.card_bin_first6} />
            <InfoRow label="Card Last 4" value={currentDispute.card_last4} />
            <InfoRow label="Auth Date" value={currentDispute.authorization_date} />
            <InfoRow label="Auth Amount" value={currentDispute.authorization_amount} />
            <InfoRow label="AVS Match" value={currentDispute.avs_match} />
            <InfoRow label="CVV Match" value={currentDispute.cvv_match} />
            <InfoRow label="3D Secure" value={currentDispute.three_d_secure} />
          </SectionGrid>

          <SectionGrid title="Transaction">
            <InfoRow label="Transaction ID" value={currentDispute.transaction_id} />
            <InfoRow label="Transaction Date" value={currentDispute.transaction_date} />
            <InfoRow label="Transaction Amount" value={`${currentDispute.transaction_currency || ""} ${currentDispute.transaction_amount?.toLocaleString() || "—"}`} />
            <InfoRow label="Country" value={currentDispute.transaction_country} />
            <InfoRow label="State" value={currentDispute.transaction_state} />
            <InfoRow label="Billing Zip" value={currentDispute.billing_zip_code} />
          </SectionGrid>

          <SectionGrid title="Customer & Order">
            <InfoRow label="Customer Name" value={currentDispute.customer_name} />
            <InfoRow label="Customer Email" value={currentDispute.customer_email} />
            <InfoRow label="Customer Phone" value={currentDispute.customer_phone} />
            <InfoRow label="Customer IP" value={currentDispute.customer_ip} />
            <InfoRow label="Product Name" value={currentDispute.product_name} />
            <InfoRow label="Product Type" value={currentDispute.product_type} />
            <InfoRow label="Service Start" value={currentDispute.service_start_date} />
            <InfoRow label="Service End" value={currentDispute.service_end_date} />
          </SectionGrid>

          {currentDispute.notes && (
            <Card className="border-slate-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{currentDispute.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">Upload evidence files for this dispute.</p>

          {/* Evidence by type */}
          <div className="space-y-3">
            {evidenceTypes.filter(et => et.status === "active").map(et => {
              const uploaded = evidence.filter(e => e.evidence_type === et.name);
              return (
                <Card key={et.id} className="border-slate-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{et.name}</p>
                        <p className="text-xs text-slate-400">{et.upload_requirement === "mandatory" ? "Required" : "Optional"} · Max {et.max_file_size_mb}MB</p>
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, et.name)} disabled={uploading} />
                        <Button size="sm" variant="outline" asChild>
                          <span><Upload className="w-3.5 h-3.5 mr-1" /> Upload</span>
                        </Button>
                      </label>
                    </div>
                    {uploaded.length > 0 && (
                      <div className="space-y-2">
                        {uploaded.map(ev => (
                          <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <a href={ev.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#0D50B8] hover:underline flex-1 truncate">{ev.file_name}</a>
                            <Badge className="bg-green-100 text-green-800 border-0 text-xs">{ev.status}</Badge>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDeleteEvidence(ev.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {evidenceTypes.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">No evidence types configured. Add them in Master Setup.</p>
            )}
          </div>

          {/* General uploads not tied to a type */}
          <Card className="border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-slate-800">Other Evidence</p>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, "Other")} disabled={uploading} />
                  <Button size="sm" variant="outline" asChild>
                    <span><Upload className="w-3.5 h-3.5 mr-1" /> Upload</span>
                  </Button>
                </label>
              </div>
              {evidence.filter(e => e.evidence_type === "Other").map(ev => (
                <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg mb-2">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={ev.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#0D50B8] hover:underline flex-1 truncate">{ev.file_name}</a>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDeleteEvidence(ev.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cover_letter" className="mt-4 space-y-4">
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
            <Button variant="outline" size="sm" onClick={handleApplyTemplate} disabled={!selectedTemplate}>Apply Template</Button>
            <Button variant="outline" size="sm" onClick={handleGenerateCoverLetter} disabled={generatingCL}>
              <Wand2 className="w-3.5 h-3.5 mr-1" />
              {generatingCL ? "Generating..." : "AI Generate"}
            </Button>
            <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" size="sm" onClick={handleSaveCoverLetter} disabled={savingCL}>
              {savingCL ? "Saving..." : "Save"}
            </Button>
          </div>

          <Textarea
            className="min-h-[400px] font-mono text-sm"
            placeholder="Cover letter content will appear here. Use a template or AI generate..."
            value={coverLetter}
            onChange={e => setCoverLetter(e.target.value)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}