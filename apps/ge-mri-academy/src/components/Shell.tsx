"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { NAV } from "./nav";
import { LAST_REVIEWED, CONTENT_VERSION } from "@/content/references";

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path.startsWith(href.replace(/\/$/, ""));
}

function NavList({ path, onNavigate, label = "Main" }: { path: string; onNavigate?: () => void; label?: string }) {
  return (
    <nav aria-label={label} className="space-y-6">
      {NAV.map((g) => (
        <div key={g.group}>
          <div className="kicker mb-2 px-2">{g.group}</div>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const active = isActive(path, i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded px-2 py-1.5 text-sm no-underline ${active ? "bg-ink-800 text-white" : "text-ink-700 hover:bg-paper-200"}`}
                  >
                    {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => setOpen(false), [path]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search/?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">Skip to main content</a>
      <header className="sticky top-0 z-30 border-b border-rule bg-paper-50/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-3 px-4">
          <button className="btn-ghost -ml-2 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="flex items-baseline gap-2 no-underline">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-ink-800 font-mono text-[11px] font-bold text-white" aria-hidden>1.5T</span>
            <span className="whitespace-nowrap font-serif text-[17px] font-semibold tracking-tight text-ink-900"><span className="sm:hidden">GE MRI</span><span className="hidden sm:inline">GE MRI Protocol Mastery</span></span>
            <span className="hidden text-xs text-ink-500 xl:inline">From Console Parameters to Clinical Decisions</span>
          </Link>
          <form onSubmit={submit} role="search" className="ml-auto flex w-full max-w-xs items-center">
            <label htmlFor="global-search" className="sr-only">Search the academy</label>
            <div className="relative w-full">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input id="global-search" className="input pl-8" placeholder="Search parameters, protocols…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-[90rem]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-rule px-3 py-6 lg:block">
          <NavList path={path} />
        </aside>
        {open && (
          <div className="fixed inset-0 top-14 z-20 overflow-y-auto bg-paper-50 px-4 py-6 lg:hidden">
            <NavList path={path} label="Main (mobile)" onNavigate={() => setOpen(false)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <main id="main" className="mx-auto max-w-page px-4 py-8 sm:px-6 lg:px-10">{children}</main>
          <footer className="border-t border-rule px-4 py-6 text-xs text-ink-500 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-page space-y-2">
              <p>
                <strong className="text-ink-700">Educational use only.</strong> This platform supplements, but does not replace, GE HealthCare manufacturer instructions, institutional protocols, radiologist direction, MRI safety procedures or professional judgement. Simulator outputs are educational approximations, not scanner predictions, and no configuration shown here is approved for direct clinical use.
              </p>
              <p>
                Not affiliated with or endorsed by GE HealthCare. SIGNA and product names are trademarks of their owners. Content v{CONTENT_VERSION} · last reviewed {LAST_REVIEWED} · <Link href="/references/">references &amp; update process</Link>
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
