# Security Policy

## Supported versions

Security fixes are applied to the current npm package and current desktop release. Older versions are not guaranteed to receive security updates.

Before reporting a problem, confirm the affected versions with:

```powershell
npm view fixmind version
gh release view --repo F-47/fixmind --json tagName,url
```

The GitHub command requires repository access while `F-47/fixmind` remains private. After the public-repository migration, the release page and private vulnerability-reporting feature will be the preferred GitHub channels.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Email `support@fixmind.dev` with:

- the affected version;
- the affected component: CLI, MCP server, dashboard, desktop application, website, updater, or hosted sync;
- reproduction steps and expected impact;
- whether user data, authentication, payments, signing, or update integrity may be involved; and
- a safe way to contact you.

Do not include private signing keys, passwords, access tokens, lesson contents, source code from unrelated projects, or personal data. If sensitive evidence is required, first ask for an approved transfer method.

## Response process

The maintainer will acknowledge the report, validate its scope, and coordinate a fix and disclosure plan. Reports affecting hosted accounts, billing, or encrypted sync remain private until containment and user guidance are ready.

## Security boundaries

- Local lesson data is stored on the user's device unless encrypted sync is enabled.
- The Tauri updater private key and its password are not stored in the repository.
- The Supabase anonymous key is client-visible and is not an authorization boundary. Database and service policies must enforce authentication, row ownership, and paid entitlement.
- The public client must never contain a Supabase service-role key, Polar webhook secret, Tauri updater private key, or package-publishing credential.
