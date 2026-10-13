import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINES } from './config';
import { familyRoutineIds, rememberedRoutines, rememberRoutineSelection, routineFamily } from './routineFamilies';
import { adjacentRoutineId } from '../components/routineSwipe';
import { freshData, parseImport } from './persistence';

test('swipes cycle through Neck, Hands and Eye Gym while retaining the selected neck level', () => {
  for (const direction of [-1, 1] as const) {
    let selected = 'level-2';
    let memory = rememberedRoutines(ROUTINES, selected);
    const visited = [];
    for (let step = 0; step < 3; step++) {
      selected = adjacentRoutineId(familyRoutineIds(ROUTINES, selected, memory), selected, direction);
      visited.push(selected);
      memory = rememberedRoutines(ROUTINES, selected, memory);
    }
    assert.deepEqual(visited, direction === 1 ? ['hands-level-1', 'eye-gym', 'level-2'] : ['eye-gym', 'hands-level-1', 'level-2']);
  }
});

test('every dropdown level remains selectable and changes its family representative', () => {
  let memory = rememberedRoutines(ROUTINES, 'level-2');
  for (const selected of ['hands-level-1', 'eye-gym', 'level-1', 'level-2']) {
    memory = rememberedRoutines(ROUTINES, selected, memory);
    const ids = familyRoutineIds(ROUTINES, selected, memory);
    assert.equal(ids.length, 3);
    assert.ok(ids.includes(selected));
    const family = routineFamily(ROUTINES.find(item => item.id === selected)!);
    assert.equal(memory[family], selected);
    assert.equal(ids.filter(id => routineFamily(ROUTINES.find(item => item.id === id)!) === family).length, 1);
  }
});

test('invalid or mismatched memories fall back and the selected level overrides older memory', () => {
  assert.deepEqual(rememberedRoutines(ROUTINES, 'hands-level-1', { neck: 'missing', hands: 'level-2' }), { neck: 'level-1', hands: 'hands-level-1', eyes: 'eye-gym' });
  assert.deepEqual(rememberedRoutines(ROUTINES, 'level-2', { neck: 'level-1' }), { neck: 'level-2', hands: 'hands-level-1', eyes: 'eye-gym' });
});

test('legacy backups load and current memories survive export/import with stale entries repaired', () => {
  const data = freshData();
  assert.equal(parseImport(JSON.stringify(data)).settings.rememberedRoutineIds, undefined);
  data.settings.selectedRoutineId = 'hands-level-1';
  data.settings.rememberedRoutineIds = { neck: 'level-2', hands: 'hands-level-1', eyes: 'eye-gym' };
  assert.deepEqual(parseImport(JSON.stringify(data)).settings.rememberedRoutineIds, data.settings.rememberedRoutineIds);
  data.settings.rememberedRoutineIds = { neck: 'hands-level-1', hands: 'level-2', bogus: 'level-1' };
  assert.deepEqual(parseImport(JSON.stringify(data)).settings.rememberedRoutineIds, { neck: 'level-1', hands: 'hands-level-1', eyes: 'eye-gym' });
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
