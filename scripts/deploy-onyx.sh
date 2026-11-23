#!/usr/bin/env bash
set -e

KEY_NAME="veripulse-deployer"
REMOTE_RPC="https://rpc.onyx.testnets.gno.land"
CHAIN_ID="onyx-1"
CREATOR_ADDR="g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy"
PKG_PATH="gno.land/r/g1j32d7wan33mn2jc0xzvdthxhejhj024gdzjxmy/veripulse"
PKG_DIR="realm/veripulse"
GAS_FEE="1000000ugnot"
GAS_WANTED=3000000

echo "=========================================================="
echo "       ⚡ VeriPulse Onyx-1 Testnet Deployment Helper       "
echo "=========================================================="

echo "[1/4] Probing Gno.land Onyx RPC endpoint ($REMOTE_RPC)..."
if curl -s -m 5 "$REMOTE_RPC/status" | grep -q "onyx-1"; then
  echo "Connected to onyx-1 testnet successfully."
else
  echo "RPC endpoint reached or waiting."
fi

echo "[2/4] Checking gnokey..."
if ! command -v gnokey &> /dev/null; then
    echo "gnokey could not be found. Please install via: go install github.com/gnolang/gno/cmd/gnokey@latest"
    exit 1
fi

echo "[3/4] Ready to deploy realm package: $PKG_PATH"
echo "Command:"
echo "gnokey maketx addpkg --pkgpath \"$PKG_PATH\" --pkgdir \"$PKG_DIR\" --deposit 1000000ugnot --gas-fee \"$GAS_FEE\" --gas-wanted $GAS_WANTED --broadcast --chainid \"$CHAIN_ID\" --remote \"$REMOTE_RPC\" $KEY_NAME"

gnokey maketx addpkg \
  --pkgpath "$PKG_PATH" \
  --pkgdir "$PKG_DIR" \
  --deposit 1000000ugnot \
  --gas-fee "$GAS_FEE" \
  --gas-wanted $GAS_WANTED \
  --broadcast \
  --chainid "$CHAIN_ID" \
  --remote "$REMOTE_RPC" \
  "$KEY_NAME"

echo "Deployment complete! Verify at: https://gno.land/r/$CREATOR_ADDR/veripulse"
