# Open-Source Product and Commercial Service Boundary

Fixmind's local product is intended to remain useful without an account or subscription. The commercial offering pays for an operated service: encrypted multi-device sync now, with team administration and team insights reserved for a later tier.

This document describes the implemented technical boundary. It does not promise retention, refunds, recovery, or service levels that have not yet been approved.

## Public local product

The public product may include the CLI, MCP server, local database, dashboard, desktop application, encryption code, sync client, public sync contract, tests, documentation, and release tooling. Local capture, search, review, export, and dashboard use must continue without the hosted service.

The public client is untrusted from the hosted service's perspective. Browser-visible Supabase URLs and anonymous keys identify the service but do not grant paid access.

## Commercial hosted service

The private operational boundary includes:

- Polar webhook handling and privileged entitlement writes;
- production database migrations and deployment configuration;
- service-role keys, webhook secrets, signing private keys, publishing credentials, and production credentials;
- account operations, hosted storage, monitoring, support procedures, and future team administration.

PostgreSQL row-level security is the authoritative paid-access control for hosted sync. It requires the authenticated user to own the target row and to have an active entitlement whose period has not expired. An active entitlement without an expiry remains valid. The policy applies to both encrypted lesson rows and sync verifier metadata.

## Subscription and outage behavior

- Free, canceled, revoked, and expired accounts cannot read or write hosted sync data.
- Client checks provide early feedback, but removing them does not remove database enforcement.
- A temporarily unreachable hosted service reports a sync failure and leaves local lesson data in place for a later retry.
- Subscription loss must not delete or disable local lessons.
- Retention, hosted-data deletion, account recovery, export, refunds, and support service levels remain launch-blocking business-policy decisions.

## Metadata visible to the hosted service

Lesson content is encrypted on the device before upload. The current hosted schema can still see operational metadata, including:

- account email and authenticated user identifier;
- plan, entitlement status, subscription period end, and entitlement update time;
- lesson identifiers, row update times, deletion markers, ciphertext sizes, and sync activity timing;
- encryption salt and encrypted verifier values; and
- ordinary infrastructure metadata such as request timing, IP-derived network logs, errors, and storage usage when retained by the platform.

The service must not claim that encryption hides this metadata. Privacy documentation must describe the actual production logging and retention configuration before launch.

## Enforcement evidence

Run `npm run test:sync-policy` with Docker available. The test uses a disposable PostgreSQL 17 container and calls the database policies directly, bypassing the client entitlement guard. It verifies paid access and rejects free, canceled, revoked, expired, and cross-user access.

The reviewed migration is applied to the hosted Supabase project. Production launch still requires a controlled-account smoke test that repeats equivalent non-destructive verification there.
