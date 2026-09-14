import test from 'node:test';
import assert from 'node:assert/strict';
import {newBoard, boardPublic, mutateBoard} from '../lib/board.mjs';

test('board accepts explicit open/close states and retries do not toggle twice', () => {
  const board = newBoard('ABCDEF', 1);
  board.tiles[0].text = 'คำตอบ';
  const set = opened => mutateBoard(board, 'boardOpen', {tile: 1, opened}, {role: 'player'}, 2);
  set(true);
  set(true);
  assert.equal(board.public.openedCount, 1);
  assert.equal(board.public.tiles[0].text, 'คำตอบ');
  set(false);
  set(false);
  assert.equal(board.public.openedCount, 0);
  assert.deepEqual(boardPublic(board).tiles[0], {id: 1, opened: false});
  assert.equal(board.tiles[0].text, 'คำตอบ');
});

test('legacy board clients still toggle once per click and invalid tiles are rejected', () => {
  const board = newBoard('ABCDEF', 1);
  for (const expected of [true, false, true]) {
    mutateBoard(board, 'boardOpen', {tile: 2}, {role: 'player'}, 2);
    assert.equal(board.tiles[1].opened, expected);
  }
  assert.throws(() => mutateBoard(board, 'boardOpen', {tile: 0, opened: true}, {role: 'player'}, 2));
});
