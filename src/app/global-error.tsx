"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDb =
    error.message.includes("Prisma") ||
    error.message.includes("DATABASE_URL") ||
    error.message.includes("connect");

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: 560 }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>服务暂时不可用</h1>
      <p style={{ color: "#64748b", marginBottom: "1rem" }}>
        {isDb
          ? "无法连接数据库。请确认 Vercel 环境变量 DATABASE_URL 已设置为 Neon 的 PostgreSQL 连接串（Pooled）。"
          : "加载页面时发生错误。"}
      </p>
      {error.digest && (
        <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Digest: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        重试
      </button>
    </div>
  );
}
