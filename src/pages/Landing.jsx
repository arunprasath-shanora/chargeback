import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

const ROI_CALCULATOR_URL = "https://chargeback-recover-pro.base44.app";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6996f53449fb2f4f399c2c75/6daefa08f_sign-no-tagline-bg-fff-1500x1500.png";

const features = [
  {
    icon: "⚡",
    title: "AI-Powered Dispute Resolution",
    desc: "Leverage cutting-edge AI to analyze disputes, predict win probability, and auto-generate compelling cover letters — all in seconds.",
  },
  {
    icon: "🔗",
    title: "Full Case Chain Tracking",
    desc: "Track the complete lifecycle of every chargeback — from First Chargeback through Second Chargeback, Pre-Arbitration, and Arbitration — in one unified view.",
  },
  {
    icon: "📦",
    title: "Smart Inventory Management",
    desc: "Automatically ingest, assign, and convert dispute inventory from all major processors. Never miss a deadline again with SLA tracking.",
  },
  {
    icon: "📊",
    title: "Advanced Reporting & Analytics",
    desc: "Understand win rates, anomalies, and revenue recovery trends across any dimension — by processor, reason code, card network, and more.",
  },
  {
    icon: "🤖",
    title: "End-to-End Automation",
    desc: "Configure fully automated pipelines that enrich case data, fetch evidence, generate responses, and submit disputes without any manual effort.",
  },
  {
    icon: "🔒",
    title: "Role-Based Access & Audit Logs",
    desc: "Enterprise-grade security with granular role permissions, full audit trail, and compliance-ready activity logs.",
  },
];

const stats = [
  { value: "85%", label: "Average Win Rate" },
  { value: "10x", label: "Faster Case Processing" },
  { value: "$2M+", label: "Revenue Recovered" },
  { value: "99.9%", label: "Uptime SLA" },
];

const steps = [
  { num: "01", title: "Import Your Cases", desc: "Upload via CSV, webhook, or API from Fiserv, Stripe, Worldpay and more." },
  { num: "02", title: "AI Enriches & Analyses", desc: "Our AI fetches evidence, scores win probability, and drafts your cover letter." },
  { num: "03", title: "Review & Submit", desc: "One-click review and submission — or fully automate the entire pipeline." },
  { num: "04", title: "Track & Win", desc: "Monitor outcomes, track recovery amounts, and optimize your strategy over time." },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .hero-gradient { background: linear-gradient(135deg, #0D50B8 0%, #1a3a8c 40%, #0a2260 100%); }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(13,80,184,0.12); }
        .feature-card { transition: all 0.25s ease; }
        .glow { box-shadow: 0 0 40px rgba(13,80,184,0.3); }
        .btn-primary { background: linear-gradient(135deg, #0D50B8, #1a6cf0); transition: all 0.2s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(13,80,184,0.35); }
        .stat-bg { background: rgba(255,255,255,0.08); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); }
      `}</style>

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-md" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Shanora" className="w-9 h-9 rounded-full object-cover" />
            <div>
              <p className={`text-[15px] font-bold leading-tight ${scrolled ? "text-slate-800" : "text-white"}`}>Shanora</p>
              <p className={`text-[9px] font-bold tracking-widest uppercase ${scrolled ? "text-[#0D50B8]" : "text-blue-200"}`}>Systems</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className={`hidden md:block text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-[#0D50B8]" : "text-white/80 hover:text-white"}`}>Features</a>
            <a href="#how-it-works" className={`hidden md:block text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-[#0D50B8]" : "text-white/80 hover:text-white"}`}>How it works</a>
            <button
              onClick={handleLogin}
              className="btn-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient min-h-screen flex items-center pt-20 pb-24 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute top-[-120px] right-[-120px] w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-80px] left-[-80px] w-[350px] h-[350px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.02]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-white/90 text-xs font-semibold tracking-wide">AI-Powered Chargeback Management Platform</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
              Win More.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">
                Recover Faster.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/75 mb-10 leading-relaxed max-w-2xl mx-auto">
              Shanora Systems transforms how you manage chargebacks — from inventory intake to AI-driven responses to full chain tracking. Stop losing revenue to disputes you should be winning.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleLogin}
                className="btn-primary text-white font-bold px-8 py-4 rounded-2xl text-base w-full sm:w-auto"
              >
                Get Started — Sign In →
              </button>
              <a href="#features" className="text-white/80 font-semibold px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/10 transition-all text-sm w-full sm:w-auto text-center">
                Explore Features
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto">
            {stats.map(s => (
              <div key={s.label} className="stat-bg rounded-2xl p-5 text-center">
                <p className="text-3xl font-black text-white mb-1">{s.value}</p>
                <p className="text-white/60 text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-[#F4F6FB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#0D50B8] text-sm font-bold tracking-widest uppercase mb-3">Platform Features</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Everything you need to win</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">A complete end-to-end platform built specifically for chargeback analysts and dispute management teams.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="feature-card bg-white rounded-2xl p-7 border border-slate-100">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#0D50B8] text-sm font-bold tracking-widest uppercase mb-3">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">From intake to outcome in 4 steps</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Our streamlined pipeline gets your team from raw dispute data to submitted responses with maximum efficiency.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-[#0D50B8]/30 to-transparent z-0" style={{ width: "calc(100% - 2rem)", left: "calc(100% - 1rem)" }} />
                )}
                <div className="bg-[#F4F6FB] rounded-2xl p-6 relative z-10 h-full">
                  <div className="text-4xl font-black text-[#0D50B8]/20 mb-3">{s.num}</div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hero-gradient py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to take control of your chargebacks?</h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">Join dispute teams already recovering millions in revenue with Shanora Systems.</p>
          <button
            onClick={handleLogin}
            className="btn-primary text-white font-bold px-10 py-4 rounded-2xl text-base glow"
          >
            Sign In to Your Account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Shanora" className="w-8 h-8 rounded-full object-cover" />
            <span className="text-white font-bold text-sm">Shanora Systems</span>
          </div>
          <p className="text-slate-500 text-xs">© 2026 Shanora Systems. All rights reserved.</p>
          <button onClick={handleLogin} className="text-[#0D50B8] text-sm font-semibold hover:text-blue-400 transition-colors">Sign In →</button>
        </div>
      </footer>
    </div>
  );
}