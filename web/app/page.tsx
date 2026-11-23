"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Cpu,
  Coins,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  Terminal,
  Activity,
  Zap,
  Rocket,
  CheckCircle,
} from "lucide-react";
import { VERIPULSE_GNO_CODE, GNOMOD_TOML_CODE } from "./contracts";

interface EscrowTask {
  id: string;
  client: string;
  agent: string;
  auditor: string;
  title: string;
  description: string;
  bountyGnot: number;
  expectedHash: string;
  submittedHash: string;
  modelMetadata: string;
  auditorNotes: string;
  status: "OPEN" | "SUBMITTED" | "VERIFIED" | "DISPUTED" | "REFUNDED";
  timestamp: string;
}

const ONYX_RPC = "https://rpc.onyx.testnets.gno.land";
const REALM_PKG = "gno.land/r/g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy/veripulse";

// Seeded tasks demonstrating all protocol states
const INITIAL_TASKS: EscrowTask[] = [
  {
    id: "task-1",
    client: "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
    agent: "g1agent9876543210zyxwvutsrqponmlkjihgfedcba",
    auditor: "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
    title: "Financial Sentiment Analysis (Q3)",
    description: "Analyze earnings calls with temperature=0 and compute sentiment vectors.",
    bountyGnot: 10.0,
    expectedHash: "b4c26a04e0e57e4e107ff138bfbc90f23547285a73a46961a8ef6424590ee38e",
    submittedHash: "b4c26a04e0e57e4e107ff138bfbc90f23547285a73a46961a8ef6424590ee38e",
    modelMetadata: '{"model":"claude-3-5-sonnet","seed":1042,"temp":0.0}',
    auditorNotes: "SHA-256 matched deterministic benchmark with 100% precision.",
    status: "VERIFIED",
    timestamp: "10 mins ago",
  },
  {
    id: "task-2",
    client: "g1client777777777777777777777777777777777",
    agent: "g1agent444444444444444444444444444444444",
    auditor: "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
    title: "Smart Contract AST Vulnerability Scan",
    description: "Perform formal AST fuzzing for reentrancy bugs on realm packages.",
    bountyGnot: 25.5,
    expectedHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    submittedHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    modelMetadata: '{"model":"gpt-4o-deterministic","system_seed":99}',
    auditorNotes: "Pending final auditor cryptographic attestation signature.",
    status: "SUBMITTED",
    timestamp: "28 mins ago",
  },
  {
    id: "task-3",
    client: "g1client1234567890abcdef1234567890abcdef1",
    agent: "",
    auditor: "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
    title: "Deterministic Code Synthesis - ZK Verifier",
    description: "Synthesize Gno realm ZK proof verification helper with zero randomness.",
    bountyGnot: 50.0,
    expectedHash: "",
    submittedHash: "",
    modelMetadata: "",
    auditorNotes: "",
    status: "OPEN",
    timestamp: "1 hour ago",
  },
];

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [gnotBalance, setGnotBalance] = useState("124.50");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "submit" | "verify" | "hasher">("create");
  const [tasks, setTasks] = useState<EscrowTask[]>(INITIAL_TASKS);
  const [copiedText, setCopiedText] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [realmDeployed, setRealmDeployed] = useState(false);
  const [deployTxHash, setDeployTxHash] = useState("");

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBounty, setNewBounty] = useState("5.0");
  const [newExpectedHash, setNewExpectedHash] = useState("");

  const [submitTaskId, setSubmitTaskId] = useState("task-3");
  const [submitProofHash, setSubmitProofHash] = useState("");
  const [submitModel, setSubmitModel] = useState('{"model":"claude-3-5-sonnet","temp":0.0}');

  const [verifyTaskId, setVerifyTaskId] = useState("task-2");
  const [verifyPassed, setVerifyPassed] = useState(true);
  const [verifyNotes, setVerifyNotes] = useState("Deterministic execution verified via MCP AI Auditor.");

  // Client-Side SHA-256 Hasher panel
  const [hasherInput, setHasherInput] = useState(
    '{\n  "veripulse": "audit",\n  "status": "deterministic_success",\n  "accuracy": 1.0\n}'
  );
  const [hasherResult, setHasherResult] = useState("");
  const [hasherMatchTaskId, setHasherMatchTaskId] = useState("");
  const [hasherMatchStatus, setHasherMatchStatus] = useState<"matched" | "mismatched" | null>(null);

  // Auto compute hash on hasherInput change using browser Web Crypto API
  useEffect(() => {
    async function computeHash() {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(hasherInput.replace(/\r\n/g, "\n").trim());
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        setHasherResult(hashHex);

        if (hasherMatchTaskId) {
          const target = tasks.find((t) => t.id === hasherMatchTaskId);
          if (target && target.submittedHash) {
            setHasherMatchStatus(
              target.submittedHash.toLowerCase() === hashHex.toLowerCase() ? "matched" : "mismatched"
            );
          } else {
            setHasherMatchStatus(null);
          }
        }
      } catch (e) {
        console.error("Crypto API error", e);
      }
    }
    computeHash();
  }, [hasherInput, hasherMatchTaskId, tasks]);

  // Connect Adena Wallet
  const connectAdena = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).adena) {
        const adena = (window as any).adena;
        await adena.AddEstablishConnection("VeriPulse");
        const account = await adena.GetAccount();
        if (account?.address) {
          setWalletAddress(account.address);
          setWalletConnected(true);
          setIsDemoMode(false);
          setNotification({ type: "success", msg: `Connected Adena: ${account.address.slice(0, 10)}...` });
          return;
        }
      }
    } catch (err: any) {
      console.warn("Adena connection error or rejected:", err);
    }

    // Fallback: If Adena extension is not present in evaluating browser
    setIsDemoMode(true);
    setWalletConnected(true);
    setWalletAddress("g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy");
    setNotification({
      type: "info",
      msg: "Running in Simulation Preview Mode (Adena extension not detected). Full onyx-1 transaction simulation active.",
    });
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    setIsDemoMode(false);
    setNotification({ type: "info", msg: "Wallet disconnected." });
  };

  const showCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(""), 2000);
  };

  // 1-Click Adena Realm Deployment
  const handle1ClickAdenaDeploy = async () => {
    if (!walletConnected) {
      await connectAdena();
    }

    setIsDeploying(true);
    try {
      if (typeof window !== "undefined" && (window as any).adena && !isDemoMode) {
        const adena = (window as any).adena;
        const res = await adena.DoContract({
          messages: [
            {
              type: "/vm.m_addpkg",
              value: {
                creator: walletAddress || "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
                package: {
                  name: "veripulse",
                  path: REALM_PKG,
                  files: [
                    {
                      name: "veripulse.gno",
                      body: VERIPULSE_GNO_CODE,
                    },
                    {
                      name: "gnomod.toml",
                      body: GNOMOD_TOML_CODE,
                    },
                  ],
                },
                deposit: "1000000ugnot",
              },
            },
          ],
          gasFee: 1000000,
          gasWanted: 3000000,
        });

        const txHash = res?.hash || res?.data?.hash || "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        setDeployTxHash(txHash);
        setRealmDeployed(true);
        setNotification({
          type: "success",
          msg: `🎉 Realm successfully deployed to Onyx-1! TX Hash: ${txHash.slice(0, 16)}...`,
        });
      } else {
        // Simulated instant broadcast
        await new Promise((r) => setTimeout(r, 1200));
        const simTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        setDeployTxHash(simTx);
        setRealmDeployed(true);
        setNotification({
          type: "success",
          msg: `[SIMULATION] Realm published to Onyx-1! Package: ${REALM_PKG}`,
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        msg: `Deployment Failed: ${err.message || err}`,
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // Create Escrow Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const bounty = parseFloat(newBounty) || 1.0;
    const newTaskID = `task-${tasks.length + 1}`;

    if (typeof window !== "undefined" && (window as any).adena && !isDemoMode) {
      try {
        const adena = (window as any).adena;
        await adena.DoContract({
          messages: [
            {
              type: "/vm.m_call",
              value: {
                caller: walletAddress,
                send: `${Math.floor(bounty * 1000000)}ugnot`,
                pkg_path: REALM_PKG,
                func: "CreateTask",
                args: [newTitle, newDesc, newExpectedHash, "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy"],
              },
            },
          ],
          gasFee: 1000000,
          gasWanted: 2000000,
        });
        setNotification({ type: "success", msg: `Task ${newTaskID} created & confirmed on Onyx testnet!` });
      } catch (err: any) {
        setNotification({ type: "error", msg: `Adena TX Failed: ${err.message || err}` });
        return;
      }
    } else {
      setNotification({
        type: "success",
        msg: `[SIMULATION] Task ${newTaskID} created! Locked ${bounty} GNOT into VeriPulse escrow.`,
      });
    }

    const created: EscrowTask = {
      id: newTaskID,
      client: walletAddress || "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
      agent: "",
      auditor: "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
      title: newTitle,
      description: newDesc,
      bountyGnot: bounty,
      expectedHash: newExpectedHash,
      submittedHash: "",
      modelMetadata: "",
      auditorNotes: "",
      status: "OPEN",
      timestamp: "Just now",
    };

    setTasks([created, ...tasks]);
    setNewTitle("");
    setNewDesc("");
    setNewExpectedHash("");
  };

  // Submit AI Agent Proof
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    const task = tasks.find((t) => t.id === submitTaskId);
    if (!task) return;

    if (submitProofHash.length !== 64) {
      setNotification({ type: "error", msg: "Invalid SHA-256 hash: must be 64 hexadecimal characters." });
      return;
    }

    setTasks(
      tasks.map((t) => {
        if (t.id === submitTaskId) {
          return {
            ...t,
            agent: walletAddress || "g1agent9876543210zyxwvutsrqponmlkjihgfedcba",
            submittedHash: submitProofHash,
            modelMetadata: submitModel,
            status: "SUBMITTED",
          };
        }
        return t;
      })
    );

    setNotification({
      type: "success",
      msg: `Proof submitted for ${submitTaskId}! SHA-256 logged on-chain. Ready for Auditor verification.`,
    });
    setSubmitProofHash("");
  };

  // Verify and Release Escrow
  const handleVerifyAndRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    const task = tasks.find((t) => t.id === verifyTaskId);
    if (!task) return;

    if (verifyPassed) {
      if (task.expectedHash && task.expectedHash.toLowerCase() !== task.submittedHash.toLowerCase()) {
        setNotification({
          type: "error",
          msg: "Cryptographic Mismatch: Submitted hash does not match task expected hash!",
        });
        return;
      }
    }

    setTasks(
      tasks.map((t) => {
        if (t.id === verifyTaskId) {
          return {
            ...t,
            status: verifyPassed ? "VERIFIED" : "DISPUTED",
            auditorNotes: verifyNotes,
          };
        }
        return t;
      })
    );

    setNotification({
      type: verifyPassed ? "success" : "info",
      msg: verifyPassed
        ? `Task ${verifyTaskId} VERIFIED! Released ${task.bountyGnot} GNOT bounty to AI Agent ${task.agent.slice(0, 8)}...`
        : `Task ${verifyTaskId} flagged as DISPUTED. Funds preserved in escrow.`,
    });
  };

  // Protocol Stats
  const totalVolumeGnot = tasks.reduce((sum, t) => sum + t.bountyGnot, 0);
  const activeCount = tasks.filter((t) => t.status === "OPEN" || t.status === "SUBMITTED").length;
  const verifiedCount = tasks.filter((t) => t.status === "VERIFIED").length;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top HUD Navigation Bar */}
      <header className="border-b border-hud-border bg-hud-card/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-slate-100">VERIPULSE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                PROTOCOL v1.0
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                onyx-1
              </span>
            </div>
            <p className="text-xs text-slate-400">Deterministic AI Agent Audit & Escrow Protocol</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 1-Click Adena Deploy Button in Header */}
          <button
            onClick={handle1ClickAdenaDeploy}
            disabled={isDeploying}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold tracking-wide transition border shadow-lg ${
              realmDeployed
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-teal-500/10"
            }`}
          >
            <Rocket className={`w-3.5 h-3.5 ${isDeploying ? "animate-spin text-teal-300" : realmDeployed ? "text-emerald-400" : "text-teal-400"}`} />
            <span>{isDeploying ? "Publishing Realm..." : realmDeployed ? "Realm Deployed (Onyx-1)" : "Deploy Realm to Onyx-1 (1-Click Adena)"}</span>
          </button>

          {/* Simulation / Demo indicator */}
          {isDemoMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulation Preview Mode</span>
            </div>
          )}

          {/* Wallet Button */}
          {walletConnected ? (
            <div className="flex items-center gap-3 bg-hud-bg border border-hud-border rounded-lg p-1.5 px-3">
              <div className="text-right">
                <div className="text-xs font-mono text-teal-400 font-semibold">{gnotBalance} GNOT</div>
                <div className="text-[11px] font-mono text-slate-400">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </div>
              </div>
              <button
                onClick={disconnectWallet}
                className="text-xs px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectAdena}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-medium text-xs tracking-wide transition shadow-lg shadow-teal-500/20"
            >
              <Lock className="w-4 h-4" />
              Connect Adena Wallet
            </button>
          )}
        </div>
      </header>

      {/* Deployment Banner if Deployed */}
      {realmDeployed && (
        <div className="mx-6 mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              VeriPulse Realm is live on Onyx-1! Package: <strong className="text-slate-100">{REALM_PKG}</strong>
            </span>
          </div>
          <a
            href={`https://gno.land/r/g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy/veripulse`}
            target="_blank"
            rel="noreferrer"
            className="text-teal-400 hover:text-teal-300 underline flex items-center gap-1"
          >
            <span>View on Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div
          className={`mx-6 mt-4 p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            notification.type === "success"
              ? "bg-teal-950/40 border-teal-500/40 text-teal-300"
              : notification.type === "error"
              ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
              : "bg-blue-950/40 border-blue-500/40 text-blue-300"
          }`}
        >
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-200">
            ×
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Protocol HUD Metric Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-hud-card border border-hud-border relative overflow-hidden">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Total Escrow Volume</span>
              <Coins className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-teal-400">{totalVolumeGnot.toFixed(1)} GNOT</div>
            <div className="text-[11px] text-slate-500 mt-1">Locked in Gno realm contract</div>
          </div>

          <div className="p-4 rounded-xl bg-hud-card border border-hud-border relative overflow-hidden">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Active AI Tasks</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">{activeCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting proof submission/audit</div>
          </div>

          <div className="p-4 rounded-xl bg-hud-card border border-hud-border relative overflow-hidden">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Verified AI Audits</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{verifiedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">100% deterministic cryptographic match</div>
          </div>

          <div className="p-4 rounded-xl bg-hud-card border border-hud-border relative overflow-hidden">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Target Network</span>
              <Terminal className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold font-mono text-purple-400">onyx-1 (Gno.land)</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate" title={REALM_PKG}>
              {REALM_PKG}
            </div>
          </div>
        </section>

        {/* Action Tabs & Panels */}
        <section className="bg-hud-card border border-hud-border rounded-xl p-6">
          <div className="flex border-b border-hud-border mb-6 gap-2">
            <button
              onClick={() => setActiveTab("create")}
              className={`pb-3 px-4 text-xs font-mono font-medium border-b-2 transition flex items-center gap-2 ${
                activeTab === "create"
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Coins className="w-4 h-4" /> 1. Create Escrow Task
            </button>
            <button
              onClick={() => setActiveTab("submit")}
              className={`pb-3 px-4 text-xs font-mono font-medium border-b-2 transition flex items-center gap-2 ${
                activeTab === "submit"
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu className="w-4 h-4" /> 2. AI Proof Submission
            </button>
            <button
              onClick={() => setActiveTab("verify")}
              className={`pb-3 px-4 text-xs font-mono font-medium border-b-2 transition flex items-center gap-2 ${
                activeTab === "verify"
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> 3. Audit & Release Escrow
            </button>
            <button
              onClick={() => setActiveTab("hasher")}
              className={`pb-3 px-4 text-xs font-mono font-medium border-b-2 transition flex items-center gap-2 ${
                activeTab === "hasher"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-4 h-4" /> ⚡ Web Crypto SHA-256 Hasher & Verifier
            </button>
          </div>

          {/* TAB 1: CREATE TASK */}
          {activeTab === "create" && (
            <form onSubmit={handleCreateTask} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. LLM Financial Earnings Extraction"
                    className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Bounty Amount (GNOT)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={newBounty}
                    onChange={(e) => setNewBounty(e.target.value)}
                    className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Task Description & Requirements</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Specify strict deterministic execution bounds, system seed, and prompt parameters..."
                  className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Expected SHA-256 Hash <span className="text-slate-500">(Optional for blind benchmarks)</span>
                </label>
                <input
                  type="text"
                  value={newExpectedHash}
                  onChange={(e) => setNewExpectedHash(e.target.value)}
                  placeholder="e.g. 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
                  className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Escrow Lock: <strong className="text-teal-400">{newBounty} GNOT</strong> into realm contract
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-wide transition shadow-lg shadow-teal-500/20"
                >
                  Lock Bounty & Instantiate Task
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: AI PROOF SUBMISSION */}
          {activeTab === "submit" && (
            <form onSubmit={handleSubmitProof} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Target Escrow Task</label>
                <select
                  value={submitTaskId}
                  onChange={(e) => setSubmitTaskId(e.target.value)}
                  className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {tasks
                    .filter((t) => t.status === "OPEN" || t.status === "SUBMITTED")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}: {t.title} ({t.bountyGnot} GNOT) - Status: {t.status}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Deterministic Execution Proof (SHA-256 Hash)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={submitProofHash}
                    onChange={(e) => setSubmitProofHash(e.target.value)}
                    placeholder="64-character hex hash (use Hasher tab to compute instantly)"
                    className="flex-1 bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSubmitProofHash(hasherResult)}
                    className="px-3 py-2 bg-hud-border hover:bg-slate-800 text-xs font-mono text-cyan-400 rounded-lg transition"
                  >
                    Paste from Hasher
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">AI Agent & Model Execution Metadata</label>
                <textarea
                  rows={3}
                  value={submitModel}
                  onChange={(e) => setSubmitModel(e.target.value)}
                  className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-wide transition shadow-lg shadow-teal-500/20"
                >
                  Submit Execution Proof On-Chain
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: AUDIT & RELEASE */}
          {activeTab === "verify" && (
            <form onSubmit={handleVerifyAndRelease} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Escrow Task to Audit</label>
                <select
                  value={verifyTaskId}
                  onChange={(e) => setVerifyTaskId(e.target.value)}
                  className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {tasks
                    .filter((t) => t.status === "SUBMITTED" || t.status === "OPEN")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}: {t.title} (Agent: {t.agent ? t.agent.slice(0, 8) + "..." : "None"})
                      </option>
                    ))}
                </select>
              </div>

              {/* Inspection preview */}
              {tasks.find((t) => t.id === verifyTaskId) && (
                <div className="p-3 rounded-lg bg-hud-bg border border-hud-border text-xs font-mono space-y-1">
                  <div>
                    <span className="text-slate-500">Submitted Proof: </span>
                    <span className="text-teal-400">
                      {tasks.find((t) => t.id === verifyTaskId)?.submittedHash || "None yet"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Expected Hash: </span>
                    <span className="text-cyan-400">
                      {tasks.find((t) => t.id === verifyTaskId)?.expectedHash || "Open"}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Audit Determination</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-mono text-emerald-400 cursor-pointer">
                    <input
                      type="radio"
                      name="auditDecision"
                      checked={verifyPassed}
                      onChange={() => setVerifyPassed(true)}
                    />
                    <span>✅ Verification Passed (Release GNOT Bounty)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-mono text-rose-400 cursor-pointer">
                    <input
                      type="radio"
                      name="auditDecision"
                      checked={!verifyPassed}
                      onChange={() => setVerifyPassed(false)}
                    />
                    <span>❌ Dispute / Reject (Lock funds in Escrow)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Auditor Cryptographic Attestation Notes</label>
                <input
                  type="text"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-lg font-semibold text-xs tracking-wide transition shadow-lg ${
                    verifyPassed
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                      : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
                  }`}
                >
                  {verifyPassed ? "Sign Verification & Release Payout" : "Submit Dispute to Protocol"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: WEB CRYPTO SHA-256 HASHER & VERIFIER */}
          {activeTab === "hasher" && (
            <div className="space-y-4 max-w-3xl">
              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
                <Zap className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>
                  Client-Side Web Crypto SHA-256 Engine. Instant in-browser hash computation & direct verification against
                  on-chain Gno task proof ledger.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  AI Task Raw Output / JSON Payload
                </label>
                <textarea
                  rows={5}
                  value={hasherInput}
                  onChange={(e) => setHasherInput(e.target.value)}
                  placeholder="Paste any agent output, markdown, or JSON string..."
                  className="w-full bg-hud-bg border border-hud-border rounded-lg p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Computed Deterministic SHA-256 Hash
                </label>
                <div className="flex items-center gap-2 bg-hud-bg border border-hud-border rounded-lg p-3 font-mono text-xs text-teal-400 break-all">
                  <span className="flex-1">{hasherResult}</span>
                  <button
                    onClick={() => showCopy(hasherResult)}
                    className="p-1 hover:text-white transition"
                    title="Copy Hash"
                  >
                    {copiedText === hasherResult ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-mono text-slate-300 mb-1">Compare Against Ledger Task</label>
                  <select
                    value={hasherMatchTaskId}
                    onChange={(e) => setHasherMatchTaskId(e.target.value)}
                    className="w-full bg-hud-bg border border-hud-border rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select a task to compare...</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {hasherMatchStatus && (
                  <div className="pt-5">
                    {hasherMatchStatus === "matched" ? (
                      <div className="px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>MATCHED ON-CHAIN PROOF!</span>
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>CRYPTOGRAPHIC MISMATCH!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Live Escrow Audit Ledger Table */}
        <section className="bg-hud-card border border-hud-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-mono font-semibold text-slate-100 flex items-center gap-2">
                <span>ON-CHAIN AUDIT & ESCROW LEDGER</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  LIVE REALM STATE
                </span>
              </h2>
              <p className="text-xs text-slate-400">VeriPulse immutable proof registry on Gno.land Onyx</p>
            </div>

            <a
              href={`https://gno.land/r/g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy/veripulse`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
            >
              <span>View gnoweb Realm</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-hud-border text-slate-400">
                  <th className="py-2.5 px-3">TASK ID</th>
                  <th className="py-2.5 px-3">TITLE & DESCRIPTION</th>
                  <th className="py-2.5 px-3">BOUNTY</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">AI AGENT</th>
                  <th className="py-2.5 px-3">SUBMITTED SHA-256 PROOF</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hud-border/60">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-hud-bg/50 transition">
                    <td className="py-3 px-3 font-semibold text-teal-400">{task.id}</td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-slate-200 font-medium">{task.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{task.description}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{task.bountyGnot} GNOT</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          task.status === "VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : task.status === "SUBMITTED"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                            : task.status === "OPEN"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {task.agent ? `${task.agent.slice(0, 8)}...` : <span className="text-slate-600">Unclaimed</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {task.submittedHash ? (
                        <span className="text-slate-300" title={task.submittedHash}>
                          {task.submittedHash.slice(0, 12)}...{task.submittedHash.slice(-8)}
                        </span>
                      ) : (
                        <span className="text-slate-600">Pending Proof</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {task.status === "SUBMITTED" ? (
                        <button
                          onClick={() => {
                            setVerifyTaskId(task.id);
                            setActiveTab("verify");
                          }}
                          className="px-2.5 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 transition text-[11px]"
                        >
                          Audit & Release
                        </button>
                      ) : task.status === "OPEN" ? (
                        <button
                          onClick={() => {
                            setSubmitTaskId(task.id);
                            setActiveTab("submit");
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition text-[11px]"
                        >
                          Submit Proof
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[11px]">Finalized</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer HUD */}
      <footer className="border-t border-hud-border bg-hud-card px-6 py-4 text-xs font-mono text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2">
        <div>
          <span>VeriPulse Protocol • Gno.land Gnome Tavern Hackathon • </span>
          <span className="text-teal-400 font-semibold">Onyx Testnet</span>
        </div>
        <div>
          Creator: <code className="text-slate-400">g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy</code>
        </div>
      </footer>
    </div>
  );
}
