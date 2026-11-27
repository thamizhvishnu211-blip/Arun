/**
 * AgriSphere Firestore Security Rules Test Specification (Dirty Dozen Adversarial Suite)
 * Verifies all 12 security invariants against firestore.rules when run with the Firebase Emulator.
 */
export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
  description: string;
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_SECURITY_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Privilege Escalation via Self-Assigned Admin Role',
    collection: 'users',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Non-admin user attempts to register with role="admin" and verificationStatus="verified".',
    payload: { role: 'admin', verificationStatus: 'verified', accountStatus: 'active' }
  },
  {
    id: 2,
    name: 'Self-Verification Spoofing',
    collection: 'users',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Farmer attempts to update their own verificationStatus to verified.',
    payload: { verificationStatus: 'verified' }
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Marketplace Listing',
    collection: 'marketplace_listings',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Farmer injects undocumented ghost field isPromoted=true into listing.',
    payload: { isPromoted: true }
  },
  {
    id: 4,
    name: 'Eco Points Self-Award Manipulation',
    collection: 'eco_points_transactions',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Farmer attempts to create a verified eco_points_transactions entry with awardedPoints=9999.',
    payload: { status: 'verified', awardedPoints: 9999 }
  },
  {
    id: 5,
    name: 'PII Blanket Read on Farmer Profiles',
    collection: 'farmer_profiles',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Authenticated buyer attempts to read another farmer profile containing phone/address PII.'
  },
  {
    id: 6,
    name: 'Cross-Tenant Farm Ownership Poisoning',
    collection: 'crops',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Farmer A attempts to attach a crop record to Farmer B farmId.'
  },
  {
    id: 7,
    name: 'Terminal Order State Mutation',
    collection: 'orders',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Farmer attempts to alter an order whose status is already completed.'
  },
  {
    id: 8,
    name: 'Document ID Poisoning',
    collection: 'farms',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Attacker attempts to create a farm with a 200-character malformed ID.'
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    collection: 'farms',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Client supplies a forged historical timestamp instead of serverTimestamp().'
  },
  {
    id: 10,
    name: 'Immutable Audit Log Deletion',
    collection: 'audit_logs',
    operation: 'delete',
    expectedResult: 'PERMISSION_DENIED',
    description: 'User or admin attempts to delete an audit_logs entry.'
  },
  {
    id: 11,
    name: 'Unverified Email Admin Spoofing',
    collection: 'platform_settings',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Token matching admin email with email_verified=false attempts admin mutation.'
  },
  {
    id: 12,
    name: 'Order Status Value Poisoning',
    collection: 'orders',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    description: 'Buyer attempts to set status to an arbitrary invalid value outside the allowed enum.'
  }
];
