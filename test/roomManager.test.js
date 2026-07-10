import test from "node:test";
import assert from "node:assert/strict";
import { RoomManager } from "../src/server/roomManager.js";

test("players get unique duplicate names", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");

  const first = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Sam", avatar: "⚡" });
  const second = manager.joinRoom({ socketId: "player-2", roomCode: room.roomCode, name: "Sam", avatar: "🎯" });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.player.name, "Sam");
  assert.equal(second.player.name, "Sam 2");
});

test("first valid server-received buzz wins and answer is hidden from players", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const alpha = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Alpha", avatar: "⚡" }).player;
  const beta = manager.joinRoom({ socketId: "player-2", roomCode: room.roomCode, name: "Beta", avatar: "🎯" }).player;

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.openBuzzing("host-1", room.roomCode);

  const firstBuzz = manager.buzz("player-2", room.roomCode, beta.id);
  const secondBuzz = manager.buzz("player-1", room.roomCode, alpha.id);
  const playerState = manager.playerState(room, alpha.id);

  assert.equal(firstBuzz.ok, true);
  assert.equal(firstBuzz.winner.playerId, beta.id);
  assert.equal(secondBuzz.ok, false);
  assert.equal(playerState.currentQuestion.answer, null);
});

test("host scoring updates points and marks used questions", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "🚀" }).player;

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 1);
  manager.openBuzzing("host-1", room.roomCode);
  manager.buzz("player-1", room.roomCode, player.id);
  manager.markAnswer("host-1", room.roomCode, { isCorrect: true });

  assert.equal(room.players.get(player.id).score, 200);
  assert.equal(room.usedQuestions.has("0-1"), true);
});
