import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: { default: "Advanced MRI Safety Officer Academy", template: "%s · MRSO Academy" },
  description:
    "Comprehensive MRI Safety, Risk Management, Clinical Practice and Emergency Preparedness — an advanced, evidence-informed learning platform for MR professionals.",
};

export const viewport: Viewport = { themeColor: "#050b18" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen font-sans">
        <a href="#main" className="skip-link">Skip to main content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
