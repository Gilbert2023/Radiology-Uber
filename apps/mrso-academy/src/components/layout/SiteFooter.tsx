import Link from "next/link";

export function SiteFooter() {
  return (
    <footer data-site className="border-t border-white/10 bg-navy-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-bold text-white">Advanced MRI Safety Officer Academy</p>
          <p className="mt-1 text-sm text-slate-400">Comprehensive MRI Safety, Risk Management, Clinical Practice and Emergency Preparedness.</p>
          <div className="mt-4 rounded-xl border border-caution-400/30 bg-caution-400/5 p-4 text-xs leading-relaxed text-slate-300">
            <p className="font-semibold text-caution-400">Educational disclaimer</p>
            <p className="mt-1">
              This platform is an independent educational resource. It is not accredited, endorsed or approved by the ACR, MHRA, FDA, ASTM or any
              certification body, and its completion record is not a professional credential. Content does not replace your facility&apos;s approved MR
              safety policy, local emergency procedures, the current edition of authoritative guidance, or manufacturer instructions for specific scanners
              and devices. Verify all guidance against current sources before clinical use.
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Learn</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li><Link className="hover:text-cyan-300" href="/curriculum/">Curriculum</Link></li>
            <li><Link className="hover:text-cyan-300" href="/lab/">Interactive Learning Lab</Link></li>
            <li><Link className="hover:text-cyan-300" href="/cases/">Case Studies</Link></li>
            <li><Link className="hover:text-cyan-300" href="/exam/">Examination Centre</Link></li>
            <li><Link className="hover:text-cyan-300" href="/flashcards/">Flashcards</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Reference</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li><Link className="hover:text-cyan-300" href="/resources/">Resources &amp; bibliography</Link></li>
            <li><Link className="hover:text-cyan-300" href="/glossary/">Glossary</Link></li>
            <li><Link className="hover:text-cyan-300" href="/dashboard/">My progress</Link></li>
            <li><Link className="hover:text-cyan-300" href="/about/">About, limitations &amp; credits</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/5 py-4 text-center text-xs text-slate-500">Content reviewed against sources available October 2026. Illustrations are original artwork.</p>
    </footer>
  );
}
