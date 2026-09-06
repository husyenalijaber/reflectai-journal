# Security Specification & Test Matrix

## 1. Data Invariants
- An entry in `/users/{userId}/entries/{entryId}` can only be read, created, updated, or deleted by the authenticated user whose `request.auth.uid == userId`.
- During document creation, `incoming().userId == request.auth.uid` and `incoming().userId == userId`.
- `incoming().id == entryId`.
- User cannot read, list, or mutate any entries belonging to another user (`other_user_id`).
- Timestamps: `createdAt` is immutable upon update; `updatedAt` is updated to `request.time`.
- Text length limits: `title` <= 200 chars, `prompt` <= 10,000 chars, `summary` <= 10,000 chars.
- Unauthenticated requests are denied on all paths.
- Default catch-all denies all access to arbitrary paths.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Read Attack**: An unauthenticated client attempts to `get` `/users/alice/entries/entry1`. Expected: PERMISSION_DENIED.
2. **Cross-User Snooping Attack**: User `bob` attempts to `get` `/users/alice/entries/entry1`. Expected: PERMISSION_DENIED.
3. **Cross-User List Query Attack**: User `bob` attempts to query collection `/users/alice/entries`. Expected: PERMISSION_DENIED.
4. **Identity Spoofing Creation Attack**: User `bob` attempts to create `/users/bob/entries/entry1` with `{ userId: 'alice' }`. Expected: PERMISSION_DENIED.
5. **Path Poisoning Attack**: User `bob` attempts to create an entry under `/users/alice/entries/entry1`. Expected: PERMISSION_DENIED.
6. **Malicious ID Injection**: User attempts to use doc ID `../../evil_path` or > 128 characters. Expected: PERMISSION_DENIED.
7. **Title Overflow Denial-of-Wallet Attack**: User creates an entry with `title` string length > 200 characters. Expected: PERMISSION_DENIED.
8. **Prompt Overflow Attack**: User creates an entry with `prompt` > 10,000 characters. Expected: PERMISSION_DENIED.
9. **Ghost / Shadow Field Injection**: User attempts to inject extra unexpected fields (e.g., `isAdmin: true` or `role: 'superadmin'`) on entry document. Expected: PERMISSION_DENIED.
10. **Immutable Field Tampering**: User attempts to update `userId` or `createdAt` on an existing entry. Expected: PERMISSION_DENIED.
11. **Arbitrary Collection Root Hijack**: User attempts to write to `/admins` or `/system_config`. Expected: PERMISSION_DENIED by global catch-all.
12. **Cross-User Deletion Attack**: User `bob` attempts to delete `/users/alice/entries/entry1`. Expected: PERMISSION_DENIED.
