# Word Weaver — Agent Guidelines & 2026 Display Architecture

## Role and Scope
This repository (`apps/word-weaver/`) owns the Word Weaver implementation for WebOS (Vocabulary & Anagram Puzzle).
It is an independent Git submodule. All code, tests, styles, and assets must remain self-contained within this directory. Do not introduce external CDN dependencies or rely on parent-level tooling.

### Current Implementation Status
* **Engine / Stack**: Deterministic Core + Upcoming Canvas UI
* **Overview**: Spelling, anagram, and vocabulary puzzle forming word webs from letter tiles with definition hints.

---

## 3-Tier Responsive Display Architecture

Word Weaver must adapt seamlessly across three distinct display tiers based on window and screen dimensions:

```
+-------------------------------------------------------------------------+
| Tier 1: Phone (< 768px)   | Tier 2: 1080p Desktop     | Tier 3: 4K UHD   |
| • Compact mobile viewport | • 1080p standard FHD      | • 4K UHD 3840x2160|
| • Touch-first navigation  | • Keyboard/mouse controls | • 4x HiDPI scale |
| • Essential HUD only      | • Sidebars & statistics   | • Telemetry HUD  |
+-------------------------------------------------------------------------+
```

### Tier 1: Simplified Phone Display (Mobile / Viewport < 768px)
* **Target Viewport**: 360x640 to 430x932 (mobile portrait or compact desktop window).
* **Responsive Layout**:
  - Eliminate all hardcoded canvas width and height constants (no fixed `W` or `H` values).
  - Automatically measure container dimensions (`rect.width`, `rect.height`) and compute layout metrics dynamically.
  - Scale playfields, boards, and game elements proportionally to fit the viewport width without clipping.
* **Touch-First Controls**:
  - Letter tile carousel at bottom, tap letters to place into word slots, drag to reorder, word definition popup.
  - Ensure minimum 44x44px (recommended 48x48px) touch hitboxes on all interactive elements.
* **Simplified UI & HUD**:
  - Secondary panels, settings, and instructions collapse into sliding bottom sheets or hamburger drawers.
  - Keep the primary playfield visible without soft-keyboard or bottom-bar obstruction.

### Tier 2: Full 1080p Desktop Display (Standard Desktop 1920x1080)
* **Target Viewport**: 1024x768 to 1920x1080 window / screen size.
* **Layout & Features**:
  - Comfortable desktop viewports with generous playfield margins.
  - Dual-pane or multi-column layout featuring statistics, history, or inventory sidebars.
* **Controls & Visuals**:
  - Crossword-style word web board, dictionary definition and etymology panel on right, letter frequency tracker.
  - Full keyboard mapping (WASD, Arrow keys, Space, Esc for pause, Ctrl+Z for undo).
  - Dynamic `devicePixelRatio` canvas scaling (1.0 - 2.0x) for sharp graphics and typography.

### Tier 3: Complete 4K Display (Ultra-HD 3840x2160 / Retina)
* **Target Viewport**: Width >= 2560px or HiDPI Retina (3840x2160, 4K UHD).
* **HiDPI Scaling & Vector Sharpness**:
  - Explicit canvas buffer scaling:
    ```typescript
    const dpr = Math.min(window.devicePixelRatio || 1, 4);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ```
  - Vector curves, text, and 3D rendering buffers must match native high-density pixels with zero blur.
* **Spacious Visual Polish**:
  - 4K typography rendering with custom serif letterpress tiles, anagram discovery tree visualization.
  - Typography styled using `rem` and CSS `clamp()` so text remains comfortably legible without eye strain.
* **Diagnostic Telemetry (Optional)**:
  - Toggleable debug HUD displaying live FPS, frame render time (ms), and active simulation steps.

---

## Technical Standards & WebOS Contract

### 1. Zero-Dependency Testing (Node 24 Native Test Runner)
* Tests must run using Node 24's built-in `node:test` and `node:assert/strict`:
  ```bash
  node --test tests/*.test.mjs
  ```
* Do not rely on external `vitest` binaries or undeclared test runners.
* Maintain comprehensive unit tests covering:
  - Deterministic game rules and seeded PRNG reproducibility.
  - State snapshot round-tripping (`encodeSave` / `decodeSave` where applicable).
  - Error boundaries on malformed inputs.

### 2. WebOS Host Lifecycle Contract
* Export synchronous `mount(host)` from the app entry:
  ```typescript
  export interface GameMountResult {
    element: HTMLElement;
    dispose(): void;
  }
  ```
* **Strict Cleanup Requirements on `dispose()`**:
  - Cancel any active `requestAnimationFrame` loops (`cancelAnimationFrame(frame)`).
  - Suspend or close Web Audio contexts (`audio.dispose()`).
  - Terminate any WebGL/WebGPU renderers or WebWorker threads.
  - Disconnect all observers (`ResizeObserver`, `MutationObserver`).
  - Remove all DOM event listeners (`pointerdown`, `keydown`, `resize`, `focus`, `blur`).
* **Persistence**:
  - Save game progress to `/My files/` using `host.storage.mirrorFileContext()`.
  - Support debounced auto-saving on turn/move completion.

### 3. Local Git Workflow
* All development occurs on local branches (e.g. `webos/rebuild` or `webos/integration`).
* Push commits strictly to the local bare origin:
  ```bash
  git push origin HEAD
  ```
* Do not push to external GitHub remotes without explicit instruction.
