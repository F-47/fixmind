import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

type PageMetadataOptions = {
  title: string;
  description?: string;
  path: string;
  noIndex?: boolean;
};

export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: path,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function siteMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: "Fixmind - Close the loop on AI bug fixes",
    description: SITE_DESCRIPTION,
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: "/",
      title: "Fixmind - Close the loop on AI bug fixes",
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary",
      title: "Fixmind - Close the loop on AI bug fixes",
      description: SITE_DESCRIPTION,
    },
    robots: { index: true, follow: true },
  };
}
