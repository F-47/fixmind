# Setting up sync (Pro)

Fixmind sync uses a free [Supabase](https://supabase.com) project as the
backend. Supabase only ever stores **encrypted blobs**: lesson content is
encrypted on your machine before it leaves it, with a key derived from a
passphrase you choose. Supabase never sees your passphrase or your
plaintext lessons.

## 1. Create a Supabase project

1. Sign up at https://supabase.com and create a new project (free tier).
2. In **Authentication > Providers**, make sure "Email" is enabled.
3. In **Project Settings > API**, copy the **Project URL** and the
   **anon public key**.

## 2. Enable GitHub sign-in (recommended)

`fixmind login` defaults to signing in with GitHub through Supabase's
OAuth provider, so no passwords are typed into the terminal.

1. On GitHub, go to **Settings > Developer settings > OAuth Apps > New OAuth App**.
   - **Homepage URL**: anything, e.g. your project's repo URL.
   - **Authorization callback URL**: `https://<project-ref>.supabase.co/auth/v1/callback`
     (use your own project ref, from the URL you copied in step 1).
2. Create the app and copy its **Client ID** and **Client Secret**.
3. In Supabase, go to **Authentication > Providers > GitHub**, enable it, and
   paste the Client ID/Secret. Save.
4. In **Authentication > URL Configuration > Redirect URLs**, add
   `http://127.0.0.1:51763` (the fixed local port the CLI listens on during
   login). This is required — Supabase rejects redirects to URLs not on this
   list.

If you'd rather not set this up, pass `--password-login` to
`fixmind login` to use email/password instead (make sure email
auth is enabled, as in step 1).

## 3. Apply the schema

Open **SQL Editor > New query** in the Supabase dashboard, paste the
contents of [`supabase/schema.sql`](../supabase/schema.sql), and run it.
This creates the `sync_users` and `lessons_sync` tables with row-level
security so each account can only read/write its own rows.

## 4. Point fixmind at your project

Set these environment variables (e.g. in your shell profile):

```sh
export FIXMIND_SUPABASE_URL="https://<project-ref>.supabase.co"
export FIXMIND_SUPABASE_ANON_KEY="<anon-public-key>"
```

## 5. Log in and sync

```sh
fixmind login
fixmind sync push
fixmind sync pull
```

`fixmind login` opens your browser to sign in with GitHub (creating
the Supabase account on first use), then asks for an encryption
passphrase. The passphrase is used to derive an AES-256 key locally
(scrypt) and is never sent to Supabase. Use the **same passphrase on
every machine** you sync — if you forget it, your synced lessons cannot
be decrypted.

Run `fixmind sync push` to upload local changes and `fixmind sync pull`
to fetch changes made on other machines. Conflicts are resolved by
last-write-wins, comparing each lesson's `updatedAt` timestamp.
