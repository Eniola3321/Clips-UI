"use client";

/**
 * WalletButton
 *
 * Handles three wallet states:
 *  - Not connected  → "Connect Wallet", opens the kit modal
 *  - Connecting     → spinner
 *  - Connected      → truncated address, opens profile modal
 *
 * Pass `onConnect(address)` to be notified right after a successful
 * connection (used by AuthForm to drive post-connect navigation).
 */

import React from "react";
import { Loader2, Wallet } from "lucide-react";
import { useWallet } from "@/components/WalletProvider";

interface WalletButtonProps {
  className?: string;
  compact?: boolean;
  /** Called with the public key immediately after a successful wallet connect */
  onConnect?: (address: string) => void;
}

function truncate(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function WalletButton({
  className,
  compact = false,
  onConnect,
}: WalletButtonProps) {
  const { address, isConnecting, connect, openProfile } = useWallet();

  const handleConnect = async () => {
    await connect();
    // After connect() resolves, read the address from the kit
    // (WalletProvider has already set it in state, but we need it synchronously here)
    if (onConnect) {
      // connect() updates the WalletProvider state asynchronously via setState,
      // so we pull the address directly from the kit to avoid a stale-closure issue.
      try {
        const { getWalletAddress } = await import("@/lib/wallet");
        const addr = await getWalletAddress();
        onConnect(addr);
      } catch {
        // User may have closed the modal — onConnect is not called
      }
    }
  };

  if (address) {
    return (
      <button
        type="button"
        onClick={openProfile}
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
      disabled={isConnecting}
      className={
        className ??
        "flex items-center justify-center gap-2 px-6 py-3.5 rounded-[14px] bg-[#1A221E]/60 border border-[#2A3B34] text-white hover:border-brand/50 hover:bg-[#1A221E] transition-all font-bold text-sm disabled:opacity-60"
      }
    >
      {isConnecting ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Wallet className="w-5 h-5 text-brand" />
      )}
      {!compact && (isConnecting ? "Connecting…" : "Connect Wallet")}
    </button>
  );
}
