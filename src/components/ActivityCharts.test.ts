import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ActivityCharts from './ActivityCharts';
import { getActivityCharts } from '../core/activityCharts';
import type { Completion } from '../core/types';

test('locked charts explain the 100 XP requirement without rendering plots', () => {
  const html = renderToStaticMarkup(createElement(ActivityCharts, { data: getActivityCharts([], new Date(2026, 9, 13)) }));
  assert.match(html, /Charts unlock at 100 XP/);
  assert.match(html, /100 XP to go/);
  assert.doesNotMatch(html, /role="img"/);
});

test('earned XP renders an accessible cumulative plot and day-by-day values', () => {
  const completion: Completion = { id: 'first', routineId: 'eye-gym', startedAt: '2026-10-12T11:00:00.000Z', completedAt: '2026-10-12T12:00:00.000Z', elapsedMs: 240000, xp: 5, skippedExerciseIds: [], completedExerciseIds: ['eye-blinks', 'eye-distance', 'eye-circles', 'eye-palming'] };
  const now = new Date('2026-10-13T12:00:00.000Z');
  const first = getActivityCharts([completion], now);
  assert.equal(first.totalXp, 35);
  assert.equal(first.eligible, false);
  const records = [completion, { ...completion, id: 'second', completedAt: '2026-10-12T13:00:00.000Z' }, { ...completion, id: 'third', completedAt: '2026-10-12T14:00:00.000Z' }];
  const html = renderToStaticMarkup(createElement(ActivityCharts, { data: getActivityCharts(records, now) }));
  assert.match(html, /Cumulative XP over time/);
  assert.match(html, /145 XP total/);
  assert.match(html, /View XP by day/);
  assert.match(html, /\+145/);
  assert.match(html, /Flat sections represent days without new XP/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
