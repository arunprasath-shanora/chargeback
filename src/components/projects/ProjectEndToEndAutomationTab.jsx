import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Zap, AlertTriangle,
  CheckCircle2, RefreshCw, Send, Database, Globe, ShoppingCart, CreditCard, Shield
} from "lucide-react";

const SOURCE_TYPES = [
  { value: "processor_portal", label: "Processor Portal", icon: CreditCard, color: "blue" },
  { value: "crm", label: "CRM System", icon: Database, color: "purple" },
  { value: "payment_gateway", label: "Payment Gateway", icon: Globe, color: "green" },
  { value: "order_management", label: "Order Management (OMS)", icon: ShoppingCart, color: "orange" },
  { value: "fraud_tool", label: "Fraud Tool", icon: Shield, color: "red" },
  { value: "custom", label: "Custom / Other", icon: Database, color: "slate" },
];

const CARD_NETWORKS = ["Visa", "Mastercard", "American Express", "Discover"];
const CASE_TYPES = ["First Chargeback", "Second Chargeback", "Pre-Arbitration", "Arbitration", "Retrieval Request"];
const DISPUTE_FIELDS = [
  "transaction_id", "transaction_date", "transaction_amount", "transaction_currency",
  "cardholder_name", "customer_email", "customer_phone", "customer_id",
  "card_last4", "card_bin_first6", "authorization_code", "authorization_date",
  "arn_number", "reason_code", "reason_category",
  "avs_match", "cvv_match", "three_d_secure",
  "product_name", "product_type", "sale_type",
  "service_start_date", "service_end_date", "billing_zip_code",
  "customer_ip", "customer_type"
];

const colorMap = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  green: "bg-green-50 text-green-700 border-green-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  red: "bg-red-50 text-red-700 border-red-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

const F = ({ label, children, span, hint }) => (
  <div className={`space-y-1 ${span ? `col-span-${span}` : ""}`}>
    <Label className="text-xs font-medium text-slate-600">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
  </div>
);

function DataSourceCard({ source, index, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [showMappings, setShowMappings] = useState(false);
  const update = (k, v) => onChange({ ...source, [k]: v });
  const updateMapping = (ourField, theirPath) => {
    const m = { ...(source.api_field_mapping || {}) };
    if (theirPath === "") delete m[ourField]; else m[ourField] = theirPath;
    update("api_field_mapping", m);
  };
  const toggleFields = (field) => {
    const arr = source.fields_provided || [];
    update("fields_provided", arr.includes(field) ? arr.filter(f => f !== field) : [...arr, field]);
  };

  const sourceInfo = SOURCE_TYPES.find(s => s.value === source.source_type) || SOURCE_TYPES[5];
  const Icon = sourceInfo.icon;

  return (
    <Card className="border-slate-100">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorMap[sourceInfo.color]}`}>
            <Icon className="w-3.5 h-3.5" /> {sourceInfo.label}
          </span>
          <span className="text-sm font-medium text-slate-800">{source.source_label || `Source #${index + 1}`}</span>
          <span className="text-xs text-slate-400">Priority {source.priority || index + 1}</span>
          {!source.enabled && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Disabled</span>}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Switch checked={source.enabled !== false} onCheckedChange={v => update("enabled", v)} />
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-4">
          {/* Basic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            <F label="Source Label">
              <Input value={source.source_label || ""} onChange={e => update("source_label", e.target.value)} placeholder="e.g. Fiserv Portal" />
            </F>
            <F label="Source Type">
              <Select value={source.source_type || ""} onValueChange={v => update("source_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{SOURCE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Fetch Method">
              <Select value={source.fetch_method || ""} onValueChange={v => update("fetch_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">API / Webhook</SelectItem>
                  <SelectItem value="browser">Browser / Scraping</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="Priority (1 = first)">
              <Input type="number" min={1} value={source.priority || index + 1} onChange={e => update("priority", parseInt(e.target.value))} />
            </F>
          </div>

          {/* API Config */}
          {source.fetch_method === "api" && (
            <div className="space-y-3 bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">API Configuration</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Base URL" span={2}>
                  <Input value={source.api_base_url || ""} onChange={e => update("api_base_url", e.target.value)} placeholder="https://api.processor.com/v1" />
                </F>
                <F label="Lookup Endpoint" hint="Use {case_id}, {transaction_id}, {arn} as placeholders">
                  <Input value={source.api_lookup_endpoint || ""} onChange={e => update("api_lookup_endpoint", e.target.value)} placeholder="/disputes/{case_id}" />
                </F>
                <F label="Lookup By">
                  <Select value={source.api_lookup_by || ""} onValueChange={v => update("api_lookup_by", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="case_id">Case ID</SelectItem>
                      <SelectItem value="transaction_id">Transaction ID</SelectItem>
                      <SelectItem value="arn">ARN Number</SelectItem>
                      <SelectItem value="merchant_id">Merchant ID</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label="Auth Type">
                  <Select value={source.api_auth_type || ""} onValueChange={v => update("api_auth_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api_key">API Key Header</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="oauth2">OAuth2</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                {(source.api_auth_type === "api_key") && (
                  <>
                    <F label="Header Name"><Input value={source.api_key_header || ""} onChange={e => update("api_key_header", e.target.value)} placeholder="X-API-Key" /></F>
                    <F label="API Key Value"><Input type="password" value={source.api_key_value || ""} onChange={e => update("api_key_value", e.target.value)} /></F>
                  </>
                )}
                {(source.api_auth_type === "bearer") && (
                  <F label="Bearer Token" span={2}><Input type="password" value={source.api_key_value || ""} onChange={e => update("api_key_value", e.target.value)} /></F>
                )}
                {(source.api_auth_type === "basic") && (
                  <>
                    <F label="Username"><Input value={source.api_username || ""} onChange={e => update("api_username", e.target.value)} /></F>
                    <F label="Password"><Input type="password" value={source.api_password || ""} onChange={e => update("api_password", e.target.value)} /></F>
                  </>
                )}
              </div>

              {/* Field mapping */}
              <div>
                <button
                  className="flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900 mt-1"
                  onClick={() => setShowMappings(m => !m)}
                >
                  {showMappings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Response Field Mappings ({Object.keys(source.api_field_mapping || {}).length} mapped)
                </button>
                {showMappings && (
                  <div className="mt-2 bg-white rounded-lg border border-blue-100 p-3 max-h-64 overflow-y-auto space-y-1.5">
                    <p className="text-[11px] text-slate-400 mb-2">Map our field (left) to the API response JSON path (right). Leave blank to skip.</p>
                    {DISPUTE_FIELDS.map(field => (
                      <div key={field} className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 w-44 flex-shrink-0 font-mono">{field}</span>
                        <Input
                          className="h-7 text-xs"
                          placeholder="e.g. data.transaction.id"
                          value={(source.api_field_mapping || {})[field] || ""}
                          onChange={e => updateMapping(field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Browser Config */}
          {source.fetch_method === "browser" && (
            <div className="space-y-3 bg-purple-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Browser / Scraping Configuration</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Login URL"><Input value={source.browser_login_url || ""} onChange={e => update("browser_login_url", e.target.value)} placeholder="https://portal.com/login" /></F>
                <F label="Lookup URL Pattern" hint="Use {case_id} as placeholder">
                  <Input value={source.browser_lookup_url_pattern || ""} onChange={e => update("browser_lookup_url_pattern", e.target.value)} placeholder="https://portal.com/disputes/{case_id}" />
                </F>
                <F label="Username"><Input value={source.browser_username || ""} onChange={e => update("browser_username", e.target.value)} /></F>
                <F label="Password"><Input type="password" value={source.browser_password || ""} onChange={e => update("browser_password", e.target.value)} /></F>
                <F label="Navigation Notes" span={2}>
                  <Textarea value={source.browser_notes || ""} onChange={e => update("browser_notes", e.target.value)} placeholder="Describe how to navigate to the case detail page..." className="min-h-[80px] text-xs" />
                </F>
              </div>
            </div>
          )}

          {/* Fields provided by this source */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fields This Source Provides</p>
            <p className="text-[11px] text-slate-400 mb-2">Check all fields this source can supply. System will use priority order to resolve conflicts.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 bg-slate-50 p-3 rounded-lg">
              {DISPUTE_FIELDS.map(field => (
                <label key={field} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={(source.fields_provided || []).includes(field)}
                    onCheckedChange={() => toggleFields(field)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-[11px] text-slate-700 font-mono">{field}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ProjectEndToEndAutomationTab({ config, onChange }) {
  const cfg = config || {};
  const set = (k, v) => onChange({ ...cfg, [k]: v });
  const setNested = (group, k, v) => onChange({ ...cfg, [group]: { ...(cfg[group] || {}), [k]: v } });

  const sources = cfg.data_sources || [];
  const addSource = () => onChange({
    ...cfg,
    data_sources: [...sources, {
      source_label: "", source_type: "processor_portal", fetch_method: "api",
      enabled: true, priority: sources.length + 1, fields_provided: []
    }]
  });
  const updateSource = (i, val) => onChange({ ...cfg, data_sources: sources.map((s, idx) => idx === i ? val : s) });
  const removeSource = (i) => onChange({ ...cfg, data_sources: sources.filter((_, idx) => idx !== i) });

  const pipeline = cfg.pipeline_steps || {};
  const setPipeline = (k, v) => setNested("pipeline_steps", k, v);
  const failureConfig = cfg.failure_handling || {};
  const setFailure = (k, v) => setNested("failure_handling", k, v);
  const sla = cfg.sla_filter || {};
  const setSla = (k, v) => setNested("sla_filter", k, v);
  const submission = cfg.submission_config || {};
  const setSubmission = (k, v) => setNested("submission_config", k, v);

  const toggleSlaNetwork = (net) => {
    const arr = sla.include_networks || [];
    setSla("include_networks", arr.includes(net) ? arr.filter(n => n !== net) : [...arr, net]);
  };
  const toggleSlaCaseType = (ct) => {
    const arr = sla.include_cases || [];
    setSla("include_cases", arr.includes(ct) ? arr.filter(c => c !== ct) : [...arr, ct]);
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className={`border-2 ${cfg.enabled ? "border-green-200 bg-green-50" : "border-slate-200"}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.enabled ? "bg-green-500" : "bg-slate-300"}`}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">End-to-End Automation Pipeline</p>
                <p className="text-xs text-slate-500">
                  {cfg.enabled
                    ? "Active — system will automatically enrich, build evidence, generate cover letters, and submit disputes"
                    : "Disabled — disputes will require manual processing"}
                </p>
              </div>
            </div>
            <Switch checked={cfg.enabled === true} onCheckedChange={v => set("enabled", v)} />
          </div>

          {cfg.enabled && (
            <div className="mt-4 pt-4 border-t border-green-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Trigger Mode">
                <Select value={cfg.trigger_mode || ""} onValueChange={v => set("trigger_mode", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_inventory_import">On Inventory Import (auto-start)</SelectItem>
                    <SelectItem value="scheduled">Scheduled (fixed time)</SelectItem>
                    <SelectItem value="manual_trigger">Manual Trigger Only</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              {cfg.trigger_mode === "scheduled" && (
                <>
                  <F label="Run Frequency">
                    <Select value={cfg.scheduled_frequency || ""} onValueChange={v => set("scheduled_frequency", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="twice_daily">Twice Daily</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Run Time (HH:MM)">
                    <Input type="time" value={cfg.scheduled_time || ""} onChange={e => set("scheduled_time", e.target.value)} />
                  </F>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {cfg.enabled && (
        <>
          {/* Pipeline Steps */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pipeline Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "enrich_case_details", label: "1. Enrich Case Details", desc: "Pull transaction, customer & order data from configured sources" },
                { key: "fetch_evidence", label: "2. Fetch Evidence", desc: "Auto-collect evidence files from Evidence Connectors" },
                { key: "generate_cover_letter", label: "3. Generate Cover Letter", desc: "AI-draft cover letter using mapped template for reason code" },
                { key: "auto_submit", label: "4. Auto Submit", desc: "Submit completed dispute package to processor" },
                { key: "notify_on_success", label: "Notify on Success", desc: "Send email notification when pipeline completes successfully" },
                { key: "notify_on_failure", label: "Notify on Failure", desc: "Send email notification when any step fails" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                    {key === "auto_submit" && pipeline.auto_submit && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1">
                        <AlertTriangle className="w-3 h-3" /> Configure submission settings below
                      </span>
                    )}
                  </div>
                  <Switch checked={pipeline[key] !== false} onCheckedChange={v => setPipeline(key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Case Detail Data Sources</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">Configure where to pull case details from. Sources are queried in priority order.</p>
                </div>
                <Button size="sm" variant="outline" onClick={addSource}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Source
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sources.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                  No data sources configured. Add sources like Processor Portal, CRM, OMS, or Payment Gateway.
                </div>
              )}
              {sources.map((s, i) => (
                <DataSourceCard
                  key={i} source={s} index={i}
                  onChange={v => updateSource(i, v)}
                  onRemove={() => removeSource(i)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Submission Config */}
          {pipeline.auto_submit && (
            <Card className="border-orange-100 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-600" /> Auto-Submission Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <F label="Submit Method">
                    <Select value={submission.submit_method || ""} onValueChange={v => setSubmission("submit_method", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api">API Endpoint</SelectItem>
                        <SelectItem value="email">Email Submission</SelectItem>
                      </SelectContent>
                    </Select>
                  </F>
                  {submission.submit_method === "api" && (
                    <>
                      <F label="Submit API URL"><Input value={submission.submit_api_url || ""} onChange={e => setSubmission("submit_api_url", e.target.value)} placeholder="https://api.processor.com/submit" /></F>
                      <F label="Auth Type">
                        <Select value={submission.submit_api_auth_type || ""} onValueChange={v => setSubmission("submit_api_auth_type", v)}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="api_key">API Key</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                          </SelectContent>
                        </Select>
                      </F>
                      <F label="API Key / Token"><Input type="password" value={submission.submit_api_key || ""} onChange={e => setSubmission("submit_api_key", e.target.value)} /></F>
                    </>
                  )}
                  {submission.submit_method === "email" && (
                    <>
                      <F label="Submit To Email"><Input value={submission.submit_email_to || ""} onChange={e => setSubmission("submit_email_to", e.target.value)} placeholder="disputes@processor.com" /></F>
                      <F label="Email Subject Template" hint="Use {case_id}, {merchant_id} as placeholders" span={2}>
                        <Input value={submission.submit_email_subject_template || ""} onChange={e => setSubmission("submit_email_subject_template", e.target.value)} placeholder="Dispute Response - {case_id}" />
                      </F>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SLA / Eligibility Filter */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Eligibility Filter (SLA & Case Criteria)</CardTitle>
              <p className="text-xs text-slate-400">Cases not meeting these criteria will be skipped and moved to inventory for manual allocation.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Min Days Remaining" hint="Skip if fewer SLA days remain">
                  <Input type="number" min={0} value={sla.min_days_remaining || ""} onChange={e => setSla("min_days_remaining", parseInt(e.target.value) || "")} placeholder="e.g. 2" />
                </F>
                <F label="Max Chargeback Amount (USD)" hint="Send to manual if over this amount">
                  <Input type="number" min={0} value={sla.max_amount_usd || ""} onChange={e => setSla("max_amount_usd", parseFloat(e.target.value) || "")} placeholder="e.g. 5000" />
                </F>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Include Card Networks (leave unchecked = all)</p>
                <div className="flex flex-wrap gap-2">
                  {CARD_NETWORKS.map(net => (
                    <label key={net} className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100">
                      <Checkbox checked={(sla.include_networks || []).includes(net)} onCheckedChange={() => toggleSlaNetwork(net)} className="h-3.5 w-3.5" />
                      <span className="text-xs text-slate-700">{net}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Include Case Types (leave unchecked = all)</p>
                <div className="flex flex-wrap gap-2">
                  {CASE_TYPES.map(ct => (
                    <label key={ct} className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100">
                      <Checkbox checked={(sla.include_cases || []).includes(ct)} onCheckedChange={() => toggleSlaCaseType(ct)} className="h-3.5 w-3.5" />
                      <span className="text-xs text-slate-700">{ct}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Failure Handling */}
          <Card className="border-red-100 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Failure Handling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="On Failure Action">
                  <Select value={failureConfig.on_failure_action || "move_to_inventory"} onValueChange={v => setFailure("on_failure_action", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="move_to_inventory">Move to Inventory (Manual Allocation)</SelectItem>
                      <SelectItem value="retry_once">Retry Once, then Move to Inventory</SelectItem>
                      <SelectItem value="skip">Skip (Log Only)</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                {failureConfig.on_failure_action === "retry_once" && (
                  <F label="Max Retries">
                    <Input type="number" min={1} max={3} value={failureConfig.max_retries || 1} onChange={e => setFailure("max_retries", parseInt(e.target.value))} />
                  </F>
                )}
              </div>
              <F label="Notify Email(s) on Failure" hint="Comma-separated email addresses">
                <Input
                  value={(failureConfig.notify_emails || []).join(", ")}
                  onChange={e => setFailure("notify_emails", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  placeholder="ops@company.com, manager@company.com"
                />
              </F>
              <div className="bg-white border border-red-100 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> What gets logged</p>
                <p>Every pipeline run (success or failure) is recorded in the Automation Run Log with step-by-step results, failure reason, timestamps, and fallback action taken.</p>
                <p>Failed cases moved to inventory will be tagged with the failure reason so analysts can see what was attempted automatically.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}