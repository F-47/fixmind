# Team insights - design doc

Status: proposal. No code yet. This document is the prerequisite for any implementation (see PLAN.md task 6.6).

## Problem

Fixmind Pro is per-device: lessons are end-to-end encrypted and only the owning user can read them. Teams pay for Fixmind because the *same* mistakes keep burning different people: one developer's `Missing await` lesson should stop the next developer from repeating it. Today there is no way for a team to see shared patterns, because the server stores only ciphertext.

## Hard constraint

Lessons must stay end-to-end encrypted. The sync server (Supabase) never receives plaintext lesson content or keys. Any team feature must preserve: (1) no plaintext lesson bodies server-side, (2) per-user passphrase sovereignty - a member's passphrase must not be shared with the server or required by other members, (3) leaving a team reveals nothing retroactively or going forward beyond what the member opted in to.

## Options considered

### A. Per-team symmetric key for all lessons

Every member encrypts lessons with a shared team key (in addition to, or instead of, the personal key). The server can never read anything, and members can decrypt each other's lessons.

Rejected as the default: it breaks passphrase sovereignty (the team key must be distributed somehow, which reintroduces a trusted distributor), and it makes "share this lesson" an all-or-nothing property. It remains a viable future extension for teams that explicitly want full lesson sharing.

### B. Opt-in sharing of individual lessons

A member marks a lesson as team-shared; the client re-encrypts that lesson under a team key and uploads it separately.

Deferred: valuable, but it depends on option A's key distribution story, and it does not answer the actual team question ("what are we collectively getting wrong?") without reading every shared lesson.

### C. Anonymized pattern aggregates (proposed)

Each client periodically computes aggregate statistics over its local lessons and uploads only those counters, keyed by team. The server can store these in plaintext because they contain no lesson content: no titles, no code, no file paths, no prose.

This is the proposal, because it answers the team question with zero lesson exposure.

## Proposed model

New table (Supabase, RLS: members of the team can read, only the owning client can write its own row):

```sql
create table team_pattern_stats (
  team_id uuid not null,
  member_id uuid not null,        -- hashed member id for pseudonymity
  pattern text not null,           -- mistakePattern, normalized
  pattern_scope text not null,     -- 'pattern' | 'concept' | 'tool'
  period_start date not null,      -- weekly buckets
  count int not null,
  updated_at timestamptz not null,
  primary key (team_id, member_id, pattern, pattern_scope, period_start)
);
```

Client behavior:

1. During `fixmind login`, a Pro/Team account may optionally link a team id (from the entitlement record).
2. Once a week (piggybacked on sync), the client computes per-pattern counts over the last 7 days of lessons - the same ranking logic as `buildLearningInsights` - and upserts its own row.
3. The dashboard's team panel reads all rows for the team and aggregates them: "This week the team hit `Missing await` 9 times across 4 members; top concept: `async timing`."

Privacy properties:

- No lesson text, code, or file names leave the device; only normalized `mistakePattern`/concept/tool strings and counts.
- Members are pseudonymous (hashed ids); the panel shows "4 members", not names.
- Uploads are opt-in per team and can be disabled per device (`fixmind settings --no-team-stats`).
- Pattern strings are normalized client-side (lowercased, trimmed, capped at 40 chars) so trivially identifying phrasing is not worth uploading; a member who considers a pattern too revealing can edit or clear it before it ever syncs, since aggregation happens locally first.

Residual risks, stated honestly:

- A pattern string chosen by a user could be identifying (e.g. a project codename). Mitigation: client-side normalization plus an explicit allowlist toggle; the first release ships only Fixmind's own canonical pattern vocabulary (the lesson-template patterns) as the default aggregation domain, so free-text patterns do not sync until the team opts in.
- Count timing could hint at member activity. Weekly buckets and pseudonymous ids are the mitigation; counts are per-week, not per-event.

## Rollout plan

1. Ship the team entitlement + `team_pattern_stats` schema and the read-side dashboard panel behind a feature flag (no writes yet).
2. Enable client-side aggregation writes for Fixmind's canonical pattern vocabulary only, opt-in at login.
3. Evaluate opt-in rates and privacy feedback before considering lesson-level sharing (option B) or team keys (option A).

## Non-goals

- No server-side aggregation jobs (all aggregation is client-computed; the server only stores and sums rows).
- No cross-team anything: rows are strictly scoped by `team_id`.
- No retroactive backfill: stats start from the moment a member opts in.
