# @fixmind/website

The marketing site for fixmind - a Next.js App Router app that statically exports the public pages and keeps the account area client-side only. Public routes are SEO-friendly by default, while `/account` still talks to Supabase directly from the browser (same project the CLI authenticates against in `packages/core/src/sync.ts`).

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS v4 via PostCSS, theme tokens in `app/globals.css`
- File-based routing with server-rendered metadata and client islands only where needed

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical public site URL used for SEO tags and metadata. Defaults to `https://fixmind.dev`. |
| `NEXT_PUBLIC_PRO_CHECKOUT_URL` | Polar checkout link used on the Pro card in `/pricing`. Team and Enterprise are waitlist-only for now. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same Supabase project the CLI uses (`packages/core/src/sync.ts`). Powers sign-in on `/account`. If unset, `/account` shows a "not configured" message instead of erroring. |

## Develop

From the repo root:

```bash
npm run dev:website
```

Or from this directory: `npm run dev`.

## Build

```bash
npm run build
```

Outputs a static export to `out/`. The public routes are prerendered where possible and the metadata is emitted in server-rendered head tags.

## Structure

| File | Purpose |
|---|---|
| `app/` | Next.js App Router route files, root layout, and global CSS. |
| `app/` | Next.js App Router route files, root layout, and global CSS. |
| `components/shared/` | Shared components and constants used across pages. |
| `components/home/` | Landing page composition. |
| `components/pricing/` | Pricing page composition and cards. |
| `components/account/` | Sign-in / account-status page content and UI pieces. |
| `components/contact/` | Contact page composition and forms. |
| `components/docs/` | Docs shell, search, and content renderer. |
| `lib/seo.ts` | Shared metadata helper for canonical, OG, Twitter, and robots tags. |
| `lib/supabase.ts` | Browser Supabase client, shared by the account page. |
| `components/ui/` | Small reusable bits (e.g. `CopyButton`). |

## Adding a page

1. Create a route file in `app/<route>/page.tsx`.
2. Add the page content in `components/<page>/index.tsx` if it needs to stay reusable or client-side.
3. Add the metadata with `pageMetadata()` from `lib/seo.ts`.
4. Add a `Link` to it in `Nav` (`components/shared/Nav.tsx`).

Internal links use `next/link`, not a plain `<a>`. Cross-page section links use the `/#section-id` form (e.g. `/#features`) so they resolve correctly from any page.
