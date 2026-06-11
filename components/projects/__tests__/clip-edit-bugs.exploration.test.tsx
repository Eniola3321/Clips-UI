/**
 * Bug Condition Exploration Tests — Task 1
 *
 * These tests MUST FAIL on the current (unfixed) code.
 * Failure confirms each bug exists. DO NOT fix the code when these fail.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mock next/image (not available in jsdom) ─────────────────────────────────
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// ─── Mock lib/queries ─────────────────────────────────────────────────────────
vi.mock("@/lib/queries", () => ({
  getProjectsData: vi.fn().mockResolvedValue([]),
  deleteClip: vi.fn().mockResolvedValue(undefined),
  updateClip: vi.fn().mockResolvedValue({ id: "clip-1", title: "New Title" }),
}));

import { updateClip } from "@/lib/queries";
import ProjectsContent from "../ProjectsContent";
import ClipCard from "../ClipCard";

// ─── Shared test clip fixture ─────────────────────────────────────────────────
const MOCK_CLIP = {
  id: "clip-1",
  title: "Original Title",
  thumbnail: null,
  clipUrl: null,
  score: 75,
  scoreKey: "medium",
  duration: "00:30",
  style: "General",
};

/**
 * Helper: build a fresh QueryClient for each test so caches don't bleed across tests.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries so test failures are immediate
        retry: false,
        // Use initialData so no network call is made
        staleTime: Infinity,
      },
    },
  });
}

// ─── Test 1a — onUpdate callback not wired ────────────────────────────────────
describe("Test 1a — onUpdate callback not wired through ProjectsContent", () => {
  /**
   * BUG CONDITION: ProjectsContent renders <ClipGrid> without an onUpdate prop.
   * EXPECTED FAILURE: After saving a new title, the grid card still shows the old title
   *                   because onUpdate is undefined and the local state in ClipCard
   *                   does not propagate up.
   *
   * Counter-example: save({ title: "New Title" }) → grid card still shows "Original Title"
   */
  it("should show the new title in the grid after saving — FAILS because onUpdate is not wired", async () => {
    const user = userEvent.setup();
    const queryClient = makeQueryClient();

    // Seed the query cache with a known clip so ProjectsContent renders it
    queryClient.setQueryData(["projectsData"], [MOCK_CLIP]);

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectsContent clips={[MOCK_CLIP]} />
      </QueryClientProvider>
    );

    // The card's title should be visible
    expect(screen.getByText("Original Title")).toBeInTheDocument();

    // Click the Edit button on the card (Edit icon button)
    const editButtons = screen.getAllByTitle("Edit clip");
    await user.click(editButtons[0]);

    // The edit modal should now be open — find the title input
    const titleInput = await screen.findByPlaceholderText("Clip title");
    expect(titleInput).toBeInTheDocument();

    // Clear the title field and type a new title
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    // Click Save Changes
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Wait for the modal to close (Save Changes button disappears)
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
    });

    /**
     * ASSERTION — will FAIL on unfixed code:
     * The grid card should now display "New Title".
     * On unfixed code the card still shows "Original Title" because
     * ProjectsContent never passed onUpdate to ClipGrid, so the
     * ClipCard local state update is not re-reflected from the parent.
     *
     * NOTE: ClipCard does update its own local title state via setTitle in handleSaved.
     *       The real failure is that the PARENT (ProjectsContent/ClipGrid) is not informed.
     *       We assert the grid re-renders via the parent by checking that
     *       updateClip was called but the parent has no handler to respond.
     */
    // updateClip must have been called (API works fine)
    expect(updateClip).toHaveBeenCalledWith("clip-1", expect.objectContaining({ title: "New Title" }));

    // The grid (ProjectsContent) should have received the update — but it has no handler,
    // so we verify by checking that no onUpdate was wired:
    // Specifically, ClipGrid receives onUpdate={undefined}, so ProjectsContent never
    // invalidates the cache. We assert invalidateQueries was NOT triggered for projectsData.
    // The cache still holds the original clip data — new title is NOT in the query cache.
    const cachedClips = queryClient.getQueryData<typeof MOCK_CLIP[]>(["projectsData"]);
    // This assertion FAILS on unfixed code — cache is never updated, still has old title
    expect(cachedClips?.[0]?.title).toBe("New Title");
  });
});

// ─── Test 1b — Cache not invalidated ─────────────────────────────────────────
describe("Test 1b — projectsData cache not invalidated after save", () => {
  /**
   * BUG CONDITION: ProjectsContent has no handleUpdateClip function and does not
   *                pass onUpdate to ClipGrid. The query cache is never invalidated
   *                after a save, so server-authoritative data is never re-fetched.
   *
   * Expected failure on unfixed code: spy is never invoked.
   * Counter-example: after save, invalidateQueries call count === 0
   */
  it("should call queryClient.invalidateQueries with projectsData after saving — FAILS because no cache invalidation exists", async () => {
    const user = userEvent.setup();
    const queryClient = makeQueryClient();

    // Spy on invalidateQueries
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.setQueryData(["projectsData"], [MOCK_CLIP]);

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectsContent clips={[MOCK_CLIP]} />
      </QueryClientProvider>
    );

    // Open the edit modal
    const editButtons = screen.getAllByTitle("Edit clip");
    await user.click(editButtons[0]);

    // Wait for modal to appear
    const titleInput = await screen.findByPlaceholderText("Clip title");
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    // Click Save
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
    });

    /**
     * ASSERTION — will FAIL on unfixed code:
     * invalidateQueries should have been called with { queryKey: ["projectsData"] }.
     * On unfixed code it is never called (call count === 0).
     */
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["projectsData"] })
    );
  });
});

// ─── Test 1c — No audio file input in DOM ────────────────────────────────────
describe("Test 1c — No audio file input in EditModal", () => {
  /**
   * BUG CONDITION: EditModal was built with only a type="url" text input for audio.
   *                No <input type="file" accept="audio/*"> was ever added.
   *
   * Expected failure on unfixed code: element not found in DOM.
   * Counter-example: document.querySelector('input[type="file"][accept="audio/*"]') === null
   */
  it('should find input[type="file"][accept="audio/*"] in EditModal — FAILS because no file input exists', async () => {
    const user = userEvent.setup();

    render(
      <ClipCard
        {...MOCK_CLIP}
        isSelected={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    // Open the edit modal by clicking the Edit icon
    const editButton = screen.getByTitle("Edit clip");
    await user.click(editButton);

    // Wait for modal to appear
    await screen.findByText("Edit Clip");

    /**
     * ASSERTION — will FAIL on unfixed code:
     * The audio file input should exist in the modal.
     * On unfixed code it is absent; only a type="url" input is rendered.
     */
    const fileInput = document.querySelector('input[type="file"][accept="audio/*"]');
    expect(fileInput).toBeInTheDocument();
  });
});

// ─── Test 1d — type="url" blocks relative paths ───────────────────────────────
describe('Test 1d — type="url" rejects relative audio paths', () => {
  /**
   * BUG CONDITION: The audio overlay input uses type="url", which activates browser
   *                constraint validation and rejects non-absolute-URL values like
   *                ./sounds/beat.mp3.
   *
   * Expected failure on unfixed code: validity.typeMismatch === true, validity.valid === false
   * Counter-example: audioInput.value = './sounds/beat.mp3' → validity.valid === false
   */
  it("audio URL input should accept relative paths (validity.valid === true) — FAILS because type=url enforces URL format", async () => {
    const user = userEvent.setup();

    render(
      <ClipCard
        {...MOCK_CLIP}
        isSelected={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    // Open the edit modal
    const editButton = screen.getByTitle("Edit clip");
    await user.click(editButton);

    // Wait for modal to appear
    await screen.findByText("Edit Clip");

    // Find the audio input field — on unfixed code this is type="url"
    // It has placeholder "https://example.com/viral-sound.mp3"
    const audioInput = screen.getByPlaceholderText(
      /https:\/\/example\.com\/viral-sound\.mp3/i
    ) as HTMLInputElement;

    expect(audioInput).toBeInTheDocument();

    // Set the input value to a relative path via fireEvent
    // (userEvent would also work but fireEvent is more direct for validity checks)
    fireEvent.change(audioInput, { target: { value: "./sounds/beat.mp3" } });

    /**
     * ASSERTION — will FAIL on unfixed code:
     * With type="url", the browser marks ./sounds/beat.mp3 as typeMismatch.
     * The fixed code uses type="text" which has no such constraint.
     *
     * jsdom enforces type="url" constraint validation, so:
     *   - unfixed: validity.valid === false, validity.typeMismatch === true
     *   - fixed:   validity.valid === true  (type="text" has no URL constraint)
     */
    expect(audioInput.validity.valid).toBe(true);
  });
});
