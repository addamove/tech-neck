import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINES } from './config';
import { familyRoutineIds, rememberedRoutines, rememberRoutineSelection, routineFamily } from './routineFamilies';
import { adjacentRoutineId } from '../components/routineSwipe';
import { freshData, parseImport } from './persistence';

test('swipes cycle through Neck, Hands, Eye Gym, Night Stretch and Back Care while retaining the selected neck level', () => {
  for (const direction of [-1, 1] as const) {
    let selected = 'level-2';
    let memory = rememberedRoutines(ROUTINES, selected);
    const visited = [];
    for (let step = 0; step < 5; step++) {
      selected = adjacentRoutineId(familyRoutineIds(ROUTINES, selected, memory), selected, direction);
      visited.push(selected);
      memory = rememberedRoutines(ROUTINES, selected, memory);
    }
    assert.deepEqual(visited, direction === 1 ? ['hands-level-1', 'eye-gym', 'night-stretch', 'back-care', 'level-2'] : ['back-care', 'night-stretch', 'eye-gym', 'hands-level-1', 'level-2']);
  }
});

test('every dropdown level remains selectable and changes its family representative', () => {
  let memory = rememberedRoutines(ROUTINES, 'level-2');
  for (const selected of ROUTINES.map(routine => routine.id)) {
    memory = rememberedRoutines(ROUTINES, selected, memory);
    const ids = familyRoutineIds(ROUTINES, selected, memory);
    assert.equal(ids.length, 5);
    assert.ok(ids.includes(selected));
    const family = routineFamily(ROUTINES.find(item => item.id === selected)!);
    assert.equal(memory[family], selected);
    assert.equal(ids.filter(id => routineFamily(ROUTINES.find(item => item.id === id)!) === family).length, 1);
  }
});

test('invalid or mismatched memories fall back and the selected level overrides older memory', () => {
  assert.deepEqual(rememberedRoutines(ROUTINES, 'hands-level-1', { neck: 'missing', hands: 'level-2' }), { neck: 'level-1', hands: 'hands-level-1', eyes: 'eye-gym', night: 'night-stretch', back: 'back-care' });
  assert.deepEqual(rememberedRoutines(ROUTINES, 'level-2', { neck: 'level-1' }), { neck: 'level-2', hands: 'hands-level-1', eyes: 'eye-gym', night: 'night-stretch', back: 'back-care' });
});

test('legacy backups load and current memories survive export/import with stale entries repaired', () => {
  const data = freshData();
  assert.equal(parseImport(JSON.stringify(data)).settings.rememberedRoutineIds, undefined);
  data.settings.selectedRoutineId = 'hands-level-1';
  data.settings.rememberedRoutineIds = { neck: 'level-2', hands: 'hands-level-1', eyes: 'eye-gym', night: 'night-stretch', back: 'back-care' };
  assert.deepEqual(parseImport(JSON.stringify(data)).settings.rememberedRoutineIds, data.settings.rememberedRoutineIds);
  data.settings.rememberedRoutineIds = { neck: 'hands-level-1', hands: 'level-2', bogus: 'level-1' };
  assert.deepEqual(parseImport(JSON.stringify(data)).settings.rememberedRoutineIds, { neck: 'level-1', hands: 'hands-level-1', eyes: 'eye-gym', night: 'night-stretch', back: 'back-care' });
});

test('the hook selection helper preserves Level 2 on the first swipe after loading a legacy backup', () => {
  const data = freshData();
  data.settings.selectedRoutineId = 'level-2';
  const legacy = parseImport(JSON.stringify(data));
  assert.equal(legacy.settings.rememberedRoutineIds, undefined);
  const memory = rememberRoutineSelection(ROUTINES, legacy.settings.selectedRoutineId, 'hands-level-1', legacy.settings.rememberedRoutineIds);
  const next = adjacentRoutineId(familyRoutineIds(ROUTINES, 'hands-level-1', memory), 'hands-level-1', -1);
  assert.equal(next, 'level-2');
});

test('Eye Gym Level 2 is remembered across family swipes without creating an extra family card', () => {
  let memory = rememberedRoutines(ROUTINES, 'eye-gym-level-2');
  let selected = adjacentRoutineId(familyRoutineIds(ROUTINES, 'eye-gym-level-2', memory), 'eye-gym-level-2', 1);
  assert.equal(selected, 'night-stretch');
  memory = rememberedRoutines(ROUTINES, selected, memory);
  selected = adjacentRoutineId(familyRoutineIds(ROUTINES, selected, memory), selected, -1);
  assert.equal(selected, 'eye-gym-level-2');
  assert.equal(familyRoutineIds(ROUTINES, selected, memory).length, 5);
});

test('Night Stretch levels share one swipe card and retain Level 2 after a round trip', () => {
  let memory = rememberedRoutines(ROUTINES, 'night-stretch-level-2');
  const ids = familyRoutineIds(ROUTINES, 'night-stretch-level-2', memory);
  assert.equal(ids.length, 5);
  assert.equal(ids.filter(id => id.startsWith('night-stretch')).length, 1);
  const next = adjacentRoutineId(ids, 'night-stretch-level-2', 1);
  assert.equal(next, 'back-care');
  memory = rememberedRoutines(ROUTINES, next, memory);
  assert.equal(adjacentRoutineId(familyRoutineIds(ROUTINES, next, memory), next, -1), 'night-stretch-level-2');
  const data = freshData();
  data.settings.selectedRoutineId = 'night-stretch-level-2';
  data.settings.rememberedRoutineIds = memory;
  assert.equal(parseImport(JSON.stringify(data)).settings.rememberedRoutineIds?.night, 'night-stretch-level-2');
});
