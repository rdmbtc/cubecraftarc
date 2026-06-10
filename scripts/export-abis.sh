#!/bin/bash
# Export ABIs from compiled Foundry artifacts to src/blockchain/abi/
# Run after: forge build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ABI_DIR="$PROJECT_ROOT/src/blockchain/abi"
OUT_DIR="$PROJECT_ROOT/out"

mkdir -p "$ABI_DIR"

echo "Exporting ABIs..."

for contract in LandNFT LandRental GameEconomy; do
    if [ -f "$OUT_DIR/${contract}.sol/${contract}.json" ]; then
        # Extract just the ABI array from the full compilation artifact
        jq '.abi' "$OUT_DIR/${contract}.sol/${contract}.json" > "$ABI_DIR/${contract}.json"
        echo "  ✓ ${contract}.json"
    else
        echo "  ✗ ${contract}.json (not found - did you run forge build?)"
    fi
done

echo "ABIs exported to $ABI_DIR"
