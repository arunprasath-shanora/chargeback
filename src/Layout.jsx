import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, FolderOpen, FileText, Settings,
  ChevronLeft, ChevronRight, LogOut, Package, BookOpen, Users, Menu, Bell, ShieldOff
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { canAccessPage, getAllowedPages } from "@/components/security/roleAccess";
import { auditLog } from "@/components/security/auditLogger";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6996f53449fb2f4f399c2c75/6daefa08f_sign-no-tagline-bg-fff-1500x1500.png";

const navItems = [
  { label: "Dashboard",   icon: LayoutDashboard, page: "Dashboard" },
  { label: "Disputes",    icon: FileText,         page: "Disputes" },
  { label: "Inventory",   icon: Package,          page: "Inventory" },
  { label: "Projects",    icon: FolderOpen,       page: "Projects" },
  { label: "Master Setup",icon: Settings,         page: "MasterSetup" },
  { label: "Reports",     icon: BookOpen,         page: "Reports" },
  { label: "Users",       icon: Users,            page: "Users" },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      if (u && !canAccessPage(u.role, currentPageName)) {
        setAccessDenied(true);
        auditLog({ action: "view", resource_type: currentPageName, status: "denied", details: `Role ${u.role} attempted to access ${currentPageName}` });
      } else {
        setAccessDenied(false);
      }
    }).catch(() => {});
  }, [currentPageName]);

  const handleLogout = () => {
    auditLog({ action: "logout", resource_type: "Session" });
    base44.auth.logout();
  };
  const currentNav = navItems.find(n => n.page === currentPageName);
  const allowedPages = currentUser ? getAllowedPages(currentUser.role) : navItems.map(n => n.page);
  const visibleNavItems = navItems.filter(n => allowedPages.includes(n.page));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-100 ${collapsed ? "justify-center px-3" : ""}`}>
        <img
          src={LOGO_URL}
          alt="Shanora"
          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        />
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-[15px] font-bold text-slate-800 tracking-tight">Shanora</p>
            <p className="text-[10px] text-[#0D50B8] font-semibold tracking-widest uppercase">Systems</p>
          </div>
        )}
      </div>

      {/* Nav label */}
      {!collapsed && (
        <p className="px-5 pt-5 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Menu</p>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 pt-1 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, page }) => {
          const active = currentPageName === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group
                ${active
                  ? "bg-[#0D50B8] text-white shadow-md shadow-blue-200"
                  : "text-slate-600 hover:bg-blue-50 hover:text-[#0D50B8]"
                }
                ${collapsed ? "justify-center px-2.5" : ""}
              `}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-[#0D50B8]"}`} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={`p-3 border-t border-slate-100 space-y-1 ${collapsed ? "px-2" : ""}`}>
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Logout</span>
          </button>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden md:flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
      <style>{`
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .app-card {
          background: #ffffff;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          box-shadow: 0 1px 4px rgba(13,80,184,0.04), 0 4px 20px rgba(13,80,184,0.05);
        }
        .app-card:hover {
          box-shadow: 0 4px 24px rgba(13,80,184,0.10);
        }
        .stat-chip {
          background: #ffffff;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(13,80,184,0.04), 0 4px 16px rgba(13,80,184,0.04);
          transition: box-shadow 0.2s, transform 0.18s;
        }
        .stat-chip:hover {
          box-shadow: 0 6px 24px rgba(13,80,184,0.12);
          transform: translateY(-2px);
        }
        table thead tr { background: #f8fafc; }
        table tbody tr { transition: background 0.12s; }
        table tbody tr:hover { background: #f0f5ff !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-white border-r border-slate-100 transition-all duration-200 ${collapsed ? "w-[60px]" : "w-[220px]"}`}
        style={{ boxShadow: "2px 0 12px rgba(13,80,184,0.05)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[220px] h-full bg-white shadow-2xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center gap-4 px-6 py-3.5 bg-white border-b border-slate-100"
          style={{ boxShadow: "0 1px 8px rgba(13,80,184,0.05)" }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-slate-400">Shanora Systems</span>
            <span className="text-slate-200">/</span>
            <span className="text-sm font-semibold text-slate-800">{currentNav?.label || currentPageName}</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <Bell className="w-4.5 h-4.5 w-5 h-5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#0D50B8] rounded-full" />
            </button>
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-100 ml-1">
              <img src={LOGO_URL} alt="Shanora" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">Shanora</p>
                <p className="text-[10px] text-slate-400">Systems</p>
              </div>
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