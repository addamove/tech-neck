import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BACK_ROUTINE, BACK_LEVEL_2_ROUTINE } from './backRoutine';
import { getSelectedRoutine, ROUTINES } from './config';
import { advanceSession, completionFor, createSession, getPose, recordCompletion } from './engine';
import { freshData, parseImport } from './persistence';
import { getStats } from './stats';
import { getAchievements } from './achievements';
import { familyRoutineIds, rememberedRoutines } from './routineFamilies';
import { activeVoiceTimeline, dueVoiceCue } from './voiceTiming';
import { BACK_PICTURES } from '../components/BackArt';

test('Back Care has the approved 5/12 active minutes, brochure order and equipment split', () => {
  assert.deepEqual(BACK_ROUTINE.exercises.map(e=>e.id), ['back-warmup','back-figure-four','back-twist','back-prone-reach','back-cat-cow','back-cross-curl','back-side-plank']);
  assert.deepEqual(BACK_LEVEL_2_ROUTINE.exercises.map(e=>e.id), ['back-warmup','back-roller-curl','back-figure-four','back-twist','back-block-curl','back-roller-hinge','back-prone-reach','back-cat-cow','back-cross-curl','back-supported-rest','back-side-plank','back-seated-release']);
  assert.equal(BACK_ROUTINE.exercises.reduce((s,e)=>s+e.durationSeconds,0),300);
  assert.equal(BACK_LEVEL_2_ROUTINE.exercises.reduce((s,e)=>s+e.durationSeconds,0),720);
  assert.equal(BACK_ROUTINE.xp,10); assert.equal(BACK_LEVEL_2_ROUTINE.xp,30);
  assert.equal(BACK_LEVEL_2_ROUTINE.exercises[9].durationSeconds,180);
  assert.equal(BACK_LEVEL_2_ROUTINE.exercises[11].durationSeconds,120);
  for(const routine of [BACK_ROUTINE,BACK_LEVEL_2_ROUTINE]) {
    for(const prep of [5,10,20] as const) {
      const configured=getSelectedRoutine(routine.id,{...freshData().settings,preparationSeconds:prep});
      assert.equal(configured.exercises.reduce((s,e)=>s+e.durationSeconds,0),routine===BACK_ROUTINE?300:720);
      assert.ok(configured.exercises.every(e=>e.prepSeconds===prep));
    }
  }
});

test('both sides get equal time and dynamic movements finish at a complete cycle',()=>{
  for(const exercise of BACK_LEVEL_2_ROUTINE.exercises) {
    const cycle=exercise.poses.reduce((s,p)=>s+p.seconds,0);
    assert.equal(exercise.durationSeconds%cycle,0,exercise.id);
    if(exercise.id==='back-figure-four'||exercise.id==='back-twist') {
      assert.ok(getPose(exercise,24.999).poseId.includes('left'));
      assert.ok(getPose(exercise,25).poseId.includes('right'));
    }
    if(exercise.id==='back-cross-curl'||exercise.id==='back-side-plank') {
      assert.ok(getPose(exercise,19.999).poseId.includes('left'));
      assert.ok(getPose(exercise,20).poseId.includes('right'));
      assert.ok(exercise.cues.some(c=>c.atSeconds===20));
    }
  }
});

test('every Back Care pose has all three compressed styles and both voices fit their cue slots',()=>{
  for(const exercise of BACK_LEVEL_2_ROUTINE.exercises) {
    for(const pose of exercise.poses) for(const style of ['male','female','marker']) {
      const shared=pose.poseId==='back-cat'||pose.poseId==='back-cow';
      const path=shared?`public/art/night/${style}/${pose.poseId.slice(5)}.webp`:`public/art/back/${style}/${BACK_PICTURES[pose.poseId]?.file}.webp`;
      assert.ok(existsSync(path),path);
    }
    for(const voice of ['','male/']) {
      const manifest=JSON.parse(readFileSync(`public/audio/${voice}manifest.json`,'utf8'));
      assert.ok(manifest[exercise.description],`${voice}${exercise.id}`);
      const timeline=activeVoiceTimeline(exercise);
      for(const cue of timeline) {
        const slot=dueVoiceCue(timeline,cue.atSeconds-.001,cue.atSeconds,exercise.durationSeconds)!;
        assert.ok(manifest[cue.text],cue.text);
        assert.ok(manifest[cue.text].duration<=slot.availableSeconds,`${voice}${cue.text}`);
      }
    }
  }
});

test('Back Care XP, completion, disabled exercises and family selection survive backup round trips',()=>{
  const data=freshData();
  const audit=new Date(2026,9,15);
  const records=[BACK_ROUTINE,BACK_LEVEL_2_ROUTINE].map((routine,index)=>{
    const start=new Date(2026,9,14,13,index*30);
    const duration=routine.exercises.reduce((s,e)=>s+e.durationSeconds+e.prepSeconds,0)*1000;
    const finished=advanceSession(createSession(routine,`back-test-${index}`,start),duration,routine);
    assert.equal(finished.phase,'complete');
    return completionFor(finished,routine,new Date(start.getTime()+duration));
  });
  assert.deepEqual(records.map(r=>r.xp),[10,30]);
  data.completions=records;
  data.settings.selectedRoutineId=BACK_LEVEL_2_ROUTINE.id;
  data.settings.disabledExerciseIds={ [BACK_LEVEL_2_ROUTINE.id]:['back-roller-curl'] };
  data.settings.rememberedRoutineIds=rememberedRoutines(ROUTINES,BACK_LEVEL_2_ROUTINE.id);
  const imported=parseImport(JSON.stringify(data));
  assert.equal(getSelectedRoutine(BACK_LEVEL_2_ROUTINE.id,imported.settings).exercises.length,11);
  assert.equal(familyRoutineIds(ROUTINES,BACK_LEVEL_2_ROUTINE.id,imported.settings.rememberedRoutineIds).filter(id=>id.startsWith('back-care')).length,1);
  const deduplicated=recordCompletion(imported.completions,records[1]);
  assert.equal(getStats(deduplicated,audit).totalSessions,2);
  assert.equal(getStats(deduplicated,audit).totalXp,70); // 40 routine XP + First Step's 30.
  assert.equal(getAchievements(deduplicated,audit).find(a=>a.id==='night-unwind')?.unlocked,false);
  assert.equal(getAchievements(deduplicated,audit).find(a=>a.id==='all-three-one-day')?.progress,0);
});
