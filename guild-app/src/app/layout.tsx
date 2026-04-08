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
  robots: { index: true, follow: true },
  alternates: { canonical: "https://radixguild.com" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Radix Guild",
  url: "https://radixguild.com",
  description: "Community governance and task marketplace for the Radix network. Free on-chain badges, two-tier voting, bounties, and XP.",
  applicationCategory: "GovernanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to join. Badge minting is free. Voting is free." },
  author: { "@type": "Person", name: "bigdev", url: "https://github.com/bigdevxrd" },
  sourceOrganization: { "@type": "Organization", name: "Radix Guild", url: "https://radixguild.com" },
  license: "https://opensource.org/licenses/MIT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
