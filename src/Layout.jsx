import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, FolderOpen, FileText, Settings, ChevronLeft, ChevronRight,
  LogOut, Package, Shield, BookOpen, Users, Menu, X
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
  const location = useLocation();

  const handleLogout = () => base44.auth.logout();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-slate-100 ${collapsed ? "justify-center px-2" : ""}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0D50B8] flex items-center justify-center shadow-sm">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">Shanora</p>
            <p className="text-[10px] text-slate-400 leading-tight tracking-wide uppercase">Systems</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, page }) => {
          const href = createPageUrl(page);
          const active = currentPageName === page;
          return (
            <Link
              key={page}
              to={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                ${active
                  ? "bg-[#0D50B8] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                } ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`p-3 border-t border-slate-100 space-y-1 ${collapsed ? "px-2" : ""}`}>
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Logout</span>
          </button>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden md:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-white border-r border-slate-100 shadow-sm transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 h-full bg-white shadow-xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0D50B8] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Shanora Systems</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}