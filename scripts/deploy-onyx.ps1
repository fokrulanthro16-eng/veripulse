<#
.SYNOPSIS
    VeriPulse Onyx-1 Testnet Deployment Script (PowerShell)
.DESCRIPTION
    Deploys the VeriPulse deterministic audit & escrow realm to Gno.land Onyx Testnet
#>

param(
    [string]$KeyName = "veripulse-deployer",
    [string]$RemoteRpc = "https://rpc.onyx.testnets.gno.land",
    [string]$ChainId = "onyx-1",
    [string]$CreatorAddr = "g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy",
    [string]$PkgPath = "gno.land/r/g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy/veripulse",
    [string]$PkgDir = "realm/veripulse",
    [string]$GasFee = "1000000ugnot",
    [int64]$GasWanted = 3000000
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       ⚡ VeriPulse Onyx-1 Testnet Deployment Helper       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify RPC Connectivity
Write-Host "`n[1/4] Probing Gno.land Onyx RPC endpoint ($RemoteRpc)..." -ForegroundColor Yellow
try {
    $statusUrl = "$RemoteRpc/status"
    $response = Invoke-RestMethod -Uri $statusUrl -TimeoutSec 10 -Method Get
    $network = $response.result.node_info.network
    $latestBlock = $response.result.sync_info.latest_block_height
    Write-Host "Connected! Network: $network | Block Height: $latestBlock" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not connect to $RemoteRpc ($_.Exception.Message). Checking fallback..." -ForegroundColor Yellow
}

# 2. Check for gnokey
Write-Host "`n[2/4] Verifying gnokey binary availability..." -ForegroundColor Yellow
$gnokeyCmd = Get-Command gnokey -ErrorAction SilentlyContinue
if (-not $gnokeyCmd) {
    Write-Host "gnokey CLI is not detected in current PATH." -ForegroundColor Yellow
    Write-Host "If running on Windows without gnokey compiled, download the official release binary or run inside WSL/Linux:" -ForegroundColor White
    Write-Host "  go install github.com/gnolang/gno/cmd/gnokey@latest" -ForegroundColor Gray
    Write-Host "`nAlternatively, ensure gnokey is placed in your PATH or current directory." -ForegroundColor White
} else {
    Write-Host "Found gnokey: $($gnokeyCmd.Source)" -ForegroundColor Green
}

# 3. Key Recovery Instructions
Write-Host "`n[3/4] Preparing Wallet Key..." -ForegroundColor Yellow
Write-Host "If key '$KeyName' is not yet imported, run:" -ForegroundColor White
Write-Host "  gnokey add $KeyName --recover" -ForegroundColor Green
Write-Host "(Paste your 24-word seed phrase when prompted by gnokey)" -ForegroundColor Gray

# 4. Deployment Command Preview
Write-Host "`n[4/4] Executing Realm Deployment..." -ForegroundColor Yellow
$txFile = "veripulse-deploy.tx"

$makeTxCmd = "gnokey maketx addpkg `
  --pkgpath `"$PkgPath`" `
  --pkgdir `"$PkgDir`" `
  --deposit 1000000ugnot `
  --gas-fee `"$GasFee`" `
  --gas-wanted $GasWanted `
  --broadcast `
  --chainid `"$ChainId`" `
  --remote `"$RemoteRpc`" `
  $KeyName"

Write-Host "Deployment Command to Run:" -ForegroundColor Cyan
Write-Host $makeTxCmd -ForegroundColor White
Write-Host "`nTo execute directly with gnokey, paste the command above." -ForegroundColor Green
