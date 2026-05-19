# Sarvam Frontend Intern Assignment

## Architecture Decisions

- **React & TypeScript:** Built using React with TypeScript for strong typing and robust component architecture.
- **Vite:** Chosen for fast build times and a modern development experience.
- **Component Structure:** The application is split into two primary components: `InferencePlayground` and `DiffView`, ensuring separation of concerns.
- **Custom CSS:** Used vanilla CSS (`index.css`) with CSS variables for a consistent, premium design system without the overhead of heavy styling libraries.

## Diffing Algorithm Approach

The core diffing algorithm (`src/utils/diffAlgorithm.ts`) is a custom-built solution designed for token-level comparison.

### The Algorithm

The algorithm compares two text strings token by token (preserving whitespace tokens). It iterates through both token arrays simultaneously:

1.  **Match:** If the current tokens match, it registers an `equal` operation.
2.  **Mismatch & Lookahead:** If they don't match, it uses a **lookahead window** (default size: 8). It searches ahead in both strings within this window to find the *closest* matching tokens.
3.  **Synchronization:** If a match is found within the window, all skipped tokens in the first string are marked as `delete`, and all skipped tokens in the second string are marked as `insert`. The pointers are then synchronized to the new match.
4.  **Substitution:** If no match is found in the window, it treats the current tokens as a simple substitution (one delete, one insert) and moves forward.

### Time Complexity

The time complexity is **O(N * W^2)**, where:
- `N` is the length of the strings (number of tokens).
- `W` is the lookahead window size.

Since `W` is a small constant (e.g., 8), the effective time complexity is **O(N)**, making it highly performant for real-time applications compared to traditional algorithms.

### Why not LCS or Myers Diff?

- **Performance:** Traditional Longest Common Subsequence (LCS) or Myers diff algorithms typically have O(N^2) or O(ND) time complexity. For very long model outputs, this can cause significant UI blocking. Our custom algorithm is linear O(N) due to the bounded lookahead window.
- **Token-Level Focus:** The assignment specifically requested token-level diffing. While Myers can be adapted for tokens, a custom sliding-window approach gives fine-grained control over how "similarity" is prioritized without calculating the optimal path across the entire document.
- **Simplicity & Size:** The custom algorithm is compact and doesn't require importing external libraries, reducing bundle size.

## Accessibility Considerations

- **Semantic HTML:** Used native semantic elements where appropriate (`button`, `textarea`).
- **ARIA Attributes:**
  - `role="tab"` and `aria-selected` for the input mode toggle.
  - `aria-live="polite"` for the metrics to announce updates to screen readers without interrupting.
  - `aria-live="assertive"` for the main output area so changes are announced immediately.
  - `aria-label` on inputs and buttons for clear identification.
  - `role="alert"` for the error state overlay.
- **Keyboard Navigation:** All interactive elements are fully focusable and usable via keyboard. Focus states are clearly visible using custom `outline` styling in CSS.
- **Color Contrast:** The design system uses color combinations that meet WCAG AA contrast standards.

## Error Handling Strategy

- **Graceful Degradation:** The mock streaming service simulates mid-stream failures.
- **State Preservation:** If an error occurs, the stream stops, but all previously received tokens are preserved and remain visible on the screen. The session does not reset.
- **Clear Indicators:** A prominent error alert overlay appears, clearly communicating what went wrong. The UI state updates (e.g., the "Stop Stream" button disappears, metrics stop counting).

## Deployment

- GitHub Repository: [Link to repository]
- Vercel Deployment: [Link to deployment]
- Video Walkthrough: [Link to video]
