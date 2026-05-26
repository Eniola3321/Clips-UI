"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import OnboardingHero from "@/components/onboarding/OnboardingHero";
import ProfileSetupForm from "@/components/onboarding/ProfileSetupForm";
import SocialConnectPreview from "@/components/onboarding/SocialConnectPreview";
import SocialConnectStep from "@/components/onboarding/SocialConnectStep";
import apiClient from "@/lib/apiClient";

export default function OnboardingPage() {
  const { user, setUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(user?.profile?.username || "");
  const [niche, setNiche] = useState(user?.profile?.niche || "");

  const step = (!user?.onboardingStep || user?.onboardingStep === 1) ? 1 : 2;

  const completeStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // The backend only accepts 'username' and 'fullName' in PATCH /users/me
      // 'niche' and 'onboardingStep' are not supported fields for updates
      const response = await apiClient.patch('/users/me', { 
        username
      });
      
      // Update local state with the response from backend
      setUser({
        ...response.data,
        onboardingStep: 2,
        profile: {
          ...response.data.profile,
          username,
          niche
        }
      });
    } catch (error: any) {
      console.error("Failed to save onboarding step 1 to backend:", error);
      
      // Fallback: Advance step locally even if backend update fails
      // This ensures the user can continue with onboarding
      if (user) {
        setUser({
          ...user,
          onboardingStep: 2,
          profile: {
            ...user.profile,
            username,
            niche
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const completeStep2 = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Optional: Inform backend that onboarding is complete
      // We ignore errors here because we want the user to reach the dashboard regardless
      await apiClient.patch('/users/me', { 
        // We could send something here if the backend had a 'status' or similar
      }).catch(() => {});

      // Advance to step 3 (Dashboard) locally
      setUser({
        ...user,
        onboardingStep: 3
      });
    } catch (error: any) {
      console.error("Failed to save onboarding step 2:", error);
      
      // Fallback: Always advance to dashboard
      setUser({
        ...user,
        onboardingStep: 3
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white font-sans flex flex-col relative overflow-hidden bg-[#080C0B]">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-brand/10 rounded-full blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed top-1/4 right-0 w-[600px] h-[600px] bg-brand/[0.07] rounded-full blur-[120px] pointer-events-none translate-x-1/3" />
      
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex items-center z-10 relative">
        {step === 1 ? (
          <div className="w-full flex flex-col lg:flex-row items-start justify-between gap-16 lg:gap-8 mt-[-20px]">
            <OnboardingHero />
            <div className="w-full max-w-[440px] flex flex-col gap-6">
              <ProfileSetupForm 
                username={username}
                setUsername={setUsername}
                niche={niche}
                setNiche={setNiche}
                loading={loading}
                onSubmit={completeStep1}
              />
              <SocialConnectPreview />
            </div>
          </div>
        ) : (
          <SocialConnectStep onComplete={completeStep2} />
        )}
      </main>
    </div>
  );
}
