import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: { default: "GE MRI Protocol Mastery", template: "%s · GE MRI Protocol Mastery" },
  description: "From Console Parameters to Clinical Decisions — an educational academy for GE 1.5T MRI parameters, sequences, protocols, troubleshooting and safety.",
};

export const viewport: Viewport = { themeColor: "#f7f5f0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
