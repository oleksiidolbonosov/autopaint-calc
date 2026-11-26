import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

test('Firestore rules enforce Eight Pillars and cover all blueprint collections', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
    firestore: Record<string, unknown>;
  };

  // Global safety net first
  assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  // Verified email enforcement & path ID validation
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  assert.ok(rules.includes('function isValidId(id)'));
  assert.ok(rules.includes('function hasUserProfile(userId)'));
  // Server timestamps enforced on create & update
  assert.ok(rules.includes('incoming().createdAt == request.time'));
  assert.ok(rules.includes('incoming().updatedAt == request.time'));
  assert.ok(rules.includes('incoming().createdAt == existing().createdAt'));
  // Strict array bounds & PII isolation on list queries
  assert.ok(rules.includes('allow list: if isSignedIn() && isOwner(userId) && resource.data.ownerId == request.auth.uid;'));
  assert.ok(rules.includes('allow list: if false;'));

  // Every blueprint path has a dedicated match block
  const expectedSegments = ['match /users/{userId}', 'match /settings/{settingId}', 'match /estimates/{estimateId}', 'match /materials/{materialId}', 'match /laborPrices/{operationId}', 'match /partTemplates/{partId}'];
  for (const seg of expectedSegments) {
    assert.ok(rules.includes(seg), `Missing rule block: ${seg}`);
  }
  // Order phase, deposit & two-sided parts rules present
  assert.ok(rules.includes("'orderPhase'"));
  assert.ok(rules.includes("'deposit'"));
  assert.ok(rules.includes("'doubleSidedParts'"));
  assert.equal(Object.keys(blueprint.firestore).length, 6);
});

test('Cloud sync list queries enforce ownerId filter matching security rules', () => {
  const syncSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/services/cloudSyncService.ts'),
    'utf8'
  );
  for (const col of ['estimates', 'materials', 'laborPrices', 'partTemplates']) {
    const pattern = new RegExp(
      `query\\(\\s*collection\\(db,\\s*'users',\\s*uid,\\s*'${col}'\\),\\s*where\\('ownerId',\\s*'==',\\s*uid\\)\\s*\\)`,
      'g'
    );
    const matches = syncSrc.match(pattern) ?? [];
    const expectedCount = col === 'estimates' ? 3 : 2;
    assert.equal(
      matches.length,
      expectedCount,
      `Expected ${expectedCount} ownerId-filtered queries for ${col}`
    );
  }
});

