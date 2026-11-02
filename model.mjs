import {
  SeededRng,
  clone,
  decodeSave,
  encodeSave,
  exactKeys,
  integer,
  plainObject,
  string,
} from "../shared/core.mjs";

export const WORD_WEAVER_APP_ID = "word-weaver";
export const WORD_WEAVER_CONTENT_VERSION = "word-weaver-core-1";
export const LEXICON = Object.freeze([
  {spelling: "planet", definition: "A large body that travels around a star."},
  {spelling: "journey", definition: "A trip from one place to another."},
  {spelling: "garden", definition: "A place where plants are grown."},
  {spelling: "pencil", definition: "A tool used for writing or drawing."},
  {spelling: "rocket", definition: "A vehicle that travels into space."},
  {spelling: "river", definition: "A large natural stream of water."},
  {spelling: "friend", definition: "A person you know and like."},
  {spelling: "bright", definition: "Giving off or reflecting a lot of light."},
  {spelling: "castle", definition: "A large strong building from long ago."},
  {spelling: "forest", definition: "A large area covered with trees."},
  {spelling: "island", definition: "Land surrounded by water."},
  {spelling: "winter", definition: "The coldest season of the year."},
]);
const WORDS_PER_SESSION = 8;
const DISTRACTORS = ["a", "e", "i", "o", "u", "r", "s", "t", "n", "l"];

export class WordWeaverSession {
  #state;
  #rng;

  constructor(seed) {
    if (plainObject(seed) && Array.isArray(seed.words)) {
      validatePayload(seed);
      this.#state = clone(seed);
      this.#rng = SeededRng.fromState(seed.rngState);
      return;
    }
    const rng = new SeededRng(seed);
    const words = rng.shuffle(LEXICON).slice(0, WORDS_PER_SESSION).map(word => clone(word));
    const state = {
      version: WORD_WEAVER_CONTENT_VERSION,
      seed: String(seed),
      rngState: 0,
      phase: "solve",
      words,
      index: 0,
      tiles: [],
      slots: [],
      revealed: [],
      hintsUsed: 0,
      mistakes: 0,
      score: 0,
      stars: 0,
    };
    startWord(state, rng);
    state.rngState = rng.state;
    this.#state = state;
    this.#rng = rng;
  }

  static fromSave(text) {
    return new WordWeaverSession(decodeSave(text, WORD_WEAVER_APP_ID, WORD_WEAVER_CONTENT_VERSION, validatePayload));
  }

  get phase() {
    return this.#state.phase;
  }

  get word() {
    return this.#state.index < this.#state.words.length ? this.#state.words[this.#state.index].spelling : null;
  }

  get tiles() {
    return clone(this.#state.tiles);
  }

  get slots() {
    return clone(this.#state.slots);
  }

  get revealed() {
    return clone(this.#state.revealed);
  }

  get score() {
    return this.#state.score;
  }

  get stars() {
    return this.#state.stars;
  }

  get state() {
    return clone(this.#state);
  }

  place(tileId, slot) {
    if (this.#state.phase !== "solve") throw Error("The word session is complete.");
    if (!string(tileId, 32) || !integer(slot, 0, this.#state.slots.length - 1)) throw Error("Invalid tile or slot.");
    const tile = this.#state.tiles.find(value => value.id === tileId);
    if (!tile) throw Error("Unknown tile.");
    if (tile.placedAt !== null) throw Error("Tile is already placed.");
    if (this.#state.slots[slot] !== null) throw Error("Slot is occupied.");
    tile.placedAt = slot;
    this.#state.slots[slot] = tile.id;
  }

  returnTile(tileId) {
    if (this.#state.phase !== "solve") throw Error("The word session is complete.");
    const tile = this.#state.tiles.find(value => value.id === tileId);
    if (!tile || tile.placedAt === null) throw Error("Tile is not placed.");
    this.#state.slots[tile.placedAt] = null;
    tile.placedAt = null;
  }

  hint() {
    if (this.#state.phase !== "solve") throw Error("The word session is complete.");
    const slot = this.#state.revealed.findIndex((letter, index) => letter === null && this.#state.slots[index] === null);
    if (slot < 0) throw Error("No empty slot remains for a hint.");
    const target = this.word;
    this.#state.revealed[slot] = target[slot];
    this.#state.hintsUsed++;
    this.#state.wordHints++;
    return {slot, letter: target[slot]};
  }

  submit() {
    if (this.#state.phase !== "solve") throw Error("The word session is complete.");
    const target = this.word;
    const attempt = target.split("").map((_, slot) => {
      if (this.#state.revealed[slot] !== null) return this.#state.revealed[slot];
      const tileId = this.#state.slots[slot];
      return tileId === null ? null : this.#state.tiles.find(tile => tile.id === tileId)?.letter ?? null;
    });
    if (attempt.some(letter => letter === null)) throw Error("Fill every slot before submitting.");
    const mismatch = attempt.findIndex((letter, index) => letter !== target[index]);
    if (mismatch >= 0) {
      this.#state.mistakes++;
      this.#state.wordMistakes++;
      this.#state.score = Math.max(0, this.#state.score - 5);
      for (const tile of this.#state.tiles) tile.placedAt = null;
      this.#state.slots.fill(null);
      return {correct: false, mismatch, expected: target[mismatch], attempted: attempt[mismatch]};
    }

    const reward = Math.max(2, 20 - this.#state.wordHints * 5 - this.#state.wordMistakes * 2);
    this.#state.score += reward;
    this.#state.index++;
    if (this.#state.index === this.#state.words.length) {
      this.#state.phase = "done";
      this.#state.stars = this.#state.hintsUsed <= 2 && this.#state.mistakes <= 2 ? 3 : this.#state.mistakes <= 5 ? 2 : 1;
      this.#state.tiles = [];
      this.#state.slots = [];
      this.#state.revealed = [];
    } else {
      startWord(this.#state, this.#rng);
      this.#state.rngState = this.#rng.state;
    }
    return {correct: true, done: this.#state.phase === "done", reward};
  }

  encodeSave() {
    this.#state.rngState = this.#rng.state;
    return encodeSave(WORD_WEAVER_APP_ID, clone(this.#state), WORD_WEAVER_CONTENT_VERSION);
  }
}

function startWord(state, rng) {
  const target = state.words[state.index].spelling;
  const letters = target.split("");
  while (letters.length < target.length + 2) {
    const distractor = rng.pick(DISTRACTORS);
    if (!target.includes(distractor)) letters.push(distractor);
  }
  state.tiles = rng.shuffle(letters).map((letter, index) => ({id: `w${state.index}-t${index}`, letter, placedAt: null}));
  state.slots = Array(target.length).fill(null);
  state.revealed = Array(target.length).fill(null);
  state.wordHints = 0;
  state.wordMistakes = 0;
}

function lexiconWord(value) {
  return LEXICON.some(entry => entry.spelling === value.spelling && entry.definition === value.definition);
}

function validatePayload(state) {
  if (!exactKeys(state, ["version", "seed", "rngState", "phase", "words", "index", "tiles", "slots", "revealed",
    "hintsUsed", "mistakes", "score", "stars", "wordHints", "wordMistakes"]) ||
    state.version !== WORD_WEAVER_CONTENT_VERSION || typeof state.seed !== "string" ||
    !integer(state.rngState, 0, 0xffffffff) || !["solve", "done"].includes(state.phase) ||
    !Array.isArray(state.words) || state.words.length !== WORDS_PER_SESSION ||
    !state.words.every(word => exactKeys(word, ["spelling", "definition"]) && lexiconWord(word)) ||
    new Set(state.words.map(word => word.spelling)).size !== state.words.length ||
    !integer(state.index, 0, WORDS_PER_SESSION) || !integer(state.hintsUsed, 0, 1000) ||
    !integer(state.mistakes, 0, 10000) || !integer(state.score, 0, 100000) || !integer(state.stars, 0, 3) ||
    !integer(state.wordHints, 0, 1000) || !integer(state.wordMistakes, 0, 1000)) {
    throw Error("Invalid Word Weaver snapshot.");
  }
  if (state.phase === "done") {
    if (state.index !== WORDS_PER_SESSION || state.tiles.length || state.slots.length || state.revealed.length) {
      throw Error("Invalid completed Word Weaver state.");
    }
    return;
  }
  const target = state.words[state.index].spelling;
  if (!Array.isArray(state.slots) || state.slots.length !== target.length ||
      !Array.isArray(state.revealed) || state.revealed.length !== target.length ||
      !Array.isArray(state.tiles) || state.tiles.length !== target.length + 2) throw Error("Invalid word layout.");
  const ids = new Set();
  for (const tile of state.tiles) {
    if (!exactKeys(tile, ["id", "letter", "placedAt"]) || !string(tile.id, 32) || ids.has(tile.id) ||
        !string(tile.letter, 1) || tile.letter.length !== 1 || !/[a-z]/.test(tile.letter) ||
        !(tile.placedAt === null || integer(tile.placedAt, 0, target.length - 1))) throw Error("Invalid word tile.");
    ids.add(tile.id);
    if (tile.placedAt !== null && state.slots[tile.placedAt] !== tile.id) throw Error("Tile placement mismatch.");
  }
  state.slots.forEach((tileId, slot) => {
    if (tileId !== null && (!ids.has(tileId) || state.tiles.find(tile => tile.id === tileId)?.placedAt !== slot)) {
      throw Error("Invalid word slot.");
    }
  });
  state.revealed.forEach((letter, slot) => {
    if (letter !== null && letter !== target[slot]) throw Error("Invalid revealed letter.");
  });
  const targetCounts = letterCounts(target);
  for (const [letter, count] of Object.entries(targetCounts)) {
    if (state.tiles.filter(tile => tile.letter === letter).length < count) throw Error("Missing target letters.");
  }
}

function letterCounts(word) {
  return [...word].reduce((counts, letter) => ({...counts, [letter]: (counts[letter] || 0) + 1}), {});
}
