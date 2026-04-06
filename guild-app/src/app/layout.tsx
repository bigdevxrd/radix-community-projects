import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://radixguild.com"),
  title: {
    default: "Radix Guild — Community Governance for Radix",
    template: "%s | Radix Guild",
  },
  description: "Free on-chain badges, two-tier voting, bounties, and XP. The open source DAO toolkit for the Radix community.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Radix Guild — Community Governance for Radix",
    description: "Free on-chain badges, two-tier voting, bounties, and XP. The open source DAO toolkit for the Radix community.",
    url: "https://radixguild.com",
    siteName: "Radix Guild",
    images: ["/og-image.svg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Radix Guild — Community Governance for Radix",
    description: "Free on-chain badges, two-tier voting, bounties, and XP.",
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
