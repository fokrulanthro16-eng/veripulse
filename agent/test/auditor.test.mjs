import test from "node:test";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";

// Inline replication of the deterministic hashing and verification logic for test runner
function canonicalizeJson(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const sortedKeys = Object.keys(obj).sort();
  return "{" + sortedKeys.map((k) => JSON.stringify(k) + ":" + canonicalizeJson(obj[k])).join(",") + "}";
}

function computeDeterministicHash(data) {
  let normalizedString;
  if (typeof data === "object" && data !== null) {
    normalizedString = canonicalizeJson(data);
  } else {
    normalizedString = String(data).replace(/\r\n/g, "\n").trim();
  }
  return crypto.createHash("sha256").update(normalizedString, "utf8").digest("hex");
}

function verifyOutput(submittedHash, rawOutput, expectedHash) {
  const computedHash = computeDeterministicHash(rawOutput);
  const matchSubmitted = computedHash.toLowerCase() === submittedHash.toLowerCase();
  const matchExpected = expectedHash ? computedHash.toLowerCase() === expectedHash.toLowerCase() : true;
  const verified = matchSubmitted && matchExpected;

  return {
    verified,
    computedHash,
    submittedHash,
    recommendation: verified ? "RELEASE_BOUNTY" : "REJECT_AND_DISPUTE",
  };
}

test("Deterministic Hashing - JSON Key Order Invariance", () => {
  const payloadA = { model: "claude-3-5", seed: 42, result: "bullish", tokens: 154 };
  const payloadB = { tokens: 154, result: "bullish", model: "claude-3-5", seed: 42 };

  const hashA = computeDeterministicHash(payloadA);
  const hashB = computeDeterministicHash(payloadB);

  assert.strictEqual(hashA, hashB, "Hashes must be identical regardless of key order");
  assert.strictEqual(hashA.length, 64, "Hash must be 64 characters long");
});

test("Deterministic Hashing - CRLF vs LF Normalization", () => {
  const textCRLF = "Line 1\r\nLine 2\r\nLine 3\r\n";
  const textLF = "Line 1\nLine 2\nLine 3\n";

  const hashCRLF = computeDeterministicHash(textCRLF);
  const hashLF = computeDeterministicHash(textLF);

  assert.strictEqual(hashCRLF, hashLF, "Hashes must normalize line endings deterministically");
});

test("Auditor Verification - Valid Output Matches On-Chain Proof", () => {
  const agentOutput = { summary: "Revenue +12%", accuracy: 0.99 };
  const targetHash = computeDeterministicHash(agentOutput);

  const attestation = verifyOutput(targetHash, agentOutput, targetHash);

  assert.strictEqual(attestation.verified, true);
  assert.strictEqual(attestation.recommendation, "RELEASE_BOUNTY");
  assert.strictEqual(attestation.computedHash, targetHash);
});

test("Auditor Verification - Tampered Output Rejection", () => {
  const legitimateOutput = { summary: "Revenue +12%", accuracy: 0.99 };
  const tamperedOutput = { summary: "Revenue -50%", accuracy: 0.99 };
  const targetHash = computeDeterministicHash(legitimateOutput);

  const attestation = verifyOutput(targetHash, tamperedOutput, targetHash);

  assert.strictEqual(attestation.verified, false);
  assert.strictEqual(attestation.recommendation, "REJECT_AND_DISPUTE");
  assert.notStrictEqual(attestation.computedHash, targetHash);
});
