import { clsx } from "clsx";

/** Returns the public URL of the official logo if it has been supplied, otherwise null. */
export function logoUrl(): string | null {
  // The official logo is committed at public/brand/logo.png. Public files are served by the CDN and are
  // not present in serverless function filesystems, so only fall back to the placeholder if explicitly disabled.
  if (process.env.HOSPITAL_LOGO_URL === "none") return null;
  return process.env.HOSPITAL_LOGO_URL || "/brand/logo.png";
}

/**
 * The Bank Hospital logo. The official logo file has not been supplied, so a clearly
 * labelled placeholder is shown. Drop the approved file at public/brand/logo.(svg|png).
 */
export function HospitalLogo({ size = "md", dark = false, showName = true }: { size?: "sm" | "md" | "lg"; dark?: boolean; showName?: boolean }) {
  const url = logoUrl();
  const dim = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className="flex items-center gap-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="The Bank Hospital" className={clsx(dim, "object-contain")} />
      ) : (
        <div title="Official logo pending – placeholder only" aria-label="Logo placeholder"
          className={clsx(dim, "flex shrink-0 flex-col items-center justify-center rounded-md border-2 border-dashed text-center leading-none",
            dark ? "border-white/40 text-white/70" : "border-brand-300 text-brand-500")}>
          <span className="text-[7px] font-bold uppercase tracking-wider">Logo</span>
          <span className="text-[6px] uppercase">pending</span>
        </div>
      )}
      {showName && (
        <div className="leading-tight">
          <div className={clsx("font-bold tracking-tight", size === "lg" ? "text-xl" : "text-sm", dark ? "text-white" : "text-brand-900")}>The Bank Hospital</div>
          <div className={clsx("text-[11px] font-medium", dark ? "text-accent-200" : "text-accent-700")}>MRI Suite Management System</div>
        </div>
      )}
    </div>
  );
}
