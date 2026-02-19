import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, FolderOpen, FileText, Settings, ChevronLeft, ChevronRight,
  LogOut, Package, Shield, BookOpen, Users, Menu, X, Bell
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { label: "Disputes", icon: FileText, page: "Disputes" },
  { label: "Inventory", icon: Package, page: "Inventory" },
  { label: "Projects", icon: FolderOpen, page: "Projects" },
  { label: "Master Setup", icon: Settings, page: "MasterSetup" },
  { label: "Reports", icon: BookOpen, page: "Reports" },
  { label: "Users", icon: Users, page: "Users" },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => base44.auth.logout();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-6 ${collapsed ? "justify-center px-3" : ""}`}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Shield className="w-4.5 h-4.5 text-white w-5 h-5" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-base font-bold text-white leading-tight tracking-tight">Shanora</p>
            <p className="text-[10px] text-blue-300 leading-tight tracking-widest uppercase">Systems</p>
          </div>
        )}
      </div>

      {/* Section label */}
      {!collapsed && (
        <p className="px-5 pb-2 text-[10px] font-semibold text-blue-400/60 uppercase tracking-widest">Navigation</p>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, page }) => {
          const href = createPageUrl(page);
          const active = currentPageName === page;
          return (
            <Link
              key={page}
              to={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative
                ${active
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-blue-200/70 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center px-2.5" : ""}`}
              title={collapsed ? label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
              )}
              <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? "text-white" : "text-blue-300/70 group-hover:text-white"}`} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`p-3 mt-4 space-y-1 border-t border-white/10 ${collapsed ? "px-2" : ""}`}>
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-200/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Logout</span>
          </button>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden md:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-blue-300/50 hover:bg-white/10 hover:text-white transition-all"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  const currentNav = navItems.find(n => n.page === currentPageName);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f0f4fa" }}>
      <style>{`
        :root {
          --sidebar-bg: #0f2d6b;
        }
        .sidebar-glass {
          background: linear-gradient(160deg, #0f2d6b 0%, #0a1f4e 100%);
        }
        .stat-card {
          background: white;
          border: 1px solid rgba(226,232,240,0.8);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .stat-card:hover {
          box-shadow: 0 4px 24px rgba(13,80,184,0.10);
          transform: translateY(-1px);
        }
        .main-card {
          background: white;
          border: 1px solid rgba(226,232,240,0.8);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
        }
        .topbar {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226,232,240,0.7);
        }
        table thead tr {
          background: #f8fafc;
        }
        table tbody tr:hover {
          background: #f5f8ff !important;
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className={`sidebar-glass hidden md:flex flex-col flex-shrink-0 transition-all duration-250 ${collapsed ? "w-16" : "w-60"}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar-glass relative w-64 h-full shadow-2xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="topbar flex items-center gap-4 px-6 py-3.5 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-800">{currentNav?.label || currentPageName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors relative">
              <Bell className="w-4.5 h-4.5 w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200 ml-1">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}