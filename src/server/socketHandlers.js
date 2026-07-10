import { RoomManager } from "./roomManager.js";

export const roomManager = new RoomManager();

function roomChannel(roomCode) {
  return `room:${roomCode}`;
}

function emitRoomState(io, room) {
  const states = roomManager.roomStates(room);

  if (states.host) {
    io.to(states.host.socketId).emit("sync_state", states.host.state);
  }

  states.players.forEach(({ socketId, state }) => {
    io.to(socketId).emit("sync_state", state);
  });
}

function emitActionError(socket, message) {
  socket.emit("action_error", message);
}

function withHostAction(io, socket, payload, action, ack) {
  try {
    const room = action(payload || {});
    emitRoomState(io, room);
    ack?.({ ok: true });
  } catch (error) {
    const message = error.message || "Action failed.";
    emitActionError(socket, message);
    ack?.({ ok: false, error: message });
  }
}

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("create_room", (_payload, ack) => {
      const { room, hostToken } = roomManager.createRoom(socket.id);
      socket.join(roomChannel(room.roomCode));
      ack?.({ ok: true, roomCode: room.roomCode, hostToken, state: roomManager.hostState(room) });
      emitRoomState(io, room);
    });

    socket.on("host_reconnect", ({ roomCode, hostToken } = {}, ack) => {
      const result = roomManager.bindHost(socket.id, roomCode, hostToken);
      if (!result.ok) {
        ack?.(result);
        return;
      }

      socket.join(roomChannel(result.room.roomCode));
      socket.to(roomChannel(result.room.roomCode)).emit("reconnect", { role: "host" });
      ack?.({ ok: true, state: roomManager.hostState(result.room) });
      emitRoomState(io, result.room);
    });

    socket.on("join_room", (payload = {}, ack) => {
      const result = roomManager.joinRoom({ socketId: socket.id, ...payload });
      if (!result.ok) {
        ack?.(result);
        return;
      }

      socket.join(roomChannel(result.room.roomCode));
      io.to(roomChannel(result.room.roomCode)).emit("player_joined", {
        id: result.player.id,
        name: result.player.name,
        avatar: result.player.avatar,
        reconnected: result.reconnected
      });
      ack?.({
        ok: true,
        roomCode: result.room.roomCode,
        playerId: result.player.id,
        playerName: result.player.name,
        state: roomManager.playerState(result.room, result.player.id)
      });
      emitRoomState(io, result.room);
    });

    socket.on("player_reconnect", (payload = {}, ack) => {
      const result = roomManager.joinRoom({ socketId: socket.id, ...payload, previousPlayerId: payload.playerId });
      if (!result.ok) {
        ack?.(result);
        return;
      }
      socket.join(roomChannel(result.room.roomCode));
      socket.emit("reconnect", { role: "player" });
      ack?.({ ok: true, state: roomManager.playerState(result.room, result.player.id) });
      emitRoomState(io, result.room);
    });

    socket.on("sync_state", ({ roomCode, playerId } = {}, ack) => {
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        ack?.({ ok: false, error: "Room not found." });
        return;
      }

      if (roomManager.isHost(socket.id, roomCode)) {
        ack?.({ ok: true, state: roomManager.hostState(room) });
        return;
      }

      if (playerId && room.players.has(playerId)) {
        ack?.({ ok: true, state: roomManager.playerState(room, playerId) });
        return;
      }

      ack?.({ ok: false, error: "No matching session found." });
    });

    socket.on("start_game", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.startGame(socket.id, roomCode), ack)
    );

    socket.on("select_question", (payload, ack) =>
      withHostAction(
        io,
        socket,
        payload,
        ({ roomCode, categoryIndex, questionIndex }) =>
          roomManager.selectQuestion(socket.id, roomCode, Number(categoryIndex), Number(questionIndex)),
        ack
      )
    );

    socket.on("open_buzzing", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.openBuzzing(socket.id, roomCode), ack)
    );

    socket.on("close_buzzing", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.closeBuzzing(socket.id, roomCode), ack)
    );

    socket.on("player_buzz", ({ roomCode, playerId } = {}, ack) => {
      const result = roomManager.buzz(socket.id, roomCode, playerId);
      if (!result.ok) {
        ack?.(result);
        if (result.room) emitRoomState(io, result.room);
        return;
      }

      io.to(roomChannel(result.room.roomCode)).emit("buzz_winner", result.winner);
      ack?.({ ok: true, winner: result.winner });
      emitRoomState(io, result.room);
    });

    socket.on("mark_correct", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.markAnswer(socket.id, roomCode, { isCorrect: true }).room, ack)
    );

    socket.on("mark_incorrect", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.markAnswer(socket.id, roomCode, { isCorrect: false }).room, ack)
    );

    socket.on("reopen_buzzing", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.reopenBuzzing(socket.id, roomCode), ack)
    );

    socket.on("reveal_answer", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.revealAnswer(socket.id, roomCode), ack)
    );

    socket.on("update_score", (payload, ack) =>
      withHostAction(
        io,
        socket,
        payload,
        ({ roomCode, playerId, score }) => roomManager.updateScore(socket.id, roomCode, playerId, score),
        ack
      )
    );

    socket.on("return_to_board", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.returnToBoard(socket.id, roomCode), ack)
    );

    socket.on("end_game", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.endGame(socket.id, roomCode), ack)
    );

    socket.on("reset_game", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode }) => roomManager.resetGame(socket.id, roomCode), ack)
    );

    socket.on("update_settings", (payload, ack) =>
      withHostAction(io, socket, payload, ({ roomCode, settings }) => roomManager.updateSettings(socket.id, roomCode, settings), ack)
    );

    socket.on("remove_player", (payload, ack) =>
      withHostAction(
        io,
        socket,
        payload,
        ({ roomCode, playerId }) => {
          const room = roomManager.removePlayer(socket.id, roomCode, playerId);
          io.to(roomChannel(room.roomCode)).emit("player_left", playerId);
          return room;
        },
        ack
      )
    );

    socket.on("disconnect", () => {
      const result = roomManager.handleDisconnect(socket.id);
      if (!result) return;

      const eventName = result.binding.role === "host" ? "host_disconnect" : "player_disconnect";
      io.to(roomChannel(result.room.roomCode)).emit(eventName, result.binding);
      emitRoomState(io, result.room);
    });
  });
}
