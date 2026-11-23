#!/usr/bin/env node
import { computeDeterministicHash, verifyTaskProof } from "./index.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "verify";

  console.log("=================================================");
  console.log("   VeriPulse Deterministic AI Auditor Service   ");
  console.log("=================================================");

  if (command === "hash") {
    const input = args[1] || '{"status":"ok","analysis":"bullish"}';
    const hash = computeDeterministicHash(input);
    console.log(`Input: ${input}`);
    console.log(`Deterministic SHA-256 Hash: ${hash}`);
    return;
  }

  const taskId = args[1] || "task-1";
  const sampleAgentOutput = {
    analysis: "Net profit surged 24% YoY driven by enterprise cloud renewals.",
    sentiment: "positive",
    confidence: 0.985,
    tickers: ["NVDA", "MSFT", "GOOGL"]
  };

  console.log(`Auditing Task ID: ${taskId}`);
  console.log("Simulating Deterministic AI Execution Verification...");

  const attestation = await verifyTaskProof(taskId, sampleAgentOutput);

  console.log("\n--- AUDIT ATTESTATION REPORT ---");
  console.log(`Task ID:         ${attestation.taskId}`);
  console.log(`Verified:        ${attestation.verified ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Computed Hash:   ${attestation.computedHash}`);
  console.log(`Submitted Hash:  ${attestation.submittedHash}`);
  console.log(`Recommendation:  ${attestation.recommendation}`);
  console.log(`Summary:         ${attestation.summary}`);
  console.log("--------------------------------\n");
}

main().catch(console.error);
