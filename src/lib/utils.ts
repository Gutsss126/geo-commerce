import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number) {
  if (score >= 80) return { label: "优秀", color: "text-emerald-400" };
  if (score >= 60) return { label: "良好", color: "text-amber-400" };
  return { label: "待优化", color: "text-rose-400" };
}
