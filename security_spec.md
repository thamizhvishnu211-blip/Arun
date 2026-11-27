# AgriSphere Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **No Self-Assigned Admin**: Users registering in `/users/{userId}` can only choose `farmer`, `buyer`, `provider`, or `expert` (unless they are already a verified bootstrapped admin) and must start with `verificationStatus: 'pending'` and `accountStatus: 'active'`.
2. **PII Isolation**: `/users`, `/farmer_profiles`, `/buyer_profiles`, `/provider_profiles`, and `/expert_profiles` contain phone/email/address PII and are strictly readable only by `request.auth.uid == userId` or `isAdmin()`.
3. **Eco Points Ledger Integrity**: Farmers can submit `eco_points_transactions` only with `status: 'pending'` and `awardedPoints: 0`. Only `isAdmin()` can verify claims and award points.
4. **Relational Ownership**: Crops, fields, soil measurements, and irrigation schedules must reference an existing `/farms/{farmId}` owned by `request.auth.uid`.
5. **Two-Party Order State Machine**: Orders are readable only by `farmerId`, `buyerId`, or `isAdmin()`. Completed/rejected/cancelled orders are terminally locked (except admin override).
6. **Immutable Audit Trail**: `/audit_logs` are append-only (`update` and `delete` strictly denied) and readable only by `isAdmin()`.
7. **Server Timestamps**: All `createdAt` and `updatedAt` timestamps must strictly equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation**: Non-admin creating `/users/{uid}` with `role: 'admin'` -> `PERMISSION_DENIED`.
2. **Verification Spoofing**: Farmer updating `/users/{uid}` with `verificationStatus: 'verified'` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection**: Creating `/marketplace_listings/{id}` with undocumented ghost field `isPromoted: true` -> `PERMISSION_DENIED`.
4. **Eco Points Manipulation**: Farmer creating `/eco_points_transactions/{id}` with `status: 'verified'` and `awardedPoints: 9999` -> `PERMISSION_DENIED`.
5. **PII Blanket Read**: Authenticated Buyer requesting `get /farmer_profiles/{otherFarmerUid}` -> `PERMISSION_DENIED`.
6. **Cross-Tenant Farm Poisoning**: Farmer A creating `/crops/{id}` pointing to Farmer B's `farmId` -> `PERMISSION_DENIED`.
7. **Terminal State Violation**: Farmer modifying an order already in `status: 'completed'` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Creating `/farms/{200-char-junk-id}` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating `/farms/{id}` with backdated `createdAt` != `request.time` -> `PERMISSION_DENIED`.
10. **Audit Log Tampering**: Any user attempting `delete /audit_logs/{id}` -> `PERMISSION_DENIED`.
11. **Unverified Email Spoof**: User with `email: 'thamizh.vishnu211@gmail.com'` but `email_verified: false` attempting admin write -> `PERMISSION_DENIED`.
12. **Value Poisoning**: Buyer updating allowed `status` on `/orders/{id}` to invalid value `'free_override'` or non-string -> `PERMISSION_DENIED`.
