# @fixmind/website

The marketing site for fixmind — a static-output, client-side-routed React app. No build-time data fetching; mostly copy and a few interactive bits (clipboard buttons, smooth-scroll nav), plus a `/account` page that talks to Supabase directly from the browser (same project the CLI authenticates against in `packages/core/src/sync.ts`).

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`, theme tokens in `src/styles.css`)
- A minimal custom router (`src/router.tsx`) instead of a routing library — this site only has a couple of pages

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_PRO_CHECKOUT_URL` | Polar checkout link used on the Pro card in `/pricing`. Team and Enterprise are waitlist-only for now. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Same Supabase project the CLI uses (`packages/core/src/sync.ts`). Powers sign-in on `/account`. If unset, `/account` shows a "not configured" message instead of erroring. |

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

Outputs a static bundle to `dist/`. `public/_redirects` is a Netlify-style SPA fallback (`/* /index.html 200`) so deep links like `/pricing` resolve after a hard refresh — if you deploy somewhere other than Netlify, add the equivalent rewrite rule for that host.

## Structure

| File | Purpose |
|---|---|
| `src/main.tsx` | Entry point; decides which page to render based on the current route. |
| `src/router.tsx` | `RouterProvider`, `useRouter`, `Link`, `usePageMeta` — the whole routing layer. |
| `src/shared.tsx` | `Nav`, `Footer`, and constants (`INSTALL_CMD`, `REPO_URL`) shared across pages. |
| `src/App.tsx` | The landing page. |
| `src/Pricing.tsx` | The pricing page. |
| `src/Account.tsx` | Sign-in / account-status page (Supabase auth, no separate CLI pairing). |
| `src/lib/supabase.ts` | Browser Supabase client, shared by `Account.tsx`. |
| `src/components/` | Small reusable bits (e.g. `CopyButton`). |

## Adding a page

1. Create the page component (look at `Pricing.tsx` for the shape: `Nav`, content, `Footer`, plus a `usePageMeta` call for the tab title).
2. Add a route check in `src/main.tsx`'s `Routes` component.
3. Add a `Link` to it in `Nav` (`src/shared.tsx`).

Internal links use `Link` from `src/router.tsx`, not a plain `<a>` — it intercepts the click for client-side navigation and falls back to a normal browser nav for modifier-clicks, middle-click, etc. Cross-page section links use the `/#section-id` form (e.g. `/#features`) so they resolve correctly from any page.
