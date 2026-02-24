import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, ImagePlus } from "lucide-react";

const GALLERY_ITEMS = [
  { label: "Production Dashboard", sub: "Live KPIs, win rates, SLA alerts", bg: "from-blue-700 to-indigo-800", emoji: "📊" },
  { label: "AI Win Prediction", sub: "Probability score, factor analysis", bg: "from-violet-700 to-purple-800", emoji: "🤖" },
  { label: "Dispute Detail View", sub: "Evidence, cover letter, case history", bg: "from-slate-700 to-slate-800", emoji: "📋" },
  { label: "Inventory Manager", sub: "SLA tracking, bulk assignment", bg: "from-emerald-700 to-teal-800", emoji: "📦" },
  { label: "Analytics & Reports", sub: "Anomaly detection, trend charts", bg: "from-cyan-700 to-blue-800", emoji: "📈" },
  { label: "Case Chain Tracking", sub: "1CB → 2CB → Arb with net recovery", bg: "from-orange-700 to-red-800", emoji: "🔗" },
  { label: "Automation Pipeline", sub: "Zero-touch end-to-end processing", bg: "from-pink-700 to-rose-800", emoji: "⚡" },
  { label: "Master Data Export", sub: "Full chain columns, CSV export", bg: "from-amber-700 to-yellow-800", emoji: "🗄️" },
];

// Duplicate for seamless loop
const ITEMS = [...GALLERY_ITEMS, ...GALLERY_ITEMS];

export default function FeatureGallery() {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [images, setImages] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(null); // label being uploaded

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    const cached = localStorage.getItem("gallery_images_v3");
    if (cached) setImages(JSON.parse(cached));
  }, []);

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const handleUpload = async (label, file) => {
    if (!file) return;
    setUploading(label);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = { ...images, [label]: file_url };
    setImages(updated);
    localStorage.setItem("gallery_images_v3", JSON.stringify(updated));
    setUploading(null);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let animationId;
    let pos = 0;
    const speed = 0.5;
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
                className="flex-shrink-0 w-72 rounded-2xl overflow-hidden border border-slate-100 shadow-md hover:shadow-xl transition-shadow group"
              >
                <div className={`relative bg-gradient-to-br ${item.bg} h-44 flex items-center justify-center overflow-hidden`}>
                  {images[item.label] ? (
                    <img
                      src={images[item.label]}
                      alt={item.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
                    </div>
                  )}

                  {/* Admin upload overlay — only on first set (idx < GALLERY_ITEMS.length) to avoid duplicate inputs */}
                  {isAdmin && idx < GALLERY_ITEMS.length && (
                    <label
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      onClick={e => e.stopPropagation()}
                    >
                      {uploading === item.label ? (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-white text-xs font-semibold">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <ImagePlus className="w-7 h-7 text-white mb-1" />
                          <span className="text-white text-xs font-semibold">{images[item.label] ? "Replace Image" : "Upload Image"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleUpload(item.label, e.target.files[0])}
                          />
                        </>
                      )}
                    </label>
                  )}
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

      {isAdmin && (
        <p className="text-center text-xs text-slate-400 mt-6">
          🔒 Admin: hover over a card to upload a screenshot
        </p>
      )}
    </section>
  );
}