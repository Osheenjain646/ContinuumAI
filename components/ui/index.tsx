// Shared primitive UI components

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-zinc-900 text-white",
    secondary: "bg-zinc-100 text-zinc-800",
    destructive: "bg-red-100 text-red-800",
    outline: "border border-zinc-200 text-zinc-700 bg-transparent",
    success: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5 p-5 pb-0", className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-semibold text-base text-zinc-900", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-zinc-500", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center p-5 pt-0", className)}
      {...props}
    />
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg" | "icon";
}

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  const variants = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm",
    outline: "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 shadow-sm",
    ghost: "text-zinc-700 hover:bg-zinc-100",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-11 px-6 text-base",
    icon: "h-9 w-9",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 resize-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-px w-full bg-zinc-100", className)}
      {...props}
    />
  );
}

// ─── ScrollArea ───────────────────────────────────────────────────────────────

export function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-auto", className)} {...props}>
      {children}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
}: {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  const [imgError, setImgError] = React.useState(false);

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-zinc-200",
        sizes[size]
      )}
    >
      {src && !imgError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt ?? "avatar"}
          onError={() => setImgError(true)}
          className="aspect-square h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-medium text-zinc-600">
          {fallback?.slice(0, 2).toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function Progress({
  value = 0,
  className,
  colorClass,
}: {
  value?: number;
  className?: string;
  colorClass?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-zinc-100",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", colorClass ?? "bg-zinc-900")}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

export function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap shadow-lg">
        {content}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
      </div>
    </div>
  );
}

