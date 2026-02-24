import React, { useEffect, useRef, useState } from "react";

const galleryItems = [
  { emoji: "📊", label: "Production Dashboard", sub: "Live KPIs, win rates, SLA alerts", bg: "from-blue-700 to-indigo-800" },
  { emoji: "🤖", label: "AI Win Prediction", sub: "Probability score, factor analysis", bg: "from-violet-700 to-purple-800" },
  { emoji: "📋", label: "Dispute Detail View", sub: "Evidence, cover letter, case history", bg: "from-slate-700 to-slate-800" },
  { emoji: "📦", label: "Inventory Manager", sub: "SLA tracking, bulk assignment", bg: "from-emerald-700 to-teal-800" },
  { emoji: "📈", label: "Analytics & Reports", sub: "Anomaly detection, trend charts", bg: "from-cyan-700 to-blue-800" },
  { emoji: "🔗", label: "Case Chain Tracking", sub: "1CB → 2CB → Arb with net recovery", bg: "from-orange-700 to-red-800" },
  { emoji: "⚡", label: "Automation Pipeline", sub: "Zero-touch end-to-end processing", bg: "from-pink-700 to-rose-800" },
  { emoji: "🗄️", label: "Master Data Export", sub: "Full chain columns, CSV export", bg: "from-amber-700 to-yellow-800" },
];

// Duplicate for seamless loop
const ITEMS = [...galleryItems, ...galleryItems];

export default function FeatureGallery() {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let animationId;
    let pos = 0;
    const speed = 0.5; // px per frame
    const totalWidth = track.scrollWidth / 2;

    const animate = () => {
      if (!paused) {
        pos += speed;
        if (pos >= totalWidth) pos = 0;
        track.style.transform = `translateX(-${pos}px)`;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [paused]);

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <p className="text-[#0D50B8] text-sm font-bold tracking-widest uppercase mb-3">Platform Gallery</p>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">See the platform in action</h2>
        <p className="text-slate-500 text-lg max-w-xl mx-auto">A live preview of every major screen — hover to pause.</p>
      </div>

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />

        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-5 will-change-transform"
            style={{ width: "max-content" }}
          >
            {ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-64 rounded-2xl overflow-hidden border border-slate-100 shadow-md hover:shadow-xl transition-shadow group"
              >
                <div className={`bg-gradient-to-br ${item.bg} h-40 flex items-center justify-center`}>
                  <div className="text-center">
                    <div className="text-6xl mb-1 group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}