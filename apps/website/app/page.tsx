import App from "@/components/home";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Fixmind - Close the loop on AI bug fixes",
  path: "/",
});

export default function HomePage() {
  return <App />;
}
