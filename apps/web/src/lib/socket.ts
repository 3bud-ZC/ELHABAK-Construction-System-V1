"use client";

import { io, type Socket } from "socket.io-client";

const socketUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";

let socket: Socket | null = null;

/**
 * One shared authenticated realtime connection for the whole authenticated app - the
 * session cookie is sent automatically (withCredentials), matching the existing REST auth
 * model. Realtime only ever delivers events for state that a REST call can also restore;
 * losing this connection never loses data, it just delays a live update until reconnect or
 * the next page load.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      transports: ["websocket", "polling"]
    });
  }
  return socket;
}

export function joinProjectRoom(projectId: string) {
  const instance = getSocket();
  instance.emit("chat:join", { projectId });
}

export function leaveProjectRoom(projectId: string) {
  const instance = getSocket();
  instance.emit("chat:leave", { projectId });
}
