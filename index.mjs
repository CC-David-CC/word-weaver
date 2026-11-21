import {WordWeaverSession} from './model.mjs';
import {computeLayout} from './layout.mjs';

function createElement(host, tag, className, text) {
  if (host?.ui?.make) {
    return host.ui.make(tag, className, text);
  }
  if (typeof document !== 'undefined') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  return {
    tagName: tag.toUpperCase(),
    className: className || '',
    dataset: {},
    children: [],
    style: {},
    append(...kids) { this.children.push(...kids); },
    replaceChildren(...kids) { this.children = kids ? [...kids] : []; },
    setAttribute() {},
    removeAttribute() {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener() {},
    removeEventListener() {}
  };
}

export function mount(host, options = {}) {
  const root = createElement(host, 'div', 'word-weaver-app');

  let session = new WordWeaverSession(`weaver-${Date.now()}`);
  let selectedTileId = null;
  let disposed = false;
  let resizeObserver = null;

  // Header
  const header = createElement(host, 'header', 'weaver-header');
  const titleGroup = createElement(host, 'div', 'weaver-title-group');
  const title = createElement(host, 'h1', 'weaver-title', '🔤 Word Weaver');
  titleGroup.append(title);

  const stats = createElement(host, 'div', 'weaver-stats');
  const progressBadge = createElement(host, 'span', 'weaver-badge badge-progress');
  const starsBadge = createElement(host, 'span', 'weaver-badge badge-stars');
  const scoreBadge = createElement(host, 'span', 'weaver-badge badge-score');

  stats.append(progressBadge, starsBadge, scoreBadge);
  header.append(titleGroup, stats);

  // Main Container
  const main = createElement(host, 'main', 'weaver-main');

  // Definition Clue Card
  const clueCard = createElement(host, 'section', 'weaver-card clue-card');
  const clueTitle = createElement(host, 'h3', 'clue-title', 'Definition Clue');
  const clueText = createElement(host, 'p', 'clue-text');
  clueCard.append(clueTitle, clueText);

  // Word Slots Section
  const slotsSection = createElement(host, 'section', 'weaver-slots-section');
  slotsSection.setAttribute?.('aria-label', 'Word Target Slots');
  const slotsRow = createElement(host, 'div', 'weaver-slots-row');
  slotsSection.append(slotsRow);

  // Available Letter Tiles Pool
  const tilesSection = createElement(host, 'section', 'weaver-tiles-section');
  tilesSection.setAttribute?.('aria-label', 'Available Letter Tiles');
  const tilesPool = createElement(host, 'div', 'weaver-tiles-pool');
  tilesSection.append(tilesPool);

  // Controls Footer
  const controls = createElement(host, 'footer', 'weaver-controls');
  const hintBtn = createElement(host, 'button', 'weaver-btn weaver-btn-secondary', '💡 Hint Letter');
  hintBtn.onclick = () => {
    if (session.phase === 'solve') {
      try {
        session.hint();
        render();
      } catch {}
    }
  };

  const submitBtn = createElement(host, 'button', 'weaver-btn weaver-btn-primary', 'Check Spelling ▶');
  submitBtn.onclick = () => {
    if (session.phase === 'solve') {
      try {
        session.submit();
        selectedTileId = null;
        render();
      } catch {}
    }
  };

  const newGameBtn = createElement(host, 'button', 'weaver-btn weaver-btn-outline', '🔄 New Words');
  newGameBtn.onclick = () => {
    session = new WordWeaverSession(`weaver-${Date.now()}`);
    selectedTileId = null;
    render();
  };

  controls.append(hintBtn, submitBtn, newGameBtn);

  main.append(clueCard, slotsSection, tilesSection);
  root.append(header, main, controls);

  function handleTileClick(tile) {
    if (session.phase !== 'solve') return;

    if (tile.placedAt !== null) {
      // Return placed tile back to pool
      session.returnTile(tile.id);
      selectedTileId = null;
      render();
    } else {
      // Find first empty slot that is not revealed
      const emptySlot = session.slots.findIndex((s, idx) => s === null && session.revealed[idx] === null);
      if (emptySlot >= 0) {
        session.place(tile.id, emptySlot);
        selectedTileId = null;
        render();
      } else {
        selectedTileId = tile.id;
        render();
      }
    }
  }

  function handleSlotClick(slotIdx) {
    if (session.phase !== 'solve') return;

    const tileIdInSlot = session.slots[slotIdx];
    if (tileIdInSlot !== null) {
      session.returnTile(tileIdInSlot);
      render();
      return;
    }

    if (selectedTileId !== null && session.revealed[slotIdx] === null) {
      try {
        session.place(selectedTileId, slotIdx);
        selectedTileId = null;
        render();
      } catch {}
    }
  }

  function renderSlots() {
    slotsRow.replaceChildren();
    const slots = session.slots;
    const revealed = session.revealed;
    const tiles = session.tiles;

    slots.forEach((tileId, idx) => {
      const slotBox = createElement(host, 'button', 'weaver-slot');
      slotBox.setAttribute?.('aria-label', `Letter slot ${idx + 1}`);

      if (revealed[idx] !== null) {
        slotBox.classList?.add('slot-revealed');
        slotBox.textContent = revealed[idx].toUpperCase();
      } else if (tileId !== null) {
        const t = tiles.find(tile => tile.id === tileId);
        slotBox.classList?.add('slot-filled');
        slotBox.textContent = t ? t.letter.toUpperCase() : '';
      } else {
        slotBox.classList?.add('slot-empty');
        slotBox.textContent = '_';
      }

      slotBox.onclick = () => handleSlotClick(idx);
      slotsRow.append(slotBox);
    });
  }

  function renderTiles() {
    tilesPool.replaceChildren();
    session.tiles.forEach(t => {
      const btn = createElement(host, 'button', 'weaver-tile');
      if (t.placedAt !== null) btn.classList?.add('tile-placed');
      if (selectedTileId === t.id) btn.classList?.add('tile-selected');

      btn.textContent = t.letter.toUpperCase();
      btn.onclick = () => handleTileClick(t);
      tilesPool.append(btn);
    });
  }

  function render() {
    if (disposed) return;
    const state = session.state;
    progressBadge.textContent = `Word ${Math.min(state.index + 1, 8)} / 8`;
    starsBadge.textContent = `⭐ ${session.stars} stars`;
    scoreBadge.textContent = `Score: ${session.score}`;

    if (session.phase === 'done') {
      clueTitle.textContent = '🎉 Lexicon Mastered!';
      clueText.textContent = `Magnificent vocabulary craftsmanship! You spelled all 8 words with ${session.stars} stars and a score of ${session.score}.`;
      slotsRow.replaceChildren();
      tilesPool.replaceChildren();
      return;
    }

    clueTitle.textContent = `Definition (Length: ${session.word?.length || 0} letters)`;
    clueText.textContent = session.currentDefinition || 'Form the word by placing letter tiles in the slots above:';

    renderSlots();
    renderTiles();
  }

  render();

  if (typeof ResizeObserver !== 'undefined' && root.getBoundingClientRect) {
    resizeObserver = new ResizeObserver(() => {
      const rect = root.getBoundingClientRect();
      const layout = computeLayout(rect.width, rect.height);
      if (root.dataset) root.dataset.tier = layout.tier;
    });
    resizeObserver.observe(root);
  }

  return {
    element: root,
    session,
    dispose() {
      disposed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      root.replaceChildren?.();
    }
  };
}
