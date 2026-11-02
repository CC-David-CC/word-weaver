import assert from "node:assert/strict";
import test from "node:test";
import {WordWeaverSession} from "../model.mjs";

function solve(session) {
  while (session.phase !== "done") {
    const word = session.word;
    for (let slot = 0; slot < word.length; slot++) {
      const tile = session.tiles.find(candidate => candidate.placedAt === null && candidate.letter === word[slot]);
      session.place(tile.id, slot);
    }
    assert.equal(session.submit().correct, true);
  }
}

test("place, return, and hint cannot duplicate or overwrite tiles", () => {
  const session = new WordWeaverSession("tiles");
  const tile = session.tiles[0];
  session.place(tile.id, 0);
  assert.throws(() => session.place(tile.id, 1));
  assert.throws(() => session.place(session.tiles[1].id, 0));
  session.returnTile(tile.id);
  session.place(session.tiles[1].id, 0);
  const hint = session.hint();
  assert.equal(hint.letter, session.word[hint.slot]);
  assert.throws(() => session.place(session.tiles.find(value => value.id !== session.tiles[1].id).id, hint.slot));
});

test("wrong submissions locate the first mismatch and restore placements", () => {
  const session = new WordWeaverSession("mistake");
  const wrongSlot = session.word.length - 1;
  for (let slot = 0; slot < session.word.length; slot++) {
    const desired = slot === wrongSlot ? session.word[slot] === "a" ? "e" : "a" : session.word[slot];
    const tile = session.tiles.find(candidate => candidate.placedAt === null && candidate.letter === desired) ??
      session.tiles.find(candidate => candidate.placedAt === null);
    session.place(tile.id, slot);
  }
  const result = session.submit();
  if (!result.correct) {
    assert.equal(result.mismatch, wrongSlot);
    assert.equal(session.slots.every(value => value === null), true);
    assert.equal(session.tiles.every(tile => tile.placedAt === null), true);
  }
});

test("a complete session advances once and preserves score", () => {
  const session = new WordWeaverSession("complete-words");
  solve(session);
  assert.equal(session.phase, "done");
  assert.ok(session.score > 0);
  assert.throws(() => session.submit());
});

test("seeded sessions and snapshots restore exact tiles", () => {
  const one = new WordWeaverSession("repeat-word");
  const two = new WordWeaverSession("repeat-word");
  assert.deepEqual(one.state, two.state);
  one.hint();
  two.hint();
  const restored = WordWeaverSession.fromSave(two.encodeSave());
  assert.deepEqual(restored.state, two.state);
  sessionPlaceAndSubmit(restored);
});

function sessionPlaceAndSubmit(session) {
  const word = session.word;
  for (let slot = 0; slot < word.length; slot++) {
    if (session.revealed[slot] !== null) continue;
    const tile = session.tiles.find(candidate => candidate.placedAt === null && candidate.letter === word[slot]);
    session.place(tile.id, slot);
  }
  assert.equal(session.submit().correct, true);
}

test("malformed placements, revealed letters, and unknown words are rejected", () => {
  const session = new WordWeaverSession("invalid-words");
  const valid = JSON.parse(session.encodeSave());
  for (const mutate of [
    value => { value.payload.words[0].spelling = "qzx"; },
    value => { value.payload.slots[0] = "missing"; },
    value => { value.payload.revealed[0] = "z"; },
    value => { value.payload.index = 8; },
  ]) {
    const broken = structuredClone(valid);
    mutate(broken);
    assert.throws(() => WordWeaverSession.fromSave(JSON.stringify(broken)));
  }
});
