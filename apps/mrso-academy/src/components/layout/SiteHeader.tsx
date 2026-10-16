"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Shield, UserCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
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
  const auth = useAuth();
  const isAdmin = auth.profile?.role === "admin";
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header data-site className="sticky top-0 z-50 border-b border-white/10 bg-navy-950/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Advanced MRI Safety Officer Academy — home">
          <SafetySign kind="magnetic-field" size={30} />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-wide text-white">MRSO ACADEMY</span>
            <span className="hidden text-[11px] text-slate-400 sm:block xl:hidden 2xl:block">Advanced MRI Safety Officer Academy</span>
          </span>
        </Link>
        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {nav.map((n) => {
              const active = pathname?.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
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
        <div className="hidden items-center gap-2 xl:flex">
          {isAdmin && (
            <Link href="/admin/" className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm text-caution-400 hover:bg-white/5">
              <Shield className="h-4 w-4" aria-hidden /> Admin
            </Link>
          )}
          {auth.enabled &&
            (auth.session ? (
              <Link href="/account/" className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5" aria-label="My account">
                <UserCircle className="h-4 w-4" aria-hidden /> Account
              </Link>
            ) : (
              <Link href="/login/" className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-navy-950 hover:bg-cyan-300">
                Sign in
              </Link>
            ))}
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 xl:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main mobile" className="border-t border-white/10 bg-navy-950 xl:hidden">
          <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-4 py-3">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5">
                  {n.label}
                </Link>
              </li>
            ))}
            {auth.enabled && (
              <li>
                <Link href={auth.session ? "/account/" : "/login/"} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-white/5">
                  {auth.session ? "My account" : "Sign in / Sign up"}
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link href="/admin/" className="block rounded-lg px-3 py-2.5 text-sm text-caution-400 hover:bg-white/5">
                  Admin
                </Link>
              </li>
            )}
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
