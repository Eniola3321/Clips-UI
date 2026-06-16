import "@testing-library/jest-dom";

// Mock the wallet module to avoid import errors
vi.mock("@/lib/wallet", () => ({
  disconnectWallet: vi.fn(),
  signAuthMessage: vi.fn(),
  ensureHexSignature: vi.fn(),
}));
