"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import apiClient from "@/lib/apiClient";

export interface User {
  id: string;
  email: string;
  fullName: string;
  onboardingStep: number;
  profile: {
    username?: string;
    niche?: string;
    socialsConnected?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiClient.get('/users/me');
        setUserState(response.data);
      } catch (error: any) {
        // Silent catch for 401 on initial load
        if (error.response?.status !== 401) {
          console.error("Auth check failed:", error);
        }
        setUserState(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Client-side navigation logic to handle state changes
  useEffect(() => {
    if (isLoading) return;

    const guestPaths = ["/login", "/signup", "/"];
    const isGuestPath = guestPaths.includes(pathname);

    if (user) {
      // Robust check for onboarding completion
      // Falls back to checking profile fields if onboardingStep is not persisted by backend
      const hasUsername = !!user.profile?.username || !!(user as any).username;
      const needsOnboarding = (!user.onboardingStep || user.onboardingStep <= 2) && !hasUsername;

      if (isGuestPath) {
        if (needsOnboarding) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      } else if (pathname === "/onboarding") {
        if (!needsOnboarding) {
          router.push("/dashboard");
        }
      }
      // Removed aggressive redirect to /onboarding from protected paths to prevent loops
      // when backend doesn't persist the onboarding step
    } else {
      const protectedPaths = ["/dashboard", "/projects", "/clips", "/platforms", "/onboarding"];
      const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));
      if (isProtectedPath) {
        router.push("/login");
      }
    }
  }, [user, isLoading, pathname, router]);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auths/logout');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
