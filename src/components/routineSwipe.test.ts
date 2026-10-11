import test from "node:test";
import assert from "node:assert/strict";
import { adjacentRoutineId, routineSwipeDirection } from "./routineSwipe";

test("horizontal swipes choose the next or previous routine while taps and vertical scrolling do not", () => {
  const origin = { x: 150, y: 200 };
  assert.equal(routineSwipeDirection(origin, { x: 75, y: 207 }), 1);
  assert.equal(routineSwipeDirection(origin, { x: 225, y: 207 }), -1);
  assert.equal(routineSwipeDirection(origin, { x: 175, y: 204 }), 0);
  assert.equal(routineSwipeDirection(origin, { x: 225, y: 280 }), 0);
  assert.equal(routineSwipeDirection(origin, { x: 148, y: 290 }), 0);
});

test("routine selection wraps and handles a single or empty catalog", () => {
  assert.equal(adjacentRoutineId(["neck", "hands"], "neck", 1), "hands");
  assert.equal(adjacentRoutineId(["neck", "hands"], "neck", -1), "hands");
  assert.equal(adjacentRoutineId(["neck"], "neck", 1), "neck");
  assert.equal(adjacentRoutineId([], "neck", 1), "neck");
});
