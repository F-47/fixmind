import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/shared/Footer";
import { Nav } from "@/components/shared/Nav";
import { ScrollToHash, ScrollToTop } from "@/lib/scroll";
import UmamiTracker from "@/lib/umami";
import { siteMetadata } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = siteMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Providers>
          <UmamiTracker />
          <ScrollToTop />
          <ScrollToHash />
          <Nav />
          <main id="content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
