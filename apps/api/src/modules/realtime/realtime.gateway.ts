import { Injectable, Logger } from "@nestjs/common";
import { OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { parse } from "cookie";
import type { Server, Socket } from "socket.io";
import { parseApiEnv } from "@elhabak/config";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";

const env = parseApiEnv(process.env);

interface AppSocket extends Omit<Socket, "data"> {
  data: { user?: RequestUser };
}

/**
 * Thin realtime delivery layer: every event it broadcasts is emitted only AFTER the
 * originating REST request has already persisted the corresponding row in PostgreSQL.
 * The socket connection is never treated as the source of truth - a client that misses an
 * event (disconnected, reconnecting, or never subscribed) always recovers the same state
 * through the existing REST endpoints. Room membership is authorized server-side on every
 * join; a client cannot subscribe to a project room it does not have access to just by
 * naming it.
 */
@Injectable()
@WebSocketGateway({
  cors: { origin: env.WEB_ORIGIN, credentials: true }
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Authentication runs as connection middleware (`io.use`), not in `handleConnection`.
   * Socket.IO only dispatches the "connection"/"connect" event - to both server and client -
   * after every registered middleware has called `next()`. Authenticating here guarantees
   * `socket.data.user` is already set before the client can possibly emit "chat:join": doing
   * the lookup inside `handleConnection` instead left a real race window where a fast client
   * could emit "chat:join" before that async DB lookup had resolved, so the join briefly saw
   * an unauthenticated socket and was incorrectly denied.
   */
  afterInit(server: Server) {
    server.use((socket, next) => {
      void this.authenticateSocket(socket as AppSocket, next);
    });
  }

  private async authenticateSocket(socket: AppSocket, next: (err?: Error) => void) {
    try {
      const cookies = parse(socket.handshake.headers.cookie ?? "");
      const token = cookies[this.auth.cookieOptions.name];
      const { user } = await this.auth.authenticate(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  }

  handleConnection(socket: AppSocket) {
    if (socket.data.user) {
      void socket.join(userRoom(socket.data.user.id));
    }
  }

  handleDisconnect() {
    // Socket.IO leaves every room automatically on disconnect - nothing persisted here.
  }

  @SubscribeMessage("chat:join")
  async onJoinProject(socket: AppSocket, payload: unknown) {
    const projectId = extractProjectId(payload);
    const user = socket.data.user;
    if (!user || !projectId) return { ok: false };

    const allowed = await this.canAccessProjectChat(user, projectId);
    if (!allowed) return { ok: false };

    await socket.join(projectRoom(projectId));
    return { ok: true };
  }

  @SubscribeMessage("chat:leave")
  async onLeaveProject(socket: AppSocket, payload: unknown) {
    const projectId = extractProjectId(payload);
    if (projectId) await socket.leave(projectRoom(projectId));
    return { ok: true };
  }

  emitToProject(projectId: string, event: string, payload: unknown) {
    this.server?.to(projectRoom(projectId)).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  disconnectUser(userId: string) {
    this.server?.in(userRoom(userId)).disconnectSockets(true);
  }

  /** Mirrors ProjectAccessService's read rule, kept self-contained here to avoid a module dependency cycle with ProjectsModule/NotificationsModule. Accountant never gets project chat access. */
  private async canAccessProjectChat(user: RequestUser, projectId: string): Promise<boolean> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isActive: true, archivedAt: true }
    });
    if (!currentUser?.isActive || currentUser.archivedAt) return false;
    if (user.role === "ACCOUNTANT") return false;
    if (user.role === "ADMIN") {
      const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
      return Boolean(project);
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        engineerId: true,
        client: { select: { userId: true } },
        assignments: { where: { userId: user.id }, select: { userId: true } }
      }
    });
    if (!project) return false;

    if (user.role === "CLIENT") return project.client?.userId === user.id;
    if (user.role === "ENGINEER" || user.role === "WORKER") {
      return project.engineerId === user.id || project.assignments.length > 0;
    }
    return false;
  }
}

function projectRoom(projectId: string) {
  return `project:${projectId}`;
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

function extractProjectId(payload: unknown): string | null {
  if (typeof payload === "object" && payload !== null && "projectId" in payload) {
    const value = (payload as { projectId?: unknown }).projectId;
    return typeof value === "string" && value.trim().length > 0 ? value : null;
  }
  return null;
}
