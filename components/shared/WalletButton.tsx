"use client";

/**
 * WalletButton
 *
 * Three states:
 *  - Not connected  → "Connect Wallet", opens the kit modal then runs the
 *                     correct challenge flow to link wallet to the account
 *  - Connecting     → spinner
 *  - Connected      → truncated address, click to open profile/disconnect
 *
 * For logged-in (email/Google) users the correct flow is:
 *   1. Open Freighter modal → get address
 *   2. GET /auth/stellar/connect/challenge?stellarAddress=G…  (purpose: connect)
 *   3. Sign the challenge string in Freighter
 *   4. POST /auth/stellar/connect  { stellarAddress, nonce/message, signature }
 *   5. Refresh /users/me so the UI reflects the linked address
 *
 * For visitors on the login page, pass onConnect(address) to handle post-connect
 * navigation (the AuthForm drives that path separately).
 */

import React, { useState } from "react";
import { Loader2, Wallet, CheckCircle, AlertCircle } from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { connectStellarWallet, getConnectWalletChallenge, disconnectStellarWallet } from "@/lib/queries";
import { signAuthMessage, ensureHexSignature, getWalletAddress } from "@/lib/wallet";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/shared/ToastProvider";

interface WalletButtonProps {
  className?: string;
  compact?: boolean;
  /** Called with the public key immediately after a successful wallet connect (login page use) */
  onConnect?: (address: string) => void;
}

function truncate(addr: string): string {
  if (addr.startsWith("G") && addr.length === 56) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton({ className, compact = false, onConnect }: WalletButtonProps) {
  const { address, isConnecting, connect, openProfile, disconnect } = useWallet();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [linking, setLinking] = useState(false);

  const handleConnect = async () => {
    // Step 1 — open Freighter/wallet modal
    await connect();

    // Step 2 — read the address that was just connected
    let addr: string;
    try {
      addr = await getWalletAddress();
    } catch {
      // User closed the modal without connecting
      return;
    }

    // If there's a logged-in email/Google user, link the wallet to their account
    if (user) {
      setLinking(true);
      try {
        // Get the connect challenge (purpose: connect)
        const { challenge } = await getConnectWalletChallenge(addr);

        // Extract the nonce UUID embedded in the challenge string.
        // Format: "ClipsCash auth nonce: <uuid>\npublicKey: G...\npurpose: connect\n..."
        const nonceMatch = challenge.match(/nonce:\s*([^\n\r]+)/i);
        const nonce = nonceMatch?.[1]?.trim() ?? "";

        if (!nonce) {
          throw new Error("Could not extract nonce from challenge.");
        }

        // signAuthMessage wraps in Stellar message envelope — same as the
        // working login flow. Pass the raw kit output directly without
        // hex-conversion so it matches what the backend verifies.
        const rawSig = await signAuthMessage(challenge);

        // Try the hex-converted form first (what StellarConnectDto expects).
        // If that still gets 401, the backend must be fixed to accept the
        // same signMessage format as /auths/wallet/signin.
        const signature = ensureHexSignature(rawSig);

        // Log everything so we can diagnose if it still fails
        console.log("[connect] nonce:", nonce);
        console.log("[connect] raw sig:", rawSig);
        console.log("[connect] hex sig:", signature, "len:", signature.length);
        console.log("[connect] payload:", { stellarAddress: addr, nonce, signature: signature.slice(0, 20) + "..." });

        await connectStellarWallet(addr, signature, nonce);

        // Step 6 — refresh user so stellarAddress is reflected everywhere
        const apiClient = (await import("@/lib/apiClient")).default;
        const { data: updatedUser } = await apiClient.get("/users/me");
        setUser(updatedUser);

        toast("Wallet linked to your account!", "success");
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to link wallet. Please try again.";
        toast(msg, "error");
        // Disconnect from kit so state isn't out of sync
        await disconnect();
      } finally {
        setLinking(false);
      }
    }

    // Notify parent (e.g. AuthForm on login page)
    onConnect?.(addr);
  };

  const handleDisconnect = async () => {
    try {
      try {
        await disconnectStellarWallet();
      } catch {
        // Backend disconnect may fail if already unlinked; proceed anyway
      }

      await openProfile(); // opens kit modal with disconnect option

      // Refresh user to clear stellarAddress
      const apiClient = (await import("@/lib/apiClient")).default;
      const { data: updatedUser } = await apiClient.get("/users/me");
      setUser(updatedUser);
    } catch (err) {
      console.error("Failed to disconnect wallet:", err);
    }
  };

  const busy = isConnecting || linking;

  if (address) {
    return (
      <button
        type="button"
        onClick={handleDisconnect}
        title={address}
        className={
          className ??
          "flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] bg-brand/10 border border-brand/30 text-brand hover:bg-brand/20 transition-all font-bold text-sm"
        }
      >
        <Wallet className="w-4 h-4 shrink-0" />
        {!compact && <span className="tabular-nums">{truncate(address)}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={busy}
      className={
        className ??
        "flex items-center justify-center gap-2 px-5 py-3 rounded-[14px] bg-[#1A221E]/60 border border-[#2A3B34] text-white hover:border-brand/50 hover:bg-[#1A221E] transition-all font-bold text-sm disabled:opacity-60"
      }
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Wallet className="w-4 h-4 text-brand" />
      )}
      {!compact && (busy ? "Linking wallet…" : "Connect Wallet")}
    </button>
  );
}
