# Sync Setup

Fixmind sync is an optional feature for Pro or Team users who want the same lessons on more than one machine.

If you only use Fixmind locally, you can ignore this page.

## What sync does

- lessons stay on your machine first
- lessons are encrypted before they leave the device
- syncing happens only after you sign in with `fixmind login`
- the same lesson can be pulled to another machine after you sign in there too
- opening `fixmind dashboard` pulls the latest synced lessons before it shows the dashboard

## What you do as a user

1. Make sure your account has sync access.
2. Sign in on the machine you want to sync:

```bash
fixmind login
```

3. Check your status:

```bash
fixmind sync status
```

4. Upload local changes when you want them copied to your other machine:

```bash
fixmind sync push
```

5. Bring remote changes down to the current machine:

```bash
fixmind sync pull
```

Opening `fixmind dashboard` also pulls first, so it is the quickest way to refresh the local view.

## What to expect

- `sync status` should show that you are signed in.
- `sync push` only works when the account has an active Pro or Team entitlement.
- `sync pull` only works when the account has an active Pro or Team entitlement.
- your passphrase stays local, so use the same passphrase on every machine you want to sync.

## If sync is not working

- If sign-in fails, run `fixmind login` again.
- If `sync push` says you are not entitled, check that your account has sync access.
- If `sync status` says reauth is needed, sign in again on that machine.
