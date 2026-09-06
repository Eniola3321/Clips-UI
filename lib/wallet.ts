"use client";

/**
 * Stellar Wallet integration using @creit-tech/stellar-wallets-kit v2
 *
 * This module initialises StellarWalletsKit once (singleton) and exposes
 * helper functions used by the WalletProvider context.
 *
 * The kit handles Freighter, xBull, Lobstr, Albedo, Rabet, Ledger etc.
 * through a unified API – no separate Freighter/Lobstr code needed.
 */

import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { FreighterModule } from "@creit-tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit-tech/stellar-wallets-kit/modules/lobstr";
import { AlbedoModule } from "@creit-tech/stellar-wallets-kit/modules/albedo";
import { RabetModule } from "@creit-tech/stellar-wallets-kit/modules/rabet";
import { Networks } from "@creit-tech/stellar-wallets-kit/types";

// Use TESTNET during development — switch to Networks.PUBLIC for production
export const STELLAR_NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

// Initialise the kit once on the client side
let kitInitialised = false;

export function initWalletKit(): void {
  if (kitInitialised || typeof window === "undefined") return;
  kitInitialised = true;

  StellarWalletsKit.init({
    modules: [
      new FreighterModule(),
      new LobstrModule(),
      new AlbedoModule(),
      new RabetModule(),
    ],
    network: STELLAR_NETWORK,
  });
}

/**
 * Opens the kit's built-in wallet picker modal.
 * Returns the connected Stellar public key (G…).
 */
export async function connectWalletModal(): Promise<string> {
  initWalletKit();
  const { address } = await StellarWalletsKit.authModal();
  return address;
}

/**
 * Returns the currently cached address (does NOT open a modal).
 * Throws if no wallet is connected.
 */
export async function getWalletAddress(): Promise<string> {
  const { address } = await StellarWalletsKit.getAddress();
  return address;
}

/**
 * Opens the kit's profile modal (shows address, disconnect button, etc.)
 */
export async function openProfileModal(): Promise<void> {
  await StellarWalletsKit.profileModal();
}

/**
 * Disconnects the current wallet and clears kit state.
 */
export async function disconnectWallet(): Promise<void> {
  await StellarWalletsKit.disconnect();
}

/**
 * Signs a message with the connected wallet.
 */
export async function signAuthMessage(message: string): Promise<string> {
  initWalletKit();
  // Get the current address to ensure the correct account is signing
  const { address } = await StellarWalletsKit.getAddress();
  const { signedMessage } = await StellarWalletsKit.signMessage(message, {
    address,
  });
  return signedMessage;
}

/**
 * Signs a Stellar transaction XDR with the connected wallet.
 * Used for tipping transactions.
 *
 * IMPORTANT: networkPassphrase must be passed so the wallet signs against
 * the correct network. Without it, wallets like Freighter may use their own
 * default, producing a signature that Stellar rejects with tx_bad_auth.
 */
export async function signTransaction(xdr: string): Promise<string> {
  initWalletKit();
  const { address } = await StellarWalletsKit.getAddress();

  // Map our Networks enum value to the actual Stellar network passphrase string
  // that the wallets kit and Freighter both understand.
  const networkPassphrase =
    STELLAR_NETWORK === Networks.PUBLIC
      ? "Public Global Stellar Network ; September 2015"  // Mainnet passphrase
      : "Test SDF Network ; September 2015";               // Testnet passphrase

  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    address,
    networkPassphrase,
  });
  return signedTxXdr;
}

/**
 * Normalises the signature from the wallet kit to a raw 128-character hex string.
 *
 * Freighter's signMessage returns a base64-encoded 64-byte Ed25519 signature.
 * The backend expects the same 64 bytes as lowercase hex (128 chars).
 *
 * Common failure modes this handles:
 *  - "ed25519:" prefix from some wallets
 *  - Base64 with or without padding ("=")
 *  - Already-hex strings passed through unchanged
 *  - Off-by-one from naive charCode loops (fixed by using Uint8Array)
 */
export function ensureHexSignature(signature: string): string {
  // Strip "ed25519:" prefix if present
  if (signature.startsWith("ed25519:")) {
    signature = signature.slice(8);
  }

  // Already a 128-char hex string — return as-is (lowercased)
  if (/^[0-9a-fA-F]{128}$/.test(signature)) {
    return signature.toLowerCase();
  }

  // Treat as Base64 → convert to hex via Uint8Array to avoid leading-zero drops
  try {
    // Normalise base64: replace URL-safe chars, restore padding
    const b64 = signature
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .replace(/\s/g, "");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    const binary = atob(padded);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Convert each byte to exactly 2 hex chars — no leading-zero drops
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Freighter's signMessage prepends a 2-byte prefix to the 64-byte Ed25519
    // signature, producing 66 bytes. Strip the first 2 bytes when present.
    const sigBytes = bytes.length === 66 ? bytes.slice(2) : bytes;
    const sigHex   = Array.from(sigBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (sigHex.length === 128) return sigHex;

    // Unexpected length — log and return raw so the error is visible
    console.warn("[ensureHexSignature] unexpected hex length:", sigHex.length, "(pre-strip hex was", hex.length, "chars)");
  } catch (e) {
    console.warn("[ensureHexSignature] base64 decode failed:", e);
  }

  // Last resort — return whatever we have
  return signature;
}

export { StellarWalletsKit, Networks };
