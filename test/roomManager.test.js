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

test("duplicate name suffixes stay within the display name limit", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const longName = "ABCDEFGHIJKLMNOPQRSTUVWX";

  const first = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: longName, avatar: "x" });
  const second = manager.joinRoom({ socketId: "player-2", roomCode: room.roomCode, name: longName, avatar: "x" });

  assert.equal(first.player.name.length, 24);
  assert.equal(second.player.name.length, 24);
  assert.equal(second.player.name.endsWith(" 2"), true);
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

test("display state hides unrevealed answers until the host reveals them", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" });

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);

  const hostState = manager.hostState(room);
  const displayBeforeReveal = manager.displayState(room);

  assert.equal(hostState.currentQuestion.answer, room.currentQuestion.answer);
  assert.equal(displayBeforeReveal.currentQuestion.answer, null);

  manager.revealAnswer("host-1", room.roomCode);

  const displayAfterReveal = manager.displayState(room);
  assert.equal(displayAfterReveal.currentQuestion.answer, room.currentQuestion.answer);
});

test("room states include connected display clients", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");

  const result = manager.bindDisplay("display-1", room.roomCode);
  const states = manager.roomStates(room);

  assert.equal(result.ok, true);
  assert.equal(states.displays.length, 1);
  assert.equal(states.displays[0].socketId, "display-1");
  assert.equal(states.displays[0].state.role, "display");
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

test("player reconnect requires the private player token", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Alpha", avatar: "x" }).player;

  const missingToken = manager.joinRoom({
    socketId: "attacker",
    roomCode: room.roomCode,
    name: "Alpha",
    avatar: "x",
    previousPlayerId: player.id
  });
  const wrongToken = manager.joinRoom({
    socketId: "attacker",
    roomCode: room.roomCode,
    name: "Alpha",
    avatar: "x",
    previousPlayerId: player.id,
    playerToken: "wrong"
  });
  const reconnected = manager.joinRoom({
    socketId: "player-2",
    roomCode: room.roomCode,
    name: "Alpha",
    avatar: "x",
    previousPlayerId: player.id,
    playerToken: player.token
  });

  assert.equal(missingToken.ok, false);
  assert.equal(wrongToken.ok, false);
  assert.equal(reconnected.ok, true);
  assert.equal(room.players.get(player.id).socketId, "player-2");
});

test("stale disconnect after reconnect does not disconnect the active player", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Alpha", avatar: "x" }).player;

  manager.joinRoom({
    socketId: "player-2",
    roomCode: room.roomCode,
    name: "Alpha",
    avatar: "x",
    previousPlayerId: player.id,
    playerToken: player.token
  });
  manager.handleDisconnect("player-1");

  assert.equal(room.players.get(player.id).connected, true);
  assert.equal(room.players.get(player.id).socketId, "player-2");
});

test("correct answers can only be scored once", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" }).player;

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.openBuzzing("host-1", room.roomCode);
  manager.buzz("player-1", room.roomCode, player.id);
  manager.markAnswer("host-1", room.roomCode, { isCorrect: true });

  assert.throws(() => manager.markAnswer("host-1", room.roomCode, { isCorrect: true }), /already been scored/);
  assert.equal(room.players.get(player.id).score, 100);
});

test("finished games reject later gameplay mutations", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" }).player;

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.openBuzzing("host-1", room.roomCode);
  manager.buzz("player-1", room.roomCode, player.id);
  manager.endGame("host-1", room.roomCode);

  assert.throws(() => manager.markAnswer("host-1", room.roomCode, { isCorrect: true }), /ended/);
  assert.throws(() => manager.reopenBuzzing("host-1", room.roomCode), /ended/);
  assert.equal(room.gameStatus, "finished");
  assert.equal(room.players.get(player.id).score, 0);
});

test("revealed answers cannot be opened for buzzing", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" });

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.revealAnswer("host-1", room.roomCode);

  assert.throws(() => manager.openBuzzing("host-1", room.roomCode), /answer is revealed/);
  assert.throws(() => manager.reopenBuzzing("host-1", room.roomCode), /answer is revealed/);
});

test("late joiners cannot buzz on an already active question", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Original", avatar: "x" });

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.openBuzzing("host-1", room.roomCode);
  const late = manager.joinRoom({ socketId: "player-2", roomCode: room.roomCode, name: "Late", avatar: "x" }).player;

  assert.equal(manager.playerState(room, late.id).canBuzz, false);
  assert.equal(manager.buzz("player-2", room.roomCode, late.id).ok, false);
});

test("returning to the board does not consume an unscored unrevealed question", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" });

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 1, 2);
  manager.returnToBoard("host-1", room.roomCode);

  assert.equal(room.usedQuestions.has("1-2"), false);
  assert.doesNotThrow(() => manager.selectQuestion("host-1", room.roomCode, 1, 2));
});

test("removing the active buzzer clears stale buzzer state", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" }).player;

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.openBuzzing("host-1", room.roomCode);
  manager.buzz("player-1", room.roomCode, player.id);
  manager.removePlayer("host-1", room.roomCode, player.id);

  assert.equal(room.currentBuzzer, null);
  assert.throws(() => manager.markAnswer("host-1", room.roomCode, { isCorrect: true }), /No buzzer/);
});

test("disconnected empty rooms can be cleaned up", () => {
  const manager = new RoomManager({ roomTtlMs: 1000, emptyRoomTtlMs: 100 });
  const { room } = manager.createRoom("host-1");
  manager.handleDisconnect("host-1");

  const removed = manager.cleanupExpiredRooms(room.updatedAt + 101);

  assert.deepEqual(removed, [room.roomCode]);
  assert.equal(manager.getRoom(room.roomCode), undefined);
});

test("existing players can reconnect to a finished game", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" }).player;

  manager.startGame("host-1", room.roomCode);
  manager.endGame("host-1", room.roomCode);
  manager.handleDisconnect("player-1");
  const result = manager.joinRoom({
    socketId: "player-2",
    roomCode: room.roomCode,
    name: "Casey",
    avatar: "x",
    previousPlayerId: player.id,
    playerToken: player.token
  });

  assert.equal(result.ok, true);
  assert.equal(room.players.get(player.id).connected, true);
});

test("returning after an incorrect answer consumes the attempted question", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" }).player;

  manager.updateSettings("host-1", room.roomCode, { deductOnWrong: true });
  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.openBuzzing("host-1", room.roomCode);
  manager.buzz("player-1", room.roomCode, player.id);
  manager.markAnswer("host-1", room.roomCode, { isCorrect: false });
  manager.returnToBoard("host-1", room.roomCode);

  assert.equal(room.players.get(player.id).score, -100);
  assert.equal(room.usedQuestions.has("0-0"), true);
  assert.throws(() => manager.selectQuestion("host-1", room.roomCode, 0, 0), /already been used/);
});

test("buzzing closes when the only eligible player disconnects", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" });

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.openBuzzing("host-1", room.roomCode);
  manager.handleDisconnect("player-1");

  assert.equal(room.gameStatus, "question_active");
});

test("removed players and expired rooms clear buzz rate entries", () => {
  const manager = new RoomManager({ roomTtlMs: 1000, emptyRoomTtlMs: 100 });
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" }).player;

  manager.startGame("host-1", room.roomCode);
  manager.selectQuestion("host-1", room.roomCode, 0, 0);
  manager.openBuzzing("host-1", room.roomCode);
  manager.buzz("player-1", room.roomCode, player.id);
  assert.equal(manager.buzzRate.has(player.id), true);

  manager.removePlayer("host-1", room.roomCode, player.id);
  assert.equal(manager.buzzRate.has(player.id), false);

  const second = manager.joinRoom({ socketId: "player-2", roomCode: room.roomCode, name: "Riley", avatar: "x" }).player;
  manager.buzzRate.set(second.id, [room.updatedAt]);
  manager.handleDisconnect("host-1");
  manager.handleDisconnect("player-2");
  manager.cleanupExpiredRooms(room.updatedAt + 101);
  assert.equal(manager.buzzRate.has(second.id), false);
});

test("blank manual scores are rejected", () => {
  const manager = new RoomManager();
  const { room } = manager.createRoom("host-1");
  const player = manager.joinRoom({ socketId: "player-1", roomCode: room.roomCode, name: "Casey", avatar: "x" }).player;

  assert.throws(() => manager.updateScore("host-1", room.roomCode, player.id, ""), /Score must be a number/);
  assert.equal(room.players.get(player.id).score, 0);
});
