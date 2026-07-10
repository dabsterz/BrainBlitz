import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_CONFIG } from "../config.js";
import { createRoomCode } from "../utils/roomCode.js";
import { sanitizeAvatar, sanitizePlayerName, sanitizeRoomCode } from "../utils/validation.js";
import { rankPlayers, scoreDeltaForAnswer } from "../utils/scoring.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, "../data/sampleQuestions.json");

function loadBoard() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  return data.categories.map((category, categoryIndex) => ({
    id: `cat-${categoryIndex}`,
    name: category.name,
    questions: category.questions.map((question, questionIndex) => ({
      id: `${categoryIndex}-${questionIndex}`,
      value: Number(question.value),
      question: question.question,
      answer: question.answer
    }))
  }));
}

function now() {
  return Date.now();
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    score: player.score,
    connected: player.connected,
    answerStatus: player.answerStatus
  };
}

function sanitizeBoardForClient(board, usedQuestions) {
  return board.map((category, categoryIndex) => ({
    id: category.id,
    name: category.name,
    questions: category.questions.map((question, questionIndex) => ({
      id: question.id,
      value: question.value,
      used: usedQuestions.has(`${categoryIndex}-${questionIndex}`)
    }))
  }));
}

function sanitizeCurrentQuestion(question, role) {
  if (!question) return null;

  return {
    id: question.id,
    categoryIndex: question.categoryIndex,
    questionIndex: question.questionIndex,
    category: question.category,
    value: question.value,
    question: question.question,
    answer: role === "host" || question.answerRevealed ? question.answer : null,
    answerRevealed: question.answerRevealed
  };
}

function makeRoom(roomCode, hostSocketId) {
  return {
    roomCode,
    host: {
      socketId: hostSocketId,
      token: crypto.randomUUID(),
      connected: true
    },
    players: new Map(),
    gameStatus: "lobby",
    allowJoining: true,
    board: loadBoard(),
    usedQuestions: new Set(),
    currentQuestion: null,
    currentBuzzer: null,
    buzzHistory: [],
    disqualifiedPlayerIds: new Set(),
    recentScoreChanges: [],
    settings: {
      maxPlayers: APP_CONFIG.maxPlayers,
      deductOnWrong: APP_CONFIG.defaultDeductOnWrong
    },
    createdAt: now(),
    updatedAt: now()
  };
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.socketRooms = new Map();
    this.buzzRate = new Map();
  }

  createRoom(hostSocketId) {
    const roomCode = createRoomCode(new Set(this.rooms.keys()));
    const room = makeRoom(roomCode, hostSocketId);
    this.rooms.set(roomCode, room);
    this.socketRooms.set(hostSocketId, { roomCode, role: "host" });
    return { room, hostToken: room.host.token };
  }

  getRoom(roomCode) {
    return this.rooms.get(sanitizeRoomCode(roomCode));
  }

  bindHost(socketId, roomCode, hostToken) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, error: "Room not found." };
    if (room.host.token !== hostToken) return { ok: false, error: "Only the original host can control this room." };

    room.host.socketId = socketId;
    room.host.connected = true;
    room.updatedAt = now();
    this.socketRooms.set(socketId, { roomCode: room.roomCode, role: "host" });
    return { ok: true, room };
  }

  isHost(socketId, roomCode) {
    const room = this.getRoom(roomCode);
    return Boolean(room && room.host.socketId === socketId);
  }

  joinRoom({ socketId, roomCode, name, avatar, previousPlayerId }) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, error: "That room code does not exist." };
    if (!room.allowJoining || room.gameStatus === "finished") return { ok: false, error: "This game is not accepting players." };

    const cleanName = sanitizePlayerName(name);
    if (!cleanName) return { ok: false, error: "Enter a display name." };

    if (previousPlayerId && room.players.has(previousPlayerId)) {
      const player = room.players.get(previousPlayerId);
      player.socketId = socketId;
      player.connected = true;
      player.lastSeen = now();
      this.socketRooms.set(socketId, { roomCode: room.roomCode, role: "player", playerId: player.id });
      return { ok: true, room, player, reconnected: true };
    }

    if (room.players.size >= room.settings.maxPlayers) return { ok: false, error: "This room is full." };

    const player = {
      id: crypto.randomUUID(),
      socketId,
      name: this.uniquePlayerName(room, cleanName),
      avatar: sanitizeAvatar(avatar),
      score: 0,
      connected: true,
      answerStatus: null,
      joinedAt: now(),
      lastSeen: now()
    };

    room.players.set(player.id, player);
    room.updatedAt = now();
    this.socketRooms.set(socketId, { roomCode: room.roomCode, role: "player", playerId: player.id });
    return { ok: true, room, player, reconnected: false };
  }

  uniquePlayerName(room, requestedName) {
    const names = new Set([...room.players.values()].map((player) => player.name.toLowerCase()));
    if (!names.has(requestedName.toLowerCase())) return requestedName;

    let suffix = 2;
    while (names.has(`${requestedName} ${suffix}`.toLowerCase())) {
      suffix += 1;
    }
    return `${requestedName} ${suffix}`;
  }

  startGame(socketId, roomCode) {
    const room = this.requireHost(socketId, roomCode);
    room.gameStatus = "in_progress";
    room.updatedAt = now();
    return room;
  }

  selectQuestion(socketId, roomCode, categoryIndex, questionIndex) {
    const room = this.requireHost(socketId, roomCode);
    if (!["in_progress", "answer_review"].includes(room.gameStatus)) throw new Error("Questions can only be selected from the board.");

    const key = `${categoryIndex}-${questionIndex}`;
    if (room.usedQuestions.has(key)) throw new Error("That question has already been used.");

    const category = room.board[categoryIndex];
    const selected = category?.questions?.[questionIndex];
    if (!selected) throw new Error("Question not found.");

    room.currentQuestion = {
      id: selected.id,
      categoryIndex,
      questionIndex,
      category: category.name,
      value: selected.value,
      question: selected.question,
      answer: selected.answer,
      answerRevealed: false
    };
    room.currentBuzzer = null;
    room.buzzHistory = [];
    room.disqualifiedPlayerIds = new Set();
    room.players.forEach((player) => {
      player.answerStatus = null;
    });
    room.gameStatus = "question_active";
    room.updatedAt = now();
    return room;
  }

  openBuzzing(socketId, roomCode) {
    const room = this.requireHost(socketId, roomCode);
    if (!room.currentQuestion) throw new Error("Select a question first.");
    if (room.currentBuzzer) throw new Error("A player already buzzed in.");
    room.gameStatus = "buzzing_open";
    room.updatedAt = now();
    return room;
  }

  closeBuzzing(socketId, roomCode) {
    const room = this.requireHost(socketId, roomCode);
    if (room.gameStatus === "buzzing_open") room.gameStatus = "question_active";
    room.updatedAt = now();
    return room;
  }

  buzz(socketId, roomCode, playerId) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, error: "Room not found." };

    const player = room.players.get(playerId);
    if (!player || player.socketId !== socketId) return { ok: false, error: "Player not found in this room." };
    if (room.gameStatus !== "buzzing_open") return { ok: false, error: "Buzzing is closed." };
    if (room.disqualifiedPlayerIds.has(player.id)) return { ok: false, error: "You cannot buzz again on this question." };
    if (room.buzzHistory.some((buzz) => buzz.playerId === player.id)) return { ok: false, error: "You already buzzed." };
    if (!this.allowBuzzFromPlayer(player.id)) return { ok: false, error: "Slow down before buzzing again." };

    const buzz = { playerId: player.id, name: player.name, avatar: player.avatar, receivedAt: now() };
    room.buzzHistory.push(buzz);

    // The first valid buzz received by the server wins. Client timestamps are ignored.
    if (!room.currentBuzzer) {
      room.currentBuzzer = buzz;
      room.gameStatus = "answer_review";
      room.updatedAt = now();
      return { ok: true, room, winner: buzz };
    }

    return { ok: false, error: "Someone else buzzed first.", room };
  }

  allowBuzzFromPlayer(playerId) {
    const timestamp = now();
    const recent = this.buzzRate.get(playerId) || [];
    const fresh = recent.filter((time) => timestamp - time < 1500);
    fresh.push(timestamp);
    this.buzzRate.set(playerId, fresh);
    return fresh.length <= 4;
  }

  markAnswer(socketId, roomCode, { isCorrect }) {
    const room = this.requireHost(socketId, roomCode);
    if (!room.currentQuestion || !room.currentBuzzer) throw new Error("No buzzer is ready for scoring.");

    const player = room.players.get(room.currentBuzzer.playerId);
    if (!player) throw new Error("The buzzing player is no longer in the room.");

    const delta = scoreDeltaForAnswer({
      value: room.currentQuestion.value,
      isCorrect,
      deductOnWrong: room.settings.deductOnWrong
    });
    player.score += delta;
    player.answerStatus = isCorrect ? "correct" : "incorrect";

    if (!isCorrect) {
      room.disqualifiedPlayerIds.add(player.id);
      room.currentBuzzer = null;
      room.gameStatus = "question_active";
    } else {
      room.usedQuestions.add(`${room.currentQuestion.categoryIndex}-${room.currentQuestion.questionIndex}`);
      room.gameStatus = "answer_review";
    }

    this.addScoreChange(room, player, delta, isCorrect ? "Correct answer" : "Incorrect answer");
    room.updatedAt = now();
    return { room, player, delta };
  }

  revealAnswer(socketId, roomCode) {
    const room = this.requireHost(socketId, roomCode);
    if (!room.currentQuestion) throw new Error("No question is selected.");
    room.currentQuestion.answerRevealed = true;
    room.gameStatus = "answer_review";
    room.updatedAt = now();
    return room;
  }

  reopenBuzzing(socketId, roomCode) {
    const room = this.requireHost(socketId, roomCode);
    if (!room.currentQuestion) throw new Error("No question is selected.");
    room.currentBuzzer = null;
    room.gameStatus = "buzzing_open";
    room.updatedAt = now();
    return room;
  }

  returnToBoard(socketId, roomCode) {
    const room = this.requireHost(socketId, roomCode);
    if (room.currentQuestion) {
      room.usedQuestions.add(`${room.currentQuestion.categoryIndex}-${room.currentQuestion.questionIndex}`);
    }
    room.currentQuestion = null;
    room.currentBuzzer = null;
    room.buzzHistory = [];
    room.disqualifiedPlayerIds = new Set();
    room.players.forEach((player) => {
      player.answerStatus = null;
    });
    room.gameStatus = "in_progress";
    room.updatedAt = now();
    return room;
  }

  updateScore(socketId, roomCode, playerId, score) {
    const room = this.requireHost(socketId, roomCode);
    const player = room.players.get(playerId);
    if (!player) throw new Error("Player not found.");
    const nextScore = Number(score);
    if (!Number.isFinite(nextScore)) throw new Error("Score must be a number.");
    const delta = nextScore - player.score;
    player.score = Math.round(nextScore);
    this.addScoreChange(room, player, delta, "Manual adjustment");
    room.updatedAt = now();
    return room;
  }

  removePlayer(socketId, roomCode, playerId) {
    const room = this.requireHost(socketId, roomCode);
    room.players.delete(playerId);
    room.updatedAt = now();
    return room;
  }

  endGame(socketId, roomCode) {
    const room = this.requireHost(socketId, roomCode);
    room.gameStatus = "finished";
    room.allowJoining = false;
    room.updatedAt = now();
    return room;
  }

  resetGame(socketId, roomCode) {
    const room = this.requireHost(socketId, roomCode);
    room.gameStatus = "lobby";
    room.allowJoining = true;
    room.board = loadBoard();
    room.usedQuestions = new Set();
    room.currentQuestion = null;
    room.currentBuzzer = null;
    room.buzzHistory = [];
    room.disqualifiedPlayerIds = new Set();
    room.recentScoreChanges = [];
    room.players.forEach((player) => {
      player.score = 0;
      player.answerStatus = null;
    });
    room.updatedAt = now();
    return room;
  }

  updateSettings(socketId, roomCode, settings) {
    const room = this.requireHost(socketId, roomCode);
    if (typeof settings?.deductOnWrong === "boolean") {
      room.settings.deductOnWrong = settings.deductOnWrong;
    }
    room.updatedAt = now();
    return room;
  }

  handleDisconnect(socketId) {
    const binding = this.socketRooms.get(socketId);
    if (!binding) return null;

    const room = this.getRoom(binding.roomCode);
    if (!room) return null;

    if (binding.role === "host" && room.host.socketId === socketId) {
      room.host.connected = false;
      room.host.socketId = null;
    }

    if (binding.role === "player") {
      const player = room.players.get(binding.playerId);
      if (player) {
        player.connected = false;
        player.socketId = null;
        player.lastSeen = now();
      }
    }

    this.socketRooms.delete(socketId);
    room.updatedAt = now();
    return { room, binding };
  }

  addScoreChange(room, player, delta, reason) {
    room.recentScoreChanges.unshift({
      id: crypto.randomUUID(),
      playerId: player.id,
      name: player.name,
      delta,
      reason,
      at: now()
    });
    room.recentScoreChanges = room.recentScoreChanges.slice(0, 8);
  }

  requireHost(socketId, roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error("Room not found.");
    if (room.host.socketId !== socketId) throw new Error("Only the host can do that.");
    return room;
  }

  hostState(room) {
    return {
      roomCode: room.roomCode,
      role: "host",
      hostConnected: room.host.connected,
      gameStatus: room.gameStatus,
      allowJoining: room.allowJoining,
      settings: room.settings,
      players: rankPlayers([...room.players.values()].map(publicPlayer)),
      board: sanitizeBoardForClient(room.board, room.usedQuestions),
      currentQuestion: sanitizeCurrentQuestion(room.currentQuestion, "host"),
      currentBuzzer: room.currentBuzzer,
      buzzHistory: room.buzzHistory,
      disqualifiedPlayerIds: [...room.disqualifiedPlayerIds],
      recentScoreChanges: room.recentScoreChanges,
      updatedAt: room.updatedAt
    };
  }

  playerState(room, playerId) {
    const player = room.players.get(playerId);
    return {
      roomCode: room.roomCode,
      role: "player",
      hostConnected: room.host.connected,
      gameStatus: room.gameStatus,
      player: player ? publicPlayer(player) : null,
      players: rankPlayers([...room.players.values()].map(publicPlayer)),
      currentQuestion: sanitizeCurrentQuestion(room.currentQuestion, "player"),
      currentBuzzer: room.currentBuzzer ? { playerId: room.currentBuzzer.playerId, name: room.currentBuzzer.name, avatar: room.currentBuzzer.avatar } : null,
      buzzed: room.buzzHistory.some((buzz) => buzz.playerId === playerId),
      canBuzz:
        room.gameStatus === "buzzing_open" &&
        !room.currentBuzzer &&
        !room.disqualifiedPlayerIds.has(playerId) &&
        !room.buzzHistory.some((buzz) => buzz.playerId === playerId),
      recentScoreChanges: room.recentScoreChanges,
      updatedAt: room.updatedAt
    };
  }

  roomStates(room) {
    return {
      host: room.host.socketId ? { socketId: room.host.socketId, state: this.hostState(room) } : null,
      players: [...room.players.values()]
        .filter((player) => player.socketId)
        .map((player) => ({ socketId: player.socketId, state: this.playerState(room, player.id) }))
    };
  }
}
