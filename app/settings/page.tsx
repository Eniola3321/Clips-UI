"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/shared/DashboardLayout";
import { Settings, Lock, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const { logout } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await apiClient.patch("/users/me/password", {
        oldPassword,
        newPassword,
      });
      setMessage({ type: "success", text: "Password updated successfully" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to update password";
      setMessage({ type: "error", text: Array.isArray(errorMsg) ? errorMsg[0] : errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you absolutely sure? This will permanently delete your account and all your videos/clips. This action cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await apiClient.delete("/users/me");
      logout();
    } catch (err) {
      console.error("Failed to delete account:", err);
      alert("Failed to delete account. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-12">
        <div className="space-y-3">
          <h1 className="text-[44px] font-black tracking-tight text-white flex items-center gap-4">
            <Settings className="w-10 h-10 text-brand" />
            Settings
          </h1>
          <p className="text-[#5A6F65] text-lg font-medium">Manage your account preferences and security.</p>
        </div>

        {/* Password Section */}
        <section className="bg-[#0E1512] border border-white/5 rounded-[32px] overflow-hidden">
          <div className="p-8 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Security</h2>
                <p className="text-sm text-[#5A6F65]">Update your password to keep your account secure.</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#5A6F65] uppercase tracking-wider mb-2">Current Password</label>
                  <input 
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-[#080C0B] border border-white/5 focus:border-brand/40 rounded-2xl px-5 py-3.5 text-white outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#5A6F65] uppercase tracking-wider mb-2">New Password</label>
                  <input 
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#080C0B] border border-white/5 focus:border-brand/40 rounded-2xl px-5 py-3.5 text-white outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#5A6F65] uppercase tracking-wider mb-2">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#080C0B] border border-white/5 focus:border-brand/40 rounded-2xl px-5 py-3.5 text-white outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {message.text && (
                <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${
                  message.type === 'success' ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-red-400/10 text-red-400 border border-red-400/20'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {message.text}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="bg-brand hover:bg-brand-hover text-black px-8 py-4 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
              </button>
            </form>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-500/5 border border-red-500/10 rounded-[32px] overflow-hidden">
          <div className="p-8 border-b border-red-500/10 bg-red-500/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-500">Danger Zone</h2>
                <p className="text-sm text-red-500/60">Irreversible actions for your account.</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Delete Account</h3>
                <p className="text-sm text-[#5A6F65] max-w-md">Once you delete your account, there is no going back. Please be certain.</p>
              </div>
              <button 
                onClick={handleDeleteAccount}
                disabled={loading}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-8 py-4 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}