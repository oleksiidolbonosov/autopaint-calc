# Security Specification — AutoPaint Calc Firestore Rules

## 1. Data Invariants
1. **Owner-Only Isolation (PII Protection)**: Every estimate contains customer name, phone number, vehicle make/model, and pricing. All collections live under `/users/{userId}/...` where `userId == request.auth.uid` and `request.auth.token.email_verified == true`.
2. **Master Gate Integrity**: No subcollection document (`estimates`, `settings`, `materials`, `laborPrices`, `partTemplates`) may be created or updated unless the parent `/users/{userId}` profile exists (`exists(/databases/$(database)/documents/users/$(userId))`).
3. **Immutable Ownership & Creation Timestamps**: `ownerId` and `createdAt` cannot be modified after document creation. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
4. **Strict Payload & Array Bounds**: Every document enforces strict `keys().hasAll(...)` and `keys().hasOnly(...)` allowlists, path ID regex guards (`^[a-zA-Z0-9_\-]+$`, `size() <= 128`), bounded strings (`notes <= 1500`, `deposit.note <= 300`), bounded numbers (`deposit.expectedUah`, `deposit.receivedUah`, `preliminaryTotalUah` >= 0), and bounded arrays (`selectedParts <= 60`, `doubleSidedParts <= 60`) with first-element type validation.
5. **Action-Based & Immutability-Guarded Updates**: Every update rule validates the complete payload via `isValid[Entity](incoming())` and enforces immutable field checks (`ownerId`, `id`, `clientCreatedAt`, `createdAt`, `updatedAt == request.time`). Smaller collections additionally enforce `incoming().diff(existing()).affectedKeys().hasOnly(...)`, while `estimates` enforces direct field-level immutability in `isValidEstimateUpdatePayload` plus strict `data.keys().hasOnly(35)` to stay safely under Firestore's 1,000-expression evaluation limit.

## 2. The "Dirty Dozen" Attack Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Read/List**: Anonymous client queries `/users/uid_1/estimates` -> Denied by `isSignedIn()`.
2. **Unverified Email Write**: Authenticated token with `email_verified: false` attempts to create `/users/uid_1/estimates/est_1` -> Denied by `isVerified()`.
3. **Cross-User PII Snooping**: `uid_2` attempts `get` or `list` on `/users/uid_1/estimates` -> Denied by `isOwner(userId)` and `resource.data.ownerId == request.auth.uid`.
4. **Identity Spoofing on Create**: `uid_1` attempts to write `/users/uid_1/estimates/est_1` with `ownerId: "uid_2"` -> Denied by `data.ownerId == request.auth.uid`.
5. **Orphaned Subcollection Write (No Master Gate)**: Client creates `/users/uid_1/estimates/est_1` before `/users/uid_1` exists -> Denied by `hasUserProfile(userId)`.
6. **Path ID Poisoning**: Client writes `/users/uid_1/estimates/bad..id$%` -> Denied by `isValidId(estimateId)`.
7. **Shadow / Ghost Field Injection**: Client creates estimate with extra key `{ ..., role: "admin", isVerified: true }` -> Denied by `data.keys().hasOnly(...)`.
8. **Update-Gap Shadow Key**: Client updates estimate passing extra unknown key `shadowNote: "hack"` -> Denied by `affectedKeys().hasOnly(...)` and `hasOnly(...)`.
9. **Immutable `createdAt` Tampering**: Client updates estimate attempting to overwrite `createdAt` -> Denied by `incoming().createdAt == existing().createdAt`.
10. **Client-Spoofed Timestamp**: Client creates estimate with backdated `createdAt: "2020-01-01"` instead of `request.time` -> Denied by `data.createdAt == request.time`.
11. **Oversized Array / Denial of Wallet**: Client sends `selectedParts` with 100 items or `notes` with 50,000 chars -> Denied by `size() <= 60` and `notes.size() <= 1500`.
12. **Type Poisoning on Update**: Client updates `vehicleType` to `"spaceship"` or `totals` to a boolean -> Denied by `isValidEstimate(incoming())`.
