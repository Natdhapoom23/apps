import test from 'node:test';
import assert from 'node:assert/strict';
import {newMonopoly,monopolyPublic,mutateMonopoly} from '../lib/monopoly.mjs';
test('empty Firebase room can load, join, roll and reset',()=>{
 const room=newMonopoly('ABC123',1000);delete room.players;delete room.lastRoll;
 assert.deepEqual(monopolyPublic(room).players,[]);
 assert.equal(monopolyPublic(room).lastRoll,null);
 const joined=mutateMonopoly(room,'monopolyJoin',{name:'ทดสอบ'},{},2000);
 assert.equal(room.public.players.length,1);
 mutateMonopoly(room,'monopolyRoll',{playerId:joined.playerId},{},3000);
 assert.ok(room.lastRoll.roll>=1&&room.lastRoll.roll<=6);
 mutateMonopoly(room,'monopolyReset',{}, {role:'admin'},4000);
 assert.equal(room.players[joined.playerId].position,1);
});
test('finish declares first winner, stops rolls and reset starts a fresh race',()=>{
 const g=newMonopoly('ABC123',1);
 mutateMonopoly(g,'monopolyJoin',{name:'ทีม A',playerId:'a'},{},2);
 g.players.a.position=25;
 mutateMonopoly(g,'monopolyRoll',{playerId:'a'},{},3);
 assert.equal(g.winner.id,'a');assert.equal(g.players.a.position,1);
 assert.equal(g.lastRoll.steps,1);
 assert.throws(()=>mutateMonopoly(g,'monopolyRoll',{playerId:'a'},{},4),/เกมจบแล้ว/);
 mutateMonopoly(g,'monopolyReset',{}, {role:'admin'},5);
 assert.equal(g.winner,null);assert.equal(g.players.a.progress,0);
});
