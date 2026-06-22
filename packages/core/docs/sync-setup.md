# Sync setup

Fixmind sync uses a Supabase project that you own. The CLI stores lessons locally first, then encrypts and syncs them to your project only after you log in with `fixmind login`.

## What you need

- A Supabase project
- A GitHub OAuth provider configured in that project
- The SQL schema from `packages/core/supabase/schema.sql`
- A Pro or Team entitlement if you want `sync push` / `sync pull` to succeed

The CLI and the website can point at the same Supabase project:

- CLI: `FIXMIND_SUPABASE_URL` and `FIXMIND_SUPABASE_ANON_KEY`
- Website: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## 1. Create the Supabase project

Create a new Supabase project in the Supabase dashboard.

Use the project URL and anon key from the project settings when you configure Fixmind.

## 2. Apply the schema

Open the SQL editor in Supabase and run:

`packages/core/supabase/schema.sql`

That file creates the tables Fixmind sync expects:

- `sync_users`
- `lessons_sync`
- `entitlements`

It also enables row-level security so each account only reads and writes its own rows.

## 3. Enable GitHub sign-in

The CLI login flow uses Supabase auth with GitHub OAuth.

In the Supabase dashboard:

1. Open the Auth settings for your project.
2. Enable the GitHub provider.
3. Complete the GitHub OAuth app setup using the callback and redirect information Supabase shows for your project.

If you also want the website `/account` page to sign in, keep the same Supabase project connected there as well.

## 4. Configure Fixmind to use the project

Set the environment variables for the surface you are using:

```bash
FIXMIND_SUPABASE_URL=...
FIXMIND_SUPABASE_ANON_KEY=...
```

For the website, use the `VITE_` versions of the same variables.

Then log in from the CLI:

```bash
fixmind login
```

If you prefer email/password instead of GitHub OAuth:

```bash
fixmind login --password-login
```

## 5. Verify the setup

After login:

```bash
fixmind sync status
fixmind sync push
fixmind sync pull
```

Expected behavior:

- `sync status` shows that you are logged in.
- `sync push` uploads changed lessons when the account has an active Pro or Team entitlement.
- `sync pull` downloads remote changes and applies the newest version locally.

## Notes

- `fixmind login` can create the auth session even if the account is not yet entitled for sync.
- `sync push` and `sync pull` still require an active Pro or Team plan.
- The passphrase is local-only. Use the same passphrase on every machine or you will not be able to decrypt the same synced lessons.

## Troubleshooting

- If GitHub sign-in fails, confirm the provider is enabled in Supabase and the OAuth app configuration is complete.
- If `sync push` says you are not entitled, check the account plan in the website account page or the Supabase entitlements row.
- If `sync status` reports reauth is needed, run `fixmind login` again to refresh the local session.
