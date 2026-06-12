"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Globe,
  LayoutDashboard,
  Package,
  Plug,
  Quote,
  ScanSearch,
  ShoppingCart,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/sites", label: "站点管理", icon: Globe },
  { href: "/geo-audit", label: "GEO Audit 2.0", icon: Sparkles },
  { href: "/integrations/wordpress", label: "WordPress", icon: Plug },
  { href: "/products", label: "产品 GEO", icon: Package },
  { href: "/orders", label: "订单管理", icon: ShoppingCart },
  { href: "/audits", label: "审计报告", icon: ScanSearch },
  { href: "/diagnostics/ga4", label: "GA4 诊断", icon: BarChart3 },
  { href: "/tools", label: "GEO 工具", icon: Wrench },
  { href: "/citations", label: "AI 引用追踪", icon: Quote },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar flex h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[#0a0e13] px-3 py-5">
      <div className="app-brand mb-8 flex items-center gap-2 px-2">
        <Sparkles className="h-6 w-6 text-blue-400" />
        <div>
          <p className="app-brand-title text-sm font-bold">GEO Commerce</p>
          <p className="app-brand-sub text-xs text-slate-500">独立站生成式引擎优化</p>
        </div>
      </div>
      <nav className="app-nav flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "app-nav-link flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active && "active",
                active
                  ? "bg-blue-500/15 text-blue-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-2 text-xs text-slate-600">v0.1 本地演示版</p>
    </aside>
  );
}
