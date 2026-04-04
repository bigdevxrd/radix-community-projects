import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radix Guild",
  description: "Community governance infrastructure for Radix",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
