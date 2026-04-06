import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Radix Governance",
  description: "Governance infrastructure for the Radix community",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Radix Governance",
    description: "Community-built governance tools for Radix. Badges, voting, bounties, on-chain.",
    images: ["/og-image.svg"],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
