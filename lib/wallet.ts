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
 * Normalises the signature from the wallet kit to a raw 128-character hex signature
 * that the backend expects, stripping any "ed25519:" prefix or converting from base64.
 */
export function ensureHexSignature(signature: string): string {
  // If it has "ed25519:" prefix, strip it first
  if (signature.startsWith("ed25519:")) {
    signature = signature.slice(8);
  }

  // If the signature is already a 128-character hex string, return it
  if (signature.length === 128 && /^[0-9a-fA-F]+$/.test(signature)) {
    return signature.toLowerCase();
  }

  // Otherwise, assume it is Base64 and convert to Hex
  try {
    const binaryString = atob(signature);
    let hex = "";
    for (let i = 0; i < binaryString.length; i++) {
      const hexChar = binaryString.charCodeAt(i).toString(16).padStart(2, "0");
      hex += hexChar;
    }
    if (hex.length === 128) {
      return hex;
    }
  } catch (e) {
    // ignore
  }

  return signature;
}

export { StellarWalletsKit, Networks };
