import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {newMonopoly,mutateMonopoly,monopolyPublic,normalize} from '../lib/monopoly.mjs';
const admin={role:'admin'};
test('existing rooms gain ten image questions once, preserving progress and local assets',()=>{
  const g=newMonopoly('MIGRAT',0);
  g.questionBank=g.questionBank.filter(q=>!q.image);delete g.humanAiQuestionsVersion;
  g.questionOrder=g.questionBank.map(q=>q.id);g.questionCursor=4;
  g.players.team0.position=8;g.players.team0.points=150;g.turn=2;
  normalize(g);normalize(g);
  assert.equal(g.questionBank.length,40);assert.equal(g.questionOrder.length,40);
  assert.equal(g.questionCursor,4);assert.equal(g.turn,2);
  assert.equal(g.players.team0.position,8);assert.equal(g.players.team0.points,150);
  for(const q of g.questionBank.filter(q=>q.image))assert.ok(existsSync(new URL('..'+q.image,import.meta.url)),q.image);
  const count=g.questionBank.find(q=>q.id==='human-ai-q25');
  assert.equal(count.type,'image-count');assert.equal(count.answer,5);
  g.lastRoll={id:'image-round',phase:'question',question:count};
  const publicQuestion=monopolyPublic(g).lastRoll.question;
  assert.equal(publicQuestion.answer,undefined);assert.equal(publicQuestion.explanation,undefined);
  assert.ok(publicQuestion.image);
});
test('AI starter bank has 40 valid questions and new rooms can roll immediately',()=>{
  const g=newMonopoly('START1',0);
  assert.equal(g.questionBank.length,40);
  assert.equal(new Set(g.questionBank.map(q=>q.id)).size,40);
  assert.deepEqual(new Set(g.questionBank.map(q=>q.type)),new Set(['choice','boolean','number','image-count']));
  for(const q of g.questionBank){
    assert.ok(q.title&&q.seconds>=5&&q.seconds<=30);
    if(q.type==='choice')assert.ok(q.options.length>=2&&q.options.length<=4&&q.correct>=0&&q.correct<q.options.length);
    else assert.equal(typeof q.answer,q.type==='boolean'?'boolean':'number');
  }
  mutateMonopoly(g,'monopolyRoll',{}, {},1);
  assert.ok(g.lastRoll.question);assertFirebaseSafe(g);
});
test('empty legacy rooms receive starter questions without replacing custom banks',()=>{
  const g=newMonopoly('OLD123',0);g.questionBank=[];delete g.questionsConfigured;
  normalize(g);assert.equal(g.questionBank.length,40);
  const ids=g.questionBank.map(q=>q.id);normalize(g);assert.deepEqual(g.questionBank.map(q=>q.id),ids);
  g.questionBank=[{id:'custom',type:'number',title:'ของผู้สอน',answer:1,seconds:10}];
  normalize(g);assert.equal(g.questionBank[0].id,'custom');assert.equal(g.questionBank.length,1);
});
function assertFirebaseSafe(value,path='game'){
  assert.notEqual(value,undefined,`${path} must not contain undefined`);
  if(value&&typeof value==='object')for(const [key,child] of Object.entries(value))assertFirebaseSafe(child,`${path}.${key}`);
}
test('roll, automatic question and first answer survive Firebase empty-field removal',()=>{
  const g=game();g.questionBank=[g.questionBank[0]];
  const member=join(g,'mobile','team0');
  mutateMonopoly(g,'monopolyRoll',{}, {},100);
  assertFirebaseSafe(g);
  assert.equal(Object.hasOwn(g.public.lastRoll,'answers'),false);
  const r=g.lastRoll;
  mutateMonopoly(g,'monopolyTick',{}, {},r.readyAt-1);
  assert.equal(r.phase,'landing');
  mutateMonopoly(g,'monopolyTick',{}, {},r.readyAt);
  assert.equal(r.phase,'question');
  delete r.answers; // Realtime Database does not preserve empty objects.
  mutateMonopoly(g,'monopolyAnswer',{roundId:r.id,choice:0},member,r.readyAt+200);
  assert.equal(r.answers.mobile.correct,true);
  assertFirebaseSafe(g);
  mutateMonopoly(g,'monopolyTick',{}, {},r.deadline);
  assert.equal(r.phase,'resolved');assert.equal(g.turn,1);assertFirebaseSafe(g);
});
test('empty question bank reports a useful error without moving a pawn',()=>{
  const g=newMonopoly('EMPTY1',0);g.questionBank=[];
  assert.throws(()=>mutateMonopoly(g,'monopolyRoll',{}, {},100),/ยังไม่มีคำถาม/);
  assert.equal(g.players.team0.position,1);assert.equal(g.lastRoll,undefined);
});
test('reset starts a new session and removes every prior participant',()=>{
  const g=game();
  const first=join(g,'nat','team0');
  const second=join(g,'may','team1');
  g.players.team0.position=9;g.players.team0.points=230;g.participants.nat.score=150;
  mutateMonopoly(g,'monopolyReset',{},admin,100);
  assert.deepEqual(g.participants,{});
  assert.equal(g.players.team0.position,1);assert.equal(g.players.team0.points,0);
  assert.equal(g.public.participantCount,0);assert.equal(g.public.players[0].members,0);
  assert.throws(()=>mutateMonopoly(g,'monopolyAnswer',{roundId:'none'},first,101),/รอบนี้สิ้นสุดแล้ว/);
  assert.ok(second);
});
function game(){const g=newMonopoly('ABC123',0);g.questionBank=[{id:'q1',type:'choice',title:'เลือก',options:['ใช่','ไม่'],correct:0,seconds:10},{id:'q2',type:'number',title:'นับ',answer:7,seconds:10}];return g;}
function join(g,id,teamId,at=0){mutateMonopoly(g,'monopolyJoin',{name:id,teamId},{id,role:'player'},at);return {id,role:'player'};}
test('new games use 30 forward-only spaces and five teams',()=>{const g=game();assert.equal(g.spaces.length,30);assert.equal(g.boardLength,30);assert.equal(Object.keys(g.players).length,5);});
test('public games always expose default projector rules',()=>{const g=game();delete g.rules;assert.match(monopolyPublic(g).rules,/ผลัดกันทอยลูกเต๋า/);});
test('public board includes a custom space label and activity text',()=>{const g=game();g.spaces[3]={...g.spaces[3],title:'Dance Challenge',text:'ออกมาเต้น 10 วินาที'};const space=monopolyPublic(g).spaces[3];assert.equal(space.title,'Dance Challenge');assert.equal(space.text,'ออกมาเต้น 10 วินาที');});
test('admin can save rules for the projector and the public game exposes them',()=>{const g=game();mutateMonopoly(g,'monopolySave',{title:g.title,rules:'ข้อแรก\nข้อสอง',boardLength:30,spaces:g.spaces,questions:g.questionBank,teams:Object.values(g.players)},admin,1);assert.equal(g.rules,'ข้อแรก\nข้อสอง');assert.equal(monopolyPublic(g).rules,'ข้อแรก\nข้อสอง');});
test('rolling twice is blocked until the question turn resolves',()=>{const g=game();mutateMonopoly(g,'monopolyRoll',{}, {},1);assert.throws(()=>mutateMonopoly(g,'monopolyRoll',{}, {},2));});
test('all teams can answer and the fastest correct team gets one bonus space',()=>{const g=game();g.questionBank=[g.questionBank[0]];const green=join(g,'green','team1');const red=join(g,'red','team0');mutateMonopoly(g,'monopolyRoll',{}, {},1);const r=g.lastRoll;mutateMonopoly(g,'monopolyTick',{}, {},r.readyAt);assert.equal(r.phase,'question');const before=g.players.team0.position;const fast=mutateMonopoly(g,'monopolyAnswer',{roundId:r.id,choice:0},red,r.readyAt+200);const slow=mutateMonopoly(g,'monopolyAnswer',{roundId:r.id,choice:0},green,r.readyAt+1000);assert.ok(slow.answer.score<fast.answer.score);mutateMonopoly(g,'monopolyTick',{}, {},r.deadline);assert.equal(g.lastRoll.phase,'resolved');assert.equal(g.players.team0.position,Math.min(30,before+1));assert.equal(g.lastRoll.hero.name,'red');});
test('wrong answers do not move teams and timeout ends the turn',()=>{const g=game();const player=join(g,'wrong','team0');mutateMonopoly(g,'monopolyRoll',{}, {},1);const r=g.lastRoll;mutateMonopoly(g,'monopolyTick',{}, {},r.readyAt);const pos=g.players.team0.position;mutateMonopoly(g,'monopolyAnswer',{roundId:r.id,choice:1},player,r.readyAt+200);mutateMonopoly(g,'monopolyTick',{}, {},r.deadline);assert.equal(g.lastRoll.correct,false);assert.equal(g.players.team0.position,pos);assert.equal(g.turn,1);});
test('question bank is shuffled and public state never leaks answer keys',()=>{const g=game();mutateMonopoly(g,'monopolyRoll',{}, {},1);const pub=monopolyPublic(g);assert.equal(pub.lastRoll.question.correct,undefined);assert.equal(pub.lastRoll.question.answer,undefined);});
test('admin saves typed question formats and board length',()=>{const g=newMonopoly('ABC123',0);mutateMonopoly(g,'monopolySave',{title:'ใหม่',boardLength:24,spaces:Array.from({length:24},()=>({title:'ช่อง'})),questions:[{type:'choice',title:'เลือก',options:['ก','ข','ค','ง'],correct:2,seconds:5},{type:'image-count',title:'นับจุด',answer:7,seconds:15,image:'https://example.com/x.png'}],teams:[{id:'a',name:'ทีม A'}]},admin,1);assert.equal(g.boardLength,24);assert.equal(g.questionBank.length,2);assert.equal(g.questionBank[1].answer,7);});
