"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../app/lib/mockApi";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load from local storage on mount
    const storedUser = localStorage.getItem("clipcash_user");
    if (storedUser) {
      setUserState(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("clipcash_user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("clipcash_user");
    }
  };

  // Basic routing logic based on auth state
  useEffect(() => {
    if (isLoading) return;

    if (user) {
      if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
        if (user.onboardingStep === 1 || user.onboardingStep === 2) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      } else if (pathname === "/onboarding") {
        if (user.onboardingStep > 2) {
          router.push("/dashboard");
        }
      }
    } else {
      if (pathname === "/dashboard" || pathname === "/onboarding") {
        router.push("/login");
      }
    }
  }, [user, isLoading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
