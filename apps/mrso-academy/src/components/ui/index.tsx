import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-white/10 bg-navy-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur", className)}>{children}</div>;
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 disabled:cursor-not-allowed disabled:opacity-50";
const variants = {
  primary: "bg-cyan-400 text-navy-950 hover:bg-cyan-300",
  secondary: "border border-white/20 bg-white/5 text-white hover:bg-white/10",
  ghost: "text-cyan-300 hover:bg-white/5",
  danger: "bg-hazard-600 text-white hover:bg-hazard-500",
};
export type Variant = keyof typeof variants;

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={cn(btnBase, variants[variant], className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
  download,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  download?: boolean;
}) {
  if (download) {
    return (
      <a href={href} download className={cn(btnBase, variants[variant], className)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(btnBase, variants[variant], className)}>
      {children}
    </Link>
  );
}

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "cyan" | "warn" | "danger" | "safe"; className?: string }) {
  const tones = {
    default: "bg-white/10 text-slate-200",
    cyan: "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30",
    warn: "bg-caution-400/15 text-caution-400 ring-1 ring-caution-400/30",
    danger: "bg-hazard-500/15 text-hazard-400 ring-1 ring-hazard-500/30",
    safe: "bg-safe-500/15 text-safe-400 ring-1 ring-safe-500/30",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function Callout({ tone, title, children }: { tone: "info" | "warning" | "danger"; title: string; children: ReactNode }) {
  const map = {
    info: { cls: "border-cyan-400/40 bg-cyan-400/10", icon: <Info className="h-5 w-5 text-cyan-300" aria-hidden /> },
    warning: { cls: "border-caution-400/40 bg-caution-400/10", icon: <AlertTriangle className="h-5 w-5 text-caution-400" aria-hidden /> },
    danger: { cls: "border-hazard-500/50 bg-hazard-500/10", icon: <OctagonAlert className="h-5 w-5 text-hazard-400" aria-hidden /> },
  }[tone];
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", map.cls)} role="note">
      <div className="mt-0.5 shrink-0">{map.icon}</div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <div className="mt-1 text-sm text-slate-200">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-navy-800 to-navy-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.15),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-3xl text-slate-300">{children}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
      <p className="font-semibold text-white">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-400">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-7xl px-4 sm:px-6", className)}>{children}</div>;
}
