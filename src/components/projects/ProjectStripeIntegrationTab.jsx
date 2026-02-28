import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ProjectStripeIntegrationTab({ stripeConfig, onChange }) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const config = stripeConfig || {};
  const update = (k, v) => onChange({ ...config, [k]: v });

  const testConnection = async () => {
    if (!config.stripe_secret_key) return;
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await base44.functions.invoke('fetchStripeVampData', {
        stripe_secret_key: config.stripe_secret_key,
        period_month: new Date().toISOString().slice(0, 7),
      });
      if (resp.data?.success) {
        setTestResult({ ok: true, msg: `Connected! Merchant: ${resp.data.summary.merchant_name} (${resp.data.summary.merchant_id})` });
      } else {
        setTestResult({ ok: false, msg: resp.data?.error || 'Connection failed' });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#635BFF] flex items-center justify-center text-white font-bold text-sm">S</div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Stripe Integration</p>
          <p className="text-xs text-slate-400">Fetch TC05 (settled transactions) and TC15 (disputes) directly from Stripe</p>
        </div>
        <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer"
          className="ml-auto text-xs text-[#0D50B8] hover:underline flex items-center gap-1">
          Get API Key <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Card className="border-slate-100">
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Stripe Secret Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={config.stripe_secret_key || ""}
                  onChange={e => update("stripe_secret_key", e.target.value)}
                  placeholder="sk_live_... or sk_test_..."
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowKey(v => !v)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={testConnection} disabled={testing || !config.stripe_secret_key}>
                {testing ? "Testing…" : "Test Connection"}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Use a <strong>restricted key</strong> with read-only access to Charges and Disputes for security.
            </p>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${testResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {testResult.msg}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Default Card Network</label>
            <select
              value={config.default_card_network || "Visa"}
              onChange={e => update("default_card_network", e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-48"
            >
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">Stripe API doesn't expose card network per charge; this sets the default for VAMP records.</p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <strong>Note on TC40:</strong> Stripe does not expose TC40 (Early Fraud Warnings) via their standard Disputes API. 
        TC40 data must be imported manually or via CSV. TC15 (disputes) and TC05 (settled charges) are fetched automatically.
      </div>
    </div>
  );
}