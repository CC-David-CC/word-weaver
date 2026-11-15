# Word Weaver — core rules

Audience: grades 3–4. Learning target: spelling, decoding, and word
recognition with corrective feedback.

## Canonical state

```
session = {
  version, seed, rngState, phase: "solve" | "done",
  words: [{spelling, hint, definition}], index,
  tiles: {id, letter, placedAt | null}, slots: (tileId | null)[],
  hintsUsed, mistakes, score
}
```

The word list is a fixed, reviewed lexicon appropriate to the grade band.
Tiles contain the target word's letters plus bounded distractor letters.

## Operations

- `place(tileId, slot)` is legal when the tile is unplaced and the slot is
  empty.
- `return(tileId)` removes a placed tile from its slot.
- `hint()` reveals the correct letter in one empty slot or speaks the
  pronunciation at a later presentation stage; the core records which slot was
  revealed.
- `submit()` is legal when every slot is filled.

## Rules and invariants

- A tile cannot be placed twice or overwrite another tile.
- Slots always equal the target word's letter count.
- Submitting with any wrong letter increments mistakes, explains the first
  mismatch in order, and returns those tiles without ending the round.
- A hint can never invent letters; it reveals an actual target letter.
- Score decreases with mistakes and hints but never becomes negative.

## Win and loss

Correct submission completes the word and advances the list. There is no
dead-end: returning tiles and hints always permit another attempt.

## Seeded behavior

One RNG stream selects word order and distractor letters. Same seed and action
history reproduce the session.

## Snapshot

Store version, seed, RNG state, word list, index, tile placements, revealed
hints, mistakes, score, and phase. Validation rejects tile IDs outside the
list, duplicate placements, slot counts that do not match the target word, and
word strings outside the lexicon.

## Pure tests before a view

- Lexicon entries are unique and have the declared letter counts.
- Place, return, hint, and submit legal states.
- A wrong submission identifies the first mismatch and restores misplaced
  tiles.
- No tile can occupy two slots and no slot can hold two tiles.
- Hints only reveal letters that belong to the target.
- Snapshot round-trip and malformed-state rejection.
