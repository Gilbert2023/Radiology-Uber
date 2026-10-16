"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SafetySign } from "@/components/art/SafetySign";

const nav = [
  { href: "/dashboard/", label: "Dashboard" },
  { href: "/curriculum/", label: "Curriculum" },
  { href: "/lab/", label: "Learning Lab" },
  { href: "/exam/", label: "Examinations" },
  { href: "/cases/", label: "Case Studies" },
  { href: "/resources/", label: "Resources" },
  { href: "/glossary/", label: "Glossary" },
  { href: "/flashcards/", label: "Flashcards" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header data-site className="sticky top-0 z-50 border-b border-white/10 bg-navy-950/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Advanced MRI Safety Officer Academy — home">
          <SafetySign kind="magnetic-field" size={30} />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-wide text-white">MRSO ACADEMY</span>
            <span className="hidden text-[11px] text-slate-400 sm:block">Advanced MRI Safety Officer Academy</span>
          </span>
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((n) => {
              const active = pathname?.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                      active ? "text-cyan-300" : "text-slate-300",
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main mobile" className="border-t border-white/10 bg-navy-950 lg:hidden">
          <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-4 py-3">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/bookmarks/" className="block rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5">
                Bookmarks
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
