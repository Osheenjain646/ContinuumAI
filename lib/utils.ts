import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function severityColor(
  severity: "critical" | "high" | "medium" | "low"
): string {
  switch (severity) {
    case "critical":
      return "text-red-600 bg-red-50 border-red-200";
    case "high":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "medium":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "low":
      return "text-green-600 bg-green-50 border-green-200";
  }
}

export function statusColor(
  status: "blocked" | "in-progress" | "needs-review" | "upcoming"
): string {
  switch (status) {
    case "blocked":
      return "text-red-700 bg-red-100";
    case "in-progress":
      return "text-blue-700 bg-blue-100";
    case "needs-review":
      return "text-purple-700 bg-purple-100";
    case "upcoming":
      return "text-zinc-700 bg-zinc-100";
  }
}

export function prStateColor(state: "open" | "closed" | "merged"): string {
  switch (state) {
    case "open":
      return "text-emerald-700 bg-emerald-100";
    case "closed":
      return "text-red-700 bg-red-100";
    case "merged":
      return "text-purple-700 bg-purple-100";
  }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function scoreToColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

export function scoreToRingColor(score: number): string {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 60) return "stroke-yellow-500";
  if (score >= 40) return "stroke-orange-500";
  return "stroke-red-500";
}

