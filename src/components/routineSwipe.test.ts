import test from "node:test";
import assert from "node:assert/strict";
import { adjacentRoutineId, carouselDestination, carouselDragOffset, routineCarouselDirection, routineSwipeDirection } from "./routineSwipe";

test("horizontal swipes choose the next or previous routine while taps and vertical scrolling do not", () => {
  const origin = { x: 150, y: 200 };
  assert.equal(routineSwipeDirection(origin, { x: 75, y: 207 }), 1);
  assert.equal(routineSwipeDirection(origin, { x: 225, y: 207 }), -1);
  assert.equal(routineSwipeDirection(origin, { x: 175, y: 204 }), 0);
  assert.equal(routineSwipeDirection(origin, { x: 225, y: 280 }), 0);
  assert.equal(routineSwipeDirection(origin, { x: 148, y: 290 }), 0);
});

test("carousel drag follows the pointer proportionally and stops at one adjacent card", () => {
  assert.equal(carouselDragOffset(-128, 320), -128);
  assert.equal(carouselDragOffset(128, 320), 128);
  assert.equal(carouselDragOffset(-700, 320), -320);
  assert.equal(carouselDragOffset(700, 320), 320);
});

test("carousel release accepts a quarter-width drag or deliberate flick, but rejects small drags and vertical scrolling", () => {
  const start = { x: 200, y: 200 };
  assert.equal(routineCarouselDirection(start, { x: 72, y: 205 }, 320, 900), 1);
  assert.equal(routineCarouselDirection(start, { x: 280, y: 200 }, 320, 900), -1);
  assert.equal(routineCarouselDirection(start, { x: 250, y: 200 }, 320, 900), 0);
  assert.equal(routineCarouselDirection(start, { x: 250, y: 205 }, 320, 70), -1);
  assert.equal(routineCarouselDirection(start, { x: 220, y: 200 }, 320, 20), 0);
  assert.equal(routineCarouselDirection(start, { x: 100, y: 290 }, 320, 90), 0);
  assert.equal(routineCarouselDirection(start, { x: 100, y: 200 }, 0, 90), 0);
});

test("routine selection wraps and handles a single or empty catalog", () => {
  assert.equal(adjacentRoutineId(["neck", "hands"], "neck", 1), "hands");
  assert.equal(adjacentRoutineId(["neck", "hands"], "neck", -1), "hands");
  assert.equal(adjacentRoutineId(["neck"], "neck", 1), "neck");
  assert.equal(adjacentRoutineId([], "neck", 1), "neck");
});

test("cancellation snaps back without changing selection and reduced motion settles immediately", () => {
  const ids = ['neck', 'hands'];
  assert.deepEqual(carouselDestination(ids, 'neck', 0, 320, false), { targetId: 'neck', offset: -0, animate: true });
  assert.deepEqual(carouselDestination(ids, 'neck', 1, 320, true), { targetId: 'hands', offset: 0, animate: false });
  assert.deepEqual(carouselDestination(ids, 'hands', -1, 0, false), { targetId: 'neck', offset: 0, animate: false });
});

test("chevrons and accepted drag releases share the same adjacent-card destination", () => {
  const direction = routineCarouselDirection({ x: 200, y: 0 }, { x: 72, y: 0 }, 320, 900);
  assert.deepEqual(carouselDestination(['neck', 'hands'], 'neck', direction, 320, false), carouselDestination(['neck', 'hands'], 'neck', 1, 320, false));
});
