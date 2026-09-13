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
