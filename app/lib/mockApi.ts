// This file replaces the backend server by mocking the needed endpoints client-side with simulated latency.

export type User = {
  id: string;
  email: string;
  name?: string;
  username?: string;
  password?: string;
  onboardingStep: number;
  profile?: any;
};

// In-memory fake database
let users: User[] = [];

// Helper to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MockApi = {
  /**
   * Check if a user with the given email exists
   */
  checkEmail: async (email: string) => {
    await delay(600); // Simulate network latency
    const user = users.find(u => u.email === email);
    return { exists: !!user };
  },

  /**
   * Login an existing user
   */
  login: async (email: string, password?: string) => {
    await delay(800);
    const user = users.find(u => u.email === email);
    
    // Simplistic auth check
    if (!user || (password && user.password !== password)) {
      throw new Error("Invalid credentials");
    }

    // Mock generic token
    const token = `fake-jwt-token-${user.id}`;
    
    return { token, user };
  },

  /**
   * Signup a new user
   */
  signup: async (email: string, password?: string, name?: string) => {
    await delay(800);
    
    if (users.find(u => u.email === email)) {
      throw new Error("User already exists");
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      password,
      name: name || email.split('@')[0],
      onboardingStep: 1,
      profile: {}
    };

    users.push(newUser);
    
    const token = `fake-jwt-token-${newUser.id}`;
    return { token, user: newUser };
  },

  saveOnboarding: async (userId: string, step: number, data: any) => {
    await delay(500); // Usually faster for background auto-save
    
    let user: User | undefined = users.find(u => u.id === userId);
    
    // Auto-recover lost memory db from localStorage on page refresh/HMR
    if (!user && typeof window !== "undefined") {
      const stored = localStorage.getItem("clipcash_user");
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        if (parsed.id === userId) {
          user = parsed;
          users.push(user);
        }
      }
    }

    if (!user) throw new Error("User not found");

    user.onboardingStep = step;
    user.profile = { ...user.profile, ...data };
    
    return { success: true, user };
  }
};
