import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "GEO Commerce — 独立站 GEO 优化平台",
  description: "电商独立站生成式引擎优化（GEO）工具与管理后台",
};

// 管理后台需运行时连数据库，避免 Vercel 构建阶段静态生成失败
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <div className="app-shell flex min-h-screen">
          <Sidebar />
          <main className="app-main flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
