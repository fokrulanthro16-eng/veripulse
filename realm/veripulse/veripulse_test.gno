package veripulse

import (
	"std"
	"strings"
	"testing"
)

func TestVeriPulseWorkflow(t *testing.T) {
	client := std.Address("g1client000000000000000000000000000000001")
	agent := std.Address("g1agent000000000000000000000000000000002")
	auditor := std.Address("g1audit000000000000000000000000000000003")

	proofHash := "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"

	// 1. Simulate Task Creation by Client
	std.TestSetOrigCaller(client)
	std.TestSetOrigSend(std.NewCoins(std.NewCoin("ugnot", 10000000)), nil)

	taskID := CreateTask("LLM Summarization Audit", "Summarize Q3 financial report deterministically", proofHash, string(auditor))
	if taskID != "task-1" {
		t.Fatalf("expected task-1, got %s", taskID)
	}

	task := findTask(taskID)
	if task == nil {
		t.Fatalf("task not found")
	}
	if task.Status != StatusOpen {
		t.Fatalf("expected OPEN status, got %s", task.Status)
	}
	if task.BountyUgnot != 10000000 {
		t.Fatalf("expected 10000000 bounty, got %d", task.BountyUgnot)
	}

	// 2. Simulate AI Agent Proof Submission
	std.TestSetOrigCaller(agent)
	std.TestSetOrigSend(nil, nil)

	SubmitProof(taskID, proofHash, "{\"model\":\"claude-3-5-sonnet\",\"temp\":0.0}")
	if task.Status != StatusSubmitted {
		t.Fatalf("expected SUBMITTED status, got %s", task.Status)
	}
	if task.SubmittedHash != proofHash {
		t.Fatalf("submitted hash does not match")
	}

	// 3. Unauthorized verification check (must fail if random caller verifies)
	unauthorizedUser := std.Address("g1evil000000000000000000000000000000009")
	std.TestSetOrigCaller(unauthorizedUser)
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("expected unauthorized caller to panic, but succeeded")
		}
	}()

	// 4. Verify & Release by Auditor
	std.TestSetOrigCaller(auditor)
	VerifyAndRelease(taskID, true, "SHA-256 deterministic hash validated against benchmark")
	if task.Status != StatusVerified {
		t.Fatalf("expected VERIFIED status, got %s", task.Status)
	}

	// 5. Check Render Output
	renderOutput := Render("")
	if !strings.Contains(renderOutput, "VeriPulse: Deterministic AI Agent Audit") {
		t.Fatalf("Render() output missing title banner")
	}
	if !strings.Contains(renderOutput, taskID) {
		t.Fatalf("Render() output missing task ID %s", taskID)
	}

	detailOutput := Render("task/" + taskID)
	if !strings.Contains(detailOutput, "Task Audit Inspection: "+taskID) {
		t.Fatalf("Render(task/...) output missing inspection title")
	}
}

func TestInvalidHashRejection(t *testing.T) {
	client := std.Address("g1client000000000000000000000000000000001")
	agent := std.Address("g1agent000000000000000000000000000000002")

	std.TestSetOrigCaller(client)
	std.TestSetOrigSend(std.NewCoins(std.NewCoin("ugnot", 5000000)), nil)
	taskID := CreateTask("Faulty Agent Task", "Test invalid length hash", "", "")

	std.TestSetOrigCaller(agent)
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("expected short hash to panic, but succeeded")
		}
	}()
	SubmitProof(taskID, "invalid_short_hash", "{\"model\":\"test\"}")
}

func TestRefundTask(t *testing.T) {
	client := std.Address("g1client000000000000000000000000000000001")

	std.TestSetOrigCaller(client)
	std.TestSetOrigSend(std.NewCoins(std.NewCoin("ugnot", 2000000)), nil)
	taskID := CreateTask("Refundable Task", "No agent accepted this task", "", "")

	task := findTask(taskID)
	if task.Status != StatusOpen {
		t.Fatalf("expected OPEN status")
	}

	RefundTask(taskID)
	if task.Status != StatusRefunded {
		t.Fatalf("expected REFUNDED status, got %s", task.Status)
	}
}
