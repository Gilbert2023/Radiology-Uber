import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MRI Suite – The Bank Hospital", template: "%s · MRI Suite · The Bank Hospital" },
  description: "MRI Suite Management System – The Bank Hospital, Ghana",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#2c3135", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
