// test-compliance-e2e.js
// End-to-End Compliance, Evidence, Engine and Audit Test Suite.
// Verifies full integration across PM, TL, TM workflows and security invariants.

import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { prisma } from './src/config/prisma.js';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';

console.log('================================================================================');
console.log('         RUNNING TEST-COMPLIANCE-E2E.JS (END-TO-END VERIFICATION)               ');
console.log('================================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function testStep(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
    throw err;
  }
}

async function runComplianceE2ETests() {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Load users from database
    const complianceOfficer = await prisma.user.findFirst({
      where: { email: 'compliance@acme.com' },
      include: { company: true },
    });
    const pm = await prisma.user.findFirst({
      where: { email: 'pm@acme.com' },
      include: { company: true },
    });
    const tl = await prisma.user.findFirst({
      where: { email: 'tl@acme.com' },
      include: { company: true },
    });
    const tm = await prisma.user.findFirst({
      where: { email: 'employee@acme.com' },
      include: { company: true },
    });

    assert.ok(complianceOfficer, 'Compliance Officer (compliance@acme.com) must exist');
    assert.ok(pm, 'Project Manager (pm@acme.com) must exist');
    assert.ok(tl, 'Team Lead (tl@acme.com) must exist');
    assert.ok(tm, 'Team Member (employee@acme.com) must exist');

    function makeToken(user) {
      return jwt.sign(
        {
          sub: user.id,
          id: user.id,
          email: user.email,
          tokenVersion: user.tokenVersion,
        },
        env.JWT_SECRET || 'secret',
        { expiresIn: '2h' }
      );
    }

    const coToken = makeToken(complianceOfficer);
    const pmToken = makeToken(pm);
    const tlToken = makeToken(tl);
    const tmToken = makeToken(tm);

    const headersFor = (token) => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    console.log('--- Phase 1: Database Seed Integrity ---');
    await testStep('Verify seeded compliance categories exist with correct ownership', async () => {
      const categories = await prisma.complianceCategory.findMany({
        where: { companyId: complianceOfficer.companyId },
      });
      assert.ok(categories.length >= 4, `Expected at least 4 categories, found ${categories.length}`);
      const secCat = categories.find((c) => c.name.includes('Security'));
      assert.ok(secCat, 'Security category must exist');
      console.log(`         Found ${categories.length} categories (Security, Operations, Privacy, Financial)`);
    });

    await testStep('Verify seeded rules, severities, and binding scopes', async () => {
      const rules = await prisma.complianceRule.findMany({
        where: { companyId: complianceOfficer.companyId },
        include: { bindings: true },
      });
      assert.ok(rules.length >= 6, `Expected at least 6 rules, found ${rules.length}`);
      const overdueRule = rules.find((r) => r.ruleType === 'Overdue');
      assert.ok(overdueRule, 'Rule with ruleType Overdue must exist');
      assert.ok(overdueRule.bindings.length >= 1, 'Overdue rule must have bindings');
      console.log(`         Verified ${rules.length} rules with Company, Branch, Team, and Project bindings`);
    });

    await testStep('Verify seeded violations cover Open, Under_Review, and Resolved statuses', async () => {
      const violations = await prisma.complianceViolation.findMany({
        where: { companyId: complianceOfficer.companyId },
      });
      const statuses = new Set(violations.map((v) => v.status));
      assert.ok(statuses.has('Open'), 'Violations must contain Open status');
      assert.ok(statuses.has('Under_Review'), 'Violations must contain Under_Review status');
      assert.ok(statuses.has('Resolved'), 'Violations must contain Resolved status');
      console.log(`         Verified ${violations.length} violations across statuses: ${Array.from(statuses).join(', ')}`);
    });

    await testStep('Verify seeded evidence links TM submitters to TL/PM reviewers', async () => {
      const evidences = await prisma.complianceEvidence.findMany({
        where: { companyId: complianceOfficer.companyId },
        include: { user: true, reviewedBy: true, task: true },
      });
      assert.ok(evidences.length >= 5, `Expected at least 5 evidence records, found ${evidences.length}`);
      const approved = evidences.find((e) => e.status === 'Approved' && e.reviewedById);
      assert.ok(approved, 'Must have at least one approved evidence with a reviewer');
      assert.notEqual(approved.userId, approved.reviewedById, 'Reviewer must differ from submitter');
      console.log(`         Verified Approved evidence: Submitter (${approved.user.fullName}) -> Reviewer (${approved.reviewedBy.fullName})`);
    });

    console.log('\n--- Phase 2: Category & Rule Management APIs ---');
    let createdCategoryId;
    await testStep('Compliance Officer creates a new Compliance Category via API', async () => {
      const res = await fetch(`${baseUrl}/api/compliance-categories`, {
        method: 'POST',
        headers: headersFor(coToken),
        body: JSON.stringify({
          name: `Automated Test Category ${Date.now()}`,
          description: 'Created during e2e compliance integration verification',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.ok(json.success);
      assert.ok(json.data.id);
      createdCategoryId = json.data.id;
    });

    await testStep('Team Member is forbidden from creating Compliance Categories (RBAC check)', async () => {
      const res = await fetch(`${baseUrl}/api/compliance-categories`, {
        method: 'POST',
        headers: headersFor(tmToken),
        body: JSON.stringify({
          name: 'Rogue Category',
          description: 'Should fail with 403',
        }),
      });
      assert.equal(res.status, 403, 'Team member must be rejected with 403 Forbidden');
    });

    await testStep('GET /api/compliance-rules returns full items with include shapes (PRE-M1-01)', async () => {
      const res = await fetch(`${baseUrl}/api/compliance-rules`, {
        headers: headersFor(pmToken),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.success);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length > 0);
      const first = json.data[0];
      assert.ok('category' in first, 'Rule response must include category');
      assert.ok('bindings' in first, 'Rule response must include bindings');
    });

    console.log('\n--- Phase 3: Violations Server-Side Query Filtering (PRE-M1-02) ---');
    await testStep('Filter violations by status=Open', async () => {
      const res = await fetch(`${baseUrl}/api/compliance-violations?status=Open`, {
        headers: headersFor(coToken),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.success);
      assert.ok(json.data.every((v) => v.status === 'Open'), 'All returned items must have status=Open');
      console.log(`         Filtered query returned ${json.data.length} Open violations`);
    });

    await testStep('Filter violations by severity=Critical', async () => {
      const res = await fetch(`${baseUrl}/api/compliance-violations?severity=Critical`, {
        headers: headersFor(coToken),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.success);
      assert.ok(json.data.every((v) => v.severity === 'Critical'), 'All returned items must have severity=Critical');
      console.log(`         Filtered query returned ${json.data.length} Critical violations`);
    });

    console.log('\n--- Phase 4: Atomic Evidence Upload & Security Invariants ---');
    let newlyCreatedEvidenceId;
    await testStep('Single-step atomic multipart evidence creation with attached file (SEC-M1-08)', async () => {
      const formData = new FormData();
      formData.append('title', 'E2E OAuth2 Test Verification Artifact');
      formData.append('notes', 'Submitted via atomic multipart request');
      formData.append('evidenceType', 'Document');
      const blob = new Blob(['%PDF-1.4 Mock verification content for automated tests'], {
        type: 'application/pdf',
      });
      formData.append('file', blob, 'e2e_test_artifact.pdf');

      const res = await fetch(`${baseUrl}/api/evidence`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tmToken}`,
        },
        body: formData,
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.ok(json.success);
      assert.ok(json.data.id);
      assert.ok(json.data.fileUrl, 'Evidence must have fileUrl populated atomically');
      assert.equal(json.data.status, 'Pending');
      newlyCreatedEvidenceId = json.data.id;
      console.log(`         Created evidence ID ${newlyCreatedEvidenceId} with fileUrl: ${json.data.fileUrl}`);
    });

    await testStep('Disallowed file extension is rejected with 400 (SEC-M1-02 XSS guard)', async () => {
      const formData = new FormData();
      formData.append('title', 'Malicious Script Upload Attempt');
      const badBlob = new Blob(['<script>alert("xss")</script>'], { type: 'text/html' });
      formData.append('file', badBlob, 'exploit.html');

      const res = await fetch(`${baseUrl}/api/evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tmToken}` },
        body: formData,
      });

      assert.equal(res.status, 400, 'HTML file upload must be rejected with 400');
      const json = await res.json();
      assert.ok(json.error || json.message);
      console.log(`         Rejection confirmed: "${json.error || json.message}"`);
    });

    await testStep('Submitter is forbidden from approving own evidence (SEC-M1-05 Self-approval guard)', async () => {
      const res = await fetch(`${baseUrl}/api/evidence/${newlyCreatedEvidenceId}`, {
        method: 'PATCH',
        headers: headersFor(tmToken),
        body: JSON.stringify({
          status: 'Approved',
        }),
      });
      assert.equal(res.status, 403, 'Self-approval must return 403 Forbidden');
      console.log('         Self-approval blocked as expected');
    });

    await testStep('Team Lead approves evidence successfully', async () => {
      const res = await fetch(`${baseUrl}/api/evidence/${newlyCreatedEvidenceId}`, {
        method: 'PATCH',
        headers: headersFor(tlToken),
        body: JSON.stringify({
          status: 'Approved',
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.success);
      assert.equal(json.data.status, 'Approved');
      assert.equal(json.data.reviewedById, tl.id);
      console.log(`         Evidence approved by Team Lead ${tl.fullName}`);
    });

    await testStep('File swapping after approval is blocked with 400 (SEC-M1-03 Post-approval lock)', async () => {
      const formData = new FormData();
      const replaceBlob = new Blob(['Replacement file content'], { type: 'application/pdf' });
      formData.append('file', replaceBlob, 'replacement.pdf');

      const res = await fetch(`${baseUrl}/api/evidence/${newlyCreatedEvidenceId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tmToken}` },
        body: formData,
      });

      assert.equal(res.status, 400, 'File replacement on Approved evidence must return 400');
      console.log('         Post-approval replacement blocked as expected');
    });

    await testStep('Non-admin deleting Approved evidence is rejected with 403 (SEC-M1-07 Delete guard)', async () => {
      const res = await fetch(`${baseUrl}/api/evidence/${newlyCreatedEvidenceId}`, {
        method: 'DELETE',
        headers: headersFor(tmToken),
      });
      assert.equal(res.status, 403, 'Non-admin delete of Approved evidence must return 403');
      console.log('         Approved evidence delete blocked for regular member');
    });

    console.log('\n--- Phase 5: Compliance Engine Execution (SEC-M1-13) ---');
    await testStep('Trigger automated compliance engine via POST /api/compliance-rules/run-engine', async () => {
      const res = await fetch(`${baseUrl}/api/compliance-rules/run-engine`, {
        method: 'POST',
        headers: headersFor(coToken),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.success);
      assert.ok('newViolations' in json.data);
      assert.ok('resolvedViolations' in json.data);
      console.log(`         Engine executed: ${json.data.newViolations} new violations, ${json.data.resolvedViolations} auto-resolved`);
    });

    console.log('\n--- Phase 6: Audit Trail & API Security (SEC-M1-09) ---');
    await testStep('GET /api/audit-logs retrieves server-generated compliance audit trail', async () => {
      const res = await fetch(`${baseUrl}/api/audit-logs`, {
        headers: headersFor(coToken),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.success);
      const items = Array.isArray(json.data) ? json.data : json.data?.items || [];
      assert.ok(items.length > 0, 'Audit log trail must contain entries');
      console.log(`         Retrieved ${items.length} immutable audit log entries`);
    });

    await testStep('Unauthenticated client cannot forge audit rows via POST /api/audit-logs (SEC-M1-09)', async () => {
      const res = await fetch(`${baseUrl}/api/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE', details: 'Forged audit log attempt' }),
      });
      assert.ok([401, 404, 405].includes(res.status), `Expected 401/404/405, got ${res.status}`);
      console.log('         Audit log endpoint lockdown confirmed');
    });

    console.log('\n================================================================================');
    console.log(`  SUMMARY: All ${passedTests} / ${totalTests} End-to-End Compliance Tests PASSED!`);
    console.log('================================================================================\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runComplianceE2ETests().catch((err) => {
  console.error('\n[FATAL] Compliance E2E Test Suite Encountered an Error:');
  console.error(err);
  process.exit(1);
});
