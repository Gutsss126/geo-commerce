import { formatScore } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const { label, color } = formatScore(score);
  const ring =
    score >= 80 ? "border-emerald-500/40" : score >= 60 ? "border-amber-500/40" : "border-rose-500/40";

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-full border-2 bg-black/20",
        ring,
        size === "sm" && "h-12 w-12",
        size === "md" && "h-16 w-16",
        size === "lg" && "h-24 w-24"
      )}
    >
      <span className={cn("font-bold tabular-nums", color, size === "lg" ? "text-2xl" : "text-lg")}>
        {score}
      </span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}
