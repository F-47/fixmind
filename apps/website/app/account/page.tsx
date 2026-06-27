import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import Account from "@/components/account";
import { AccountFallback } from "@/components/account/AccountFallback";

export const metadata = pageMetadata({
  title: "Fixmind - Account",
  description: "Manage your fixmind account, optional sync, and paid plan status.",
  path: "/account",
  noIndex: true,
});

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountFallback />}>
      <Account />
    </Suspense>
  );
}
