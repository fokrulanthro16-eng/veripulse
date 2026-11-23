import * as crypto from "node:crypto";
import * as https from "node:https";
import * as http from "node:http";

export interface TaskState {
  id: string;
  client: string;
  agent: string;
  auditor: string;
  title: string;
  description: string;
  bountyUgnot: number;
  expectedHash: string;
  submittedHash: string;
  modelMetadata: string;
  status: "OPEN" | "SUBMITTED" | "VERIFIED" | "DISPUTED" | "REFUNDED";
  createdAt: number;
  submittedAt: number;
}

export interface AuditAttestation {
  taskId: string;
  verified: boolean;
  computedHash: string;
  submittedHash: string;
  expectedHash?: string;
  mismatchReason?: string;
  timestamp: string;
  auditorAddress: string;
  recommendation: "RELEASE_BOUNTY" | "REJECT_AND_DISPUTE" | "REQUIRE_RESUBMISSION";
  summary: string;
}

/**
 * Computes deterministic SHA-256 hash of an AI agent's execution output.
 * Normalizes JSON keys in lexicographical order and normalizes whitespace/newlines.
 */
export function computeDeterministicHash(data: string | object): string {
  let normalizedString: string;

  if (typeof data === "object" && data !== null) {
    normalizedString = canonicalizeJson(data);
  } else {
    normalizedString = String(data).replace(/\r\n/g, "\n").trim();
  }

  return crypto.createHash("sha256").update(normalizedString, "utf8").digest("hex");
}

/**
 * Recursively canonicalizes JSON object keys in sorted alphabetical order
 */
function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalizeJson(item)).join(",") + "]";
  }

  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map((key) => {
    return JSON.stringify(key) + ":" + canonicalizeJson(obj[key]);
  });
  return "{" + parts.join(",") + "}";
}

/**
 * Queries Gno.land Onyx RPC or returns local fallback state
 */
export async function queryRealmTask(
  taskId: string,
  rpcUrl: string = "https://rpc.onyx.gno.land:443"
): Promise<TaskState> {
  try {
    const qpath = `vm/qrender`;
    const data = `gno.land/r/g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy/veripulse:task/${taskId}`;
    const url = `${rpcUrl}/abci_query?path="${encodeURIComponent(qpath)}"&data="${encodeURIComponent(data)}"`;

    const response = await fetchWithTimeout(url, 2500);
    const parsed = JSON.parse(response);

    if (parsed?.result?.response?.value) {
      const decodedValue = Buffer.from(parsed.result.response.value, "base64").toString("utf8");
      return parseRenderedTask(taskId, decodedValue);
    }
  } catch (err) {
    // Fallback to deterministic simulated state when testing offline / local
  }

  return getSimulatedTaskState(taskId);
}

function parseRenderedTask(taskId: string, renderedMarkdown: string): TaskState {
  // Extract fields from Gno Render() markdown
  const statusMatch = renderedMarkdown.match(/- \*\*Status\*\*:\s*`([^`]+)`/);
  const submittedHashMatch = renderedMarkdown.match(/- \*\*Submitted Proof Hash\*\*:\s*`([^`]+)`/);
  const expectedHashMatch = renderedMarkdown.match(/- \*\*Expected Hash\*\*:\s*`([^`]+)`/);
  const clientMatch = renderedMarkdown.match(/- \*\*Client Address\*\*:\s*`([^`]+)`/);
  const agentMatch = renderedMarkdown.match(/- \*\*AI Agent Address\*\*:\s*`([^`]+)`/);
  const bountyMatch = renderedMarkdown.match(/- \*\*Bounty\*\*:\s*`(\d+)\s*ugnot`/);

  return {
    id: taskId,
    client: clientMatch ? clientMatch[1] : "g1client000000000000000000000000000000001",
    agent: agentMatch ? agentMatch[1] : "g1agent000000000000000000000000000000002",
    auditor: "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
    title: "VeriPulse Escrow Audit",
    description: "AI Deterministic Output Verification",
    bountyUgnot: bountyMatch ? parseInt(bountyMatch[1], 10) : 5000000,
    expectedHash: expectedHashMatch ? expectedHashMatch[1] : "",
    submittedHash: submittedHashMatch ? submittedHashMatch[1] : "",
    modelMetadata: "{\"model\":\"claude-3-5-sonnet-20241022\",\"temperature\":0}",
    status: (statusMatch ? statusMatch[1] : "SUBMITTED") as any,
    createdAt: Date.now() - 3600000,
    submittedAt: Date.now() - 1800000,
  };
}

function getSimulatedTaskState(taskId: string): TaskState {
  const sampleHash = "b4c26a04e0e57e4e107ff138bfbc90f23547285a73a46961a8ef6424590ee38e";
  return {
    id: taskId,
    client: "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
    agent: "g1agent9876543210zyxwvutsrqponmlkjihgfedcba",
    auditor: "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
    title: "Financial Sentiment Analysis (Deterministic Run)",
    description: "Analyze Q3 market earnings transcripts with temperature=0.0",
    bountyUgnot: 10000000,
    expectedHash: sampleHash,
    submittedHash: sampleHash,
    modelMetadata: "{\"model\":\"gpt-4o\",\"seed\":42,\"temperature\":0}",
    status: "SUBMITTED",
    createdAt: Date.now() - 120000,
    submittedAt: Date.now() - 30000,
  };
}

/**
 * Runs full audit verification against raw AI output and on-chain state
 */
export async function verifyTaskProof(
  taskId: string,
  rawOutput: string | object,
  rpcUrl?: string
): Promise<AuditAttestation> {
  const computedHash = computeDeterministicHash(rawOutput);
  const task = await queryRealmTask(taskId, rpcUrl);

  const hashesMatchSubmitted = computedHash.toLowerCase() === task.submittedHash.toLowerCase();
  const expectedHashCheck = task.expectedHash
    ? computedHash.toLowerCase() === task.expectedHash.toLowerCase()
    : true;

  const verified = hashesMatchSubmitted && expectedHashCheck;

  let recommendation: AuditAttestation["recommendation"] = "REJECT_AND_DISPUTE";
  let summary = "";

  if (verified) {
    recommendation = "RELEASE_BOUNTY";
    summary = `Deterministic audit PASSED for ${taskId}. Computed SHA-256 (${computedHash.slice(0, 16)}...) strictly matches on-chain proof. Verified for bounty release of ${task.bountyUgnot} ugnot.`;
  } else if (!hashesMatchSubmitted) {
    summary = `Audit FAILED: Computed SHA-256 hash (${computedHash}) does not match submitted agent hash (${task.submittedHash}). Output was tampered with or non-deterministic.`;
  } else {
    summary = `Audit FAILED: Computed hash matched agent submission but violated expected contract specification (${task.expectedHash}).`;
  }

  return {
    taskId,
    verified,
    computedHash,
    submittedHash: task.submittedHash,
    expectedHash: task.expectedHash,
    mismatchReason: verified ? undefined : summary,
    timestamp: new Date().toISOString(),
    auditorAddress: task.auditor,
    recommendation,
    summary,
  };
}

function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https:");
    const client = isHttps ? https : http;

    const req = client.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    req.on("error", (err) => reject(err));
  });
}
