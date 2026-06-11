/**
 * Bug Condition Exploration Tests — Task 1
 *
 * These tests MUST FAIL on unfixed code.
 * Failure = proof each bug exists.
 * They become the pass criteria once fixes are applied.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock next/image to a plain <img>
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} />,
}));

// Mock DashboardLayout to render children directly (avoids router/auth deps)
vi.mock("@/components/shared/DashboardLayout", () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>,
}));

// Mock ProjectFilters to a no-op
vi.mock("@/components/projects/ProjectFilters", () => ({
  default: () => null,
}));

// Mock SelectionFooter to a no-op
vi.mock("@/components/projects/SelectionFooter", () => ({
  default: () => null,
}));

// Mock queries — controlled per-test
vi.mock("@/lib/queries", () => ({
  getProjectsData: vi.fn(),
  deleteClip: vi.fn(),
  updateClip: vi.fn(),
}));

import * as queries from "@/lib/queries";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_CLIP = {
  id: "clip-1",
  title: "Original Title",
  thumbnail: null,
  clipUrl: null,
  score: 90,
  scoreKey: "high",
  duration: "00:30",
  style: "General",
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

// ─── Test 1a: onUpdate not wired ──────────────────────────────────────────────

describe("Test 1a — onUpdate not wired in ProjectsContent", () => {
  /**
   * Validates: Requirement 1.1
   *
   * The bug: ProjectsContent renders <ClipGrid> without passing the `onUpdate` prop.
   * ClipGrid receives onUpdate=undefined and passes it down to ClipCard.
   * When ClipCard calls onUpdate?.(id, updated) after save, nothing propagates.
   *
   * We test this by rendering ProjectsContent with a ClipGrid that records the
   * onUpdate prop it receives. On unfixed code, onUpdate will be undefined.
   *
   * Expected failure: typeof receivedOnUpdate === "undefined", not "function"
   */
  it("ProjectsContent should pass onUpdate function to ClipGrid — fails because prop is undefined", async () => {
    (queries.getProjectsData as any).mockResolvedValue([MOCK_CLIP]);
    (queries.updateClip as any).mockResolvedValue({});

    // Import real ClipGrid so we can wrap it and capture props
    const { default: RealClipGrid } = await import("@/components/projects/ClipGrid");
    let capturedOnUpdate: unknown = "NOT_CAPTURED";

    // Render ProjectsContent with a ClipGrid wrapper that captures onUpdate
    const { default: ProjectsContent } = await import("@/components/projects/ProjectsContent");

    // We'll use a custom render that substitutes ClipGrid via children interception.
    // Since we can't easily swap out the import, we read the DOM after render
    // and simulate the save flow, then check ClipCard's onUpdate invocation.

    // Approach: mount ProjectsContent, open edit, save, then check if onUpdate
    // propagated by verifying whether a passed-in spy was called.
    // The real test: ClipCard calls onUpdate?.(id, updated) in handleSaved.
    // If ClipGrid never received onUpdate, the call is a no-op (optional chaining).
    // We verify this by mounting ClipCard directly with an explicit onUpdate spy
    // and confirm it WOULD be called — but the bug is in ProjectsContent not passing it.

    // Direct assertion: inspect the rendered JSX tree for the onUpdate prop value.
    // Best approach: render ProjectsContent and capture what ClipGrid gets via
    // a portal/spy pattern. Instead, we use the most straightforward DOM check:
    // wrap in a context that records the prop through React's test utilities.

    // Simplest reliable method: render ProjectsContent, trigger save, then assert
    // that the *queryClient* saw an invalidation triggered by onUpdate path.
    // (We use a separate queryClient spy distinct from 1b to isolate this test.)
    const qc = makeQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    render(
      <QueryClientProvider client={qc}>
        <ProjectsContent clips={[MOCK_CLIP]} />
      </QueryClientProvider>
    );

    // Open edit modal, change title, save
    fireEvent.click(screen.getByTitle("Edit clip"));
    const titleInput = screen.getByPlaceholderText("Clip title");
    fireEvent.change(titleInput, { target: { value: "New Title" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(queries.updateClip).toHaveBeenCalled();
    });

    // On unfixed code: onUpdate is undefined on ClipGrid, so handleUpdateClip
    // (which calls invalidateQueries) is never invoked from the save path.
    // invalidateQueries call count from save = 0.
    // FAILS on unfixed code because the spy was never called via the onUpdate path.
    const callsFromSave = invalidateSpy.mock.calls.filter(
      (args) =>
        JSON.stringify(args[0]) === JSON.stringify({ queryKey: ["projectsData"] })
    );
    expect(callsFromSave.length).toBeGreaterThan(0);
  });
});

// ─── Test 1b: Cache not invalidated ──────────────────────────────────────────

describe("Test 1b — Cache not invalidated after clip save", () => {
  /**
   * Validates: Requirement 1.2
   *
   * Expected failure: ProjectsContent has no handleUpdateClip handler,
   * so invalidateQueries is never called on save. Spy call count === 0.
   */
  it("invalidateQueries should be called with projectsData key after save — fails because it never is", async () => {
    (queries.getProjectsData as any).mockResolvedValue([MOCK_CLIP]);
    (queries.updateClip as any).mockResolvedValue({});

    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { default: ProjectsContent } = await import(
      "@/components/projects/ProjectsContent"
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectsContent clips={[MOCK_CLIP]} />
      </QueryClientProvider>
    );

    // Open edit modal and save without changing anything
    fireEvent.click(screen.getByTitle("Edit clip"));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(queries.updateClip).toHaveBeenCalled();
    });

    // Assert invalidateQueries was called with the right key — FAILS (count === 0)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projectsData"] });
  });
});

// ─── Test 1c: No audio file input ─────────────────────────────────────────────

describe("Test 1c — No audio file input in EditModal DOM", () => {
  /**
   * Validates: Requirement 1.3
   *
   * Expected failure: EditModal only has type="url" input, no file input exists.
   * document.querySelector('input[type="file"][accept="audio/*"]') === null
   */
  it("edit modal should contain input[type=file][accept='audio/*'] — fails because it doesn't exist", async () => {
    const { default: ClipCard } = await import(
      "@/components/projects/ClipCard"
    );

    render(
      <ClipCard
        {...MOCK_CLIP}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    // Open edit modal
    fireEvent.click(screen.getByTitle("Edit clip"));

    // Assert the file input exists — FAILS: element is null in unfixed code
    const fileInput = document.querySelector('input[type="file"][accept="audio/*"]');
    expect(fileInput).toBeInTheDocument();
  });
});

// ─── Test 1d: type="url" blocks relative paths ────────────────────────────────

describe("Test 1d — type=url blocks relative audio paths", () => {
  /**
   * Validates: Requirement 1.4
   *
   * Expected failure: input has type="url" which rejects relative paths like
   * "./sounds/beat.mp3" as invalid URLs (validity.typeMismatch === true).
   * The fix is to change type to "text".
   */
  it("audio URL input should have type=text so relative paths are valid — fails because type is url", async () => {
    const { default: ClipCard } = await import(
      "@/components/projects/ClipCard"
    );

    render(
      <ClipCard
        {...MOCK_CLIP}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    // Open edit modal
    fireEvent.click(screen.getByTitle("Edit clip"));

    // Find the audio URL input by its placeholder
    const audioInput = document.querySelector(
      'input[placeholder="https://example.com/viral-sound.mp3"]'
    ) as HTMLInputElement | null;

    expect(audioInput).not.toBeNull();

    // Assert type is "text" — FAILS because it is "url" in unfixed code
    expect(audioInput!.type).toBe("text");
  });
});
