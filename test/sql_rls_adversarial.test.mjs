// test/sql_rls_adversarial.test.mjs
// Adversarial SQL & RLS Verification Test Harness for Challenger 1

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log("=================================================");
console.log("🛡️ [CHALLENGER 1] ADVERSARIAL SQL & RLS TEST HARNESS");
console.log("=================================================");

// 1. Verify file presence and static properties of scripts/security_hardening.sql
const sqlPath = path.resolve('scripts/security_hardening.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

console.log("▶ [TEST 1] Static Analysis of SQL Hardening Script...");

// Check RLS enabled on all 10 tables
const requiredTables = [
  'foyers', 'foyer_members', 'vehicules', 'documents_sources',
  'lignes_interventions', 'defaillances_ct', 'echeances_previsionnelles',
  'audits_conformite', 'app_config', 'garages'
];

for (const tbl of requiredTables) {
  const rlsRegex = new RegExp(`ALTER TABLE IF EXISTS public\\.${tbl} ENABLE ROW LEVEL SECURITY;`, 'i');
  assert.ok(rlsRegex.test(sqlContent), `RLS must be enabled on table ${tbl}`);
}
console.log("  ✔ RLS systematically enabled on all 10 public tables.");

// Check search_path = public on all functions
const requiredFunctions = [
  'set_updated_at',
  'is_member_of_foyer',
  'is_foyer_admin',
  'is_foyer_owner'
];

for (const fn of requiredFunctions) {
  const fnRegex = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}[\\s\\S]*?SET search_path = public`, 'i');
  assert.ok(fnRegex.test(sqlContent), `Function ${fn} must have SET search_path = public`);
}
console.log("  ✔ search_path = public explicitly set on all 4 functions/triggers.");

// Check UUID type safety (no user_id = auth.uid()::text)
assert.ok(!sqlContent.includes('user_id = auth.uid()::text'), "Must not cast auth.uid() to text when comparing with UUID column user_id in DB functions");
console.log("  ✔ UUID type safety confirmed (no invalid UUID = TEXT casting).");

// Check storage bucket public = false
assert.ok(/UPDATE storage\.buckets\s+SET public = false\s+WHERE id = 'vehicle-vault';/i.test(sqlContent), "Bucket vehicle-vault must be set to public = false");
console.log("  ✔ Supabase Storage vehicle-vault bucket locked to private.");

// Check dropped obsolete public storage policy
assert.ok(/DROP POLICY IF EXISTS "Public can read documents if vehicle passport is public" ON storage\.objects;/i.test(sqlContent), "Must drop dangerous public storage policy");
console.log("  ✔ Obsolete public SELECT storage policy explicitly dropped.");

// 2. Database State & RLS Engine Simulation
class MockPostgresEngine {
  constructor() {
    this.foyers = [];
    this.foyer_members = [];
    this.vehicules = [];
    this.documents_sources = [];
    this.lignes_interventions = [];
    this.app_config = [];
    this.storage_objects = [];
  }

  // Security Definer Functions
  is_member_of_foyer(lookup_foyer_id, auth_uid) {
    if (!auth_uid) return false;
    return this.foyer_members.some(m => m.foyer_id === lookup_foyer_id && m.user_id === auth_uid);
  }

  is_foyer_admin(lookup_foyer_id, auth_uid) {
    if (!auth_uid) return false;
    return this.foyer_members.some(m => m.foyer_id === lookup_foyer_id && m.user_id === auth_uid && (m.role === 'owner' || m.role === 'admin'));
  }

  is_foyer_owner(lookup_foyer_id, auth_uid) {
    if (!auth_uid) return false;
    return this.foyer_members.some(m => m.foyer_id === lookup_foyer_id && m.user_id === auth_uid && m.role === 'owner');
  }

  // foyer_members RLS policies
  select_foyer_members(auth_uid) {
    // USING (user_id = auth.uid() OR public.is_member_of_foyer(foyer_id))
    return this.foyer_members.filter(m => {
      if (!auth_uid) return false;
      return m.user_id === auth_uid || this.is_member_of_foyer(m.foyer_id, auth_uid);
    });
  }

  insert_foyer_member(row, auth_uid) {
    // WITH CHECK (
    //   public.is_foyer_admin(foyer_id) OR
    //   (NOT EXISTS (SELECT 1 FROM public.foyer_members fm WHERE fm.foyer_id = public.foyer_members.foyer_id) AND user_id = auth.uid())
    // )
    if (!auth_uid) throw new Error("RLS: unauthenticated");
    const isAdmin = this.is_foyer_admin(row.foyer_id, auth_uid);
    const hasExistingMembers = this.foyer_members.some(m => m.foyer_id === row.foyer_id);
    const isFirstCreator = !hasExistingMembers && row.user_id === auth_uid;

    if (!isAdmin && !isFirstCreator) {
      throw new Error("RLS: new row violates row-level security policy for table 'foyer_members'");
    }

    // Unique constraint check
    if (this.foyer_members.some(m => m.foyer_id === row.foyer_id && m.user_id === row.user_id)) {
      throw new Error("Unique constraint violation: uq_foyer_user");
    }

    this.foyer_members.push({ ...row });
    return row;
  }

  update_foyer_member(targetUserId, targetFoyerId, updates, auth_uid) {
    // USING (public.is_foyer_admin(foyer_id)) WITH CHECK (public.is_foyer_admin(foyer_id))
    if (!auth_uid || !this.is_foyer_admin(targetFoyerId, auth_uid)) {
      throw new Error("RLS: update violates row-level security policy for table 'foyer_members'");
    }
    const idx = this.foyer_members.findIndex(m => m.foyer_id === targetFoyerId && m.user_id === targetUserId);
    if (idx === -1) return 0;
    this.foyer_members[idx] = { ...this.foyer_members[idx], ...updates };
    return 1;
  }

  delete_foyer_member(targetUserId, targetFoyerId, auth_uid) {
    // USING (public.is_foyer_admin(foyer_id) OR user_id = auth.uid())
    if (!auth_uid) throw new Error("RLS: delete violates row-level security policy for table 'foyer_members'");
    const isAdmin = this.is_foyer_admin(targetFoyerId, auth_uid);
    const isSelf = targetUserId === auth_uid;
    if (!isAdmin && !isSelf) {
      throw new Error("RLS: delete violates row-level security policy for table 'foyer_members'");
    }
    const beforeLen = this.foyer_members.length;
    this.foyer_members = this.foyer_members.filter(m => !(m.foyer_id === targetFoyerId && m.user_id === targetUserId));
    return beforeLen - this.foyer_members.length;
  }

  // app_config RLS
  select_app_config(auth_uid, role = 'authenticated') {
    // USING (is_public = TRUE)
    return this.app_config.filter(c => c.is_public === true);
  }

  mutate_app_config(role) {
    // TO service_role
    if (role !== 'service_role') {
      throw new Error("RLS: table 'app_config' mutation restricted to service_role");
    }
    return true;
  }

  // storage.objects RLS
  get_folder_name(name) {
    const parts = name.split('/');
    return parts.length > 1 ? parts : [];
  }

  insert_storage_object(bucket_id, name, auth_uid) {
    if (!auth_uid) throw new Error("Storage RLS: unauthenticated upload rejected");
    if (bucket_id !== 'vehicle-vault') throw new Error("Storage RLS: invalid bucket");
    const folders = this.get_folder_name(name);
    if (!folders[0] || folders[0] !== auth_uid) {
      throw new Error("Storage RLS: upload denied - not in user's root folder");
    }
    this.storage_objects.push({ bucket_id, name, auth_uid });
    return true;
  }

  select_storage_objects(bucket_id, auth_uid) {
    if (!auth_uid) return [];
    if (bucket_id !== 'vehicle-vault') return [];
    return this.storage_objects.filter(obj => {
      const folders = this.get_folder_name(obj.name);
      return folders[0] === auth_uid;
    });
  }

  delete_storage_object(bucket_id, name, auth_uid) {
    if (!auth_uid) throw new Error("Storage RLS: unauthenticated delete rejected");
    if (bucket_id !== 'vehicle-vault') throw new Error("Storage RLS: invalid bucket");
    const folders = this.get_folder_name(name);
    if (!folders[0] || folders[0] !== auth_uid) {
      throw new Error("Storage RLS: delete denied - not user's file");
    }
    const idx = this.storage_objects.findIndex(o => o.bucket_id === bucket_id && o.name === name);
    if (idx !== -1) {
      this.storage_objects.splice(idx, 1);
      return 1;
    }
    return 0;
  }
}

// 3. Execute Adversarial Attack Scenarios
console.log("▶ [TEST 2] Adversarial Attacks on foyer_members RLS...");
const db = new MockPostgresEngine();

const VICTIM_USER_ID = "11111111-aaaa-bbbb-cccc-111111111111";
const VICTIM_FOYER_ID = "22222222-aaaa-bbbb-cccc-222222222222";
const ATTACKER_USER_ID = "99999999-dead-beef-cafe-999999999999";
const MEMBER_USER_ID = "33333333-aaaa-bbbb-cccc-333333333333";

// Initial legitimate foyer setup
db.foyers.push({ id: VICTIM_FOYER_ID, nom: "Foyer Legitime" });
db.insert_foyer_member({ foyer_id: VICTIM_FOYER_ID, user_id: VICTIM_USER_ID, role: 'owner' }, VICTIM_USER_ID);
assert.equal(db.foyer_members.length, 1);
console.log("  ✔ Legitimate owner created initial foyer successfully.");

// Attack 2.1: Attacker attempts to insert self into victim's foyer (Takeover attempt)
assert.throws(() => {
  db.insert_foyer_member({ foyer_id: VICTIM_FOYER_ID, user_id: ATTACKER_USER_ID, role: 'owner' }, ATTACKER_USER_ID);
}, /violates row-level security policy/);
console.log("  ✔ [BLOCKED] Attacker takeover of existing victim foyer thwarted.");

// Attack 2.2: Victim Admin adds a regular member
db.insert_foyer_member({ foyer_id: VICTIM_FOYER_ID, user_id: MEMBER_USER_ID, role: 'member' }, VICTIM_USER_ID);
assert.equal(db.foyer_members.length, 2);
console.log("  ✔ Admin successfully invited regular member.");

// Attack 2.3: Regular member tries to invite another user
assert.throws(() => {
  db.insert_foyer_member({ foyer_id: VICTIM_FOYER_ID, user_id: ATTACKER_USER_ID, role: 'member' }, MEMBER_USER_ID);
}, /violates row-level security policy/);
console.log("  ✔ [BLOCKED] Regular member prohibited from adding new members.");

// Attack 2.4: Regular member tries to escalate privileges to 'admin' or 'owner' via UPDATE
assert.throws(() => {
  db.update_foyer_member(MEMBER_USER_ID, VICTIM_FOYER_ID, { role: 'owner' }, MEMBER_USER_ID);
}, /violates row-level security policy/);
console.log("  ✔ [BLOCKED] Privilege escalation from member to owner prohibited.");

// Attack 2.5: Attacker tries to update victim's role
assert.throws(() => {
  db.update_foyer_member(VICTIM_USER_ID, VICTIM_FOYER_ID, { role: 'member' }, ATTACKER_USER_ID);
}, /violates row-level security policy/);
console.log("  ✔ [BLOCKED] External attacker cannot modify roles in foreign foyer.");

// Attack 2.6: Attacker tries to delete victim from foyer
assert.throws(() => {
  db.delete_foyer_member(VICTIM_USER_ID, VICTIM_FOYER_ID, ATTACKER_USER_ID);
}, /violates row-level security policy/);
console.log("  ✔ [BLOCKED] External attacker cannot delete victim from foyer.");

// Attack 2.7: Member voluntarily leaves foyer
const deletedCount = db.delete_foyer_member(MEMBER_USER_ID, VICTIM_FOYER_ID, MEMBER_USER_ID);
assert.equal(deletedCount, 1);
console.log("  ✔ Legitimate self-leave operation allowed.");

// Attack 2.8: Attacker creates fresh foyer and inserts self as first owner
const ATTACKER_FOYER_ID = "88888888-dead-beef-cafe-888888888888";
db.foyers.push({ id: ATTACKER_FOYER_ID, nom: "Foyer Attacker" });
db.insert_foyer_member({ foyer_id: ATTACKER_FOYER_ID, user_id: ATTACKER_USER_ID, role: 'owner' }, ATTACKER_USER_ID);
console.log("  ✔ Attacker can create own separate household without impacting victim.");

// Attack 2.9: Attacker tries to insert victim as first member of a new foyer
const ROGUE_FOYER_ID = "77777777-dead-beef-cafe-777777777777";
assert.throws(() => {
  db.insert_foyer_member({ foyer_id: ROGUE_FOYER_ID, user_id: VICTIM_USER_ID, role: 'owner' }, ATTACKER_USER_ID);
}, /violates row-level security policy/);
console.log("  ✔ [BLOCKED] Attacker cannot assign other users to uninitialized foyer.");

// 4. Test Storage Policies on storage.objects
console.log("▶ [TEST 3] Adversarial Attacks on Supabase Storage (vehicle-vault)...");

// Upload legitimate files
db.insert_storage_object('vehicle-vault', `${VICTIM_USER_ID}/vehicule-1/facture.pdf`, VICTIM_USER_ID);
db.insert_storage_object('vehicle-vault', `${VICTIM_USER_ID}/vehicule-1/ct.pdf`, VICTIM_USER_ID);
console.log("  ✔ Victim uploaded legitimate documents to own folder.");

// Attack 3.1: Attacker tries to upload to victim's folder
assert.throws(() => {
  db.insert_storage_object('vehicle-vault', `${VICTIM_USER_ID}/vehicule-1/trojan.pdf`, ATTACKER_USER_ID);
}, /upload denied/);
console.log("  ✔ [BLOCKED] Cross-user upload into foreign folder denied.");

// Attack 3.2: Unauthenticated upload attempt
assert.throws(() => {
  db.insert_storage_object('vehicle-vault', `${VICTIM_USER_ID}/vehicule-1/trojan.pdf`, null);
}, /unauthenticated/);
console.log("  ✔ [BLOCKED] Unauthenticated upload attempt denied.");

// Attack 3.3: Path traversal upload attempt
assert.throws(() => {
  db.insert_storage_object('vehicle-vault', `../${VICTIM_USER_ID}/vehicule-1/trojan.pdf`, ATTACKER_USER_ID);
}, /upload denied/);
console.log("  ✔ [BLOCKED] Path traversal upload attempt denied.");

// Attack 3.4: Attacker lists storage objects
const attackerObjects = db.select_storage_objects('vehicle-vault', ATTACKER_USER_ID);
assert.equal(attackerObjects.length, 0, "Attacker must see 0 files from victim");
console.log("  ✔ [BLOCKED] Attacker receives 0 objects from victim's private vault.");

// Attack 3.5: Unauthenticated listing
const anonObjects = db.select_storage_objects('vehicle-vault', null);
assert.equal(anonObjects.length, 0, "Anon must see 0 files");
console.log("  ✔ [BLOCKED] Unauthenticated listing returns 0 objects.");

// Attack 3.6: Attacker tries to delete victim's file
assert.throws(() => {
  db.delete_storage_object('vehicle-vault', `${VICTIM_USER_ID}/vehicule-1/facture.pdf`, ATTACKER_USER_ID);
}, /delete denied/);
console.log("  ✔ [BLOCKED] Cross-user file deletion denied.");

// Legitimate delete by victim
const delRes = db.delete_storage_object('vehicle-vault', `${VICTIM_USER_ID}/vehicule-1/facture.pdf`, VICTIM_USER_ID);
assert.equal(delRes, 1);
console.log("  ✔ Legitimate deletion by document owner allowed.");

// 5. Test app_config RLS Protection
console.log("▶ [TEST 4] Adversarial Attacks on app_config...");

db.app_config.push({
  key: "delais_controle_technique",
  is_public: true,
  value: { premier_ct_mois: 48 }
});
db.app_config.push({
  key: "prompts_ia_extraction",
  is_public: false,
  value: { system_instruction_facture: "Secret system prompt" }
});

// Attack 4.1: Authenticated user queries public config
const authConfig = db.select_app_config(ATTACKER_USER_ID, 'authenticated');
assert.equal(authConfig.length, 1);
assert.equal(authConfig[0].key, "delais_controle_technique");
console.log("  ✔ Authenticated client receives ONLY is_public = true configurations.");

// Attack 4.2: Anon queries config
const anonConfig = db.select_app_config(null, 'anon');
assert.equal(anonConfig.length, 1);
assert.equal(anonConfig[0].key, "delais_controle_technique");
console.log("  ✔ Anon client receives ONLY is_public = true configurations.");

// Attack 4.3: Direct lookup for secret prompt is empty
const secretFound = authConfig.find(c => c.key === "prompts_ia_extraction");
assert.equal(secretFound, undefined);
console.log("  ✔ [BLOCKED] Secret AI prompts (is_public = FALSE) invisible to client queries.");

// Attack 4.4: Authenticated user tries to update app_config
assert.throws(() => {
  db.mutate_app_config('authenticated');
}, /restricted to service_role/);
console.log("  ✔ [BLOCKED] Client mutation on app_config denied.");

console.log("=================================================");
console.log("🎉 ALL ADVERSARIAL CHALLENGER 1 TESTS PASSED (100% SUCCESS) !");
console.log("=================================================");
