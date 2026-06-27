import { pageMetadata } from "@/lib/seo";
import Contact from "@/components/contact";

export const metadata = pageMetadata({
  title: "Fixmind - Contact",
  description:
    "Get in touch with fixmind for support, feedback, or questions about Team and Enterprise plans.",
  path: "/contact",
});

export default function ContactPage() {
  return <Contact />;
}
