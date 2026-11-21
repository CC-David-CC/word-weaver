import assert from "node:assert/strict";
import test from "node:test";
import {computeLayout} from "../layout.mjs";
import {mount} from "../index.mjs";

test("computeLayout adapts smoothly across mobile, 1080p, and 4k tiers", () => {
  // Mobile / Phone
  const mobile = computeLayout(400, 700, 2);
  assert.equal(mobile.tier, "phone");
  assert.equal(mobile.isPhone, true);
  assert.equal(mobile.is4K, false);
  assert.ok(mobile.minTouchTarget >= 44);
  assert.equal(mobile.targetBufferW, 800);
  assert.equal(mobile.targetBufferH, 1400);

  // 1080p Desktop
  const desktop = computeLayout(1920, 1080, 1);
  assert.equal(desktop.tier, "desktop");
  assert.equal(desktop.isPhone, false);
  assert.equal(desktop.is4K, false);
  assert.equal(desktop.targetBufferW, 1920);
  assert.equal(desktop.targetBufferH, 1080);

  // 4K UHD
  const uhd = computeLayout(3840, 2160, 2);
  assert.equal(uhd.tier, "4k");
  assert.equal(uhd.isPhone, false);
  assert.equal(uhd.is4K, true);
  assert.ok(uhd.minTouchTarget >= 56);
  assert.equal(uhd.targetBufferW, 7680);
  assert.equal(uhd.targetBufferH, 4320);
});

test("mount contract returns element and disposes cleanly", () => {
  const host = {
    signal: new AbortController().signal,
    storage: {
      signedInSubject: () => "tester",
      mirrorFileContext: async () => ({
        valid: () => true,
        files: { read: async () => ({}), write: async () => ({}) }
      })
    }
  };

  const instance = mount(host);
  assert.ok(instance.element);
  assert.equal(instance.element.className, "word-weaver-app");
  assert.ok(instance.session);
  assert.ok(instance.session.word);

  instance.dispose();
  assert.equal(instance.element.children.length, 0);
});
