import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";

type SocketUser = {
  sub: string;
  email?: string;
  role?: string;
};

@WebSocketGateway({
  namespace: "notifications",
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = this.extractToken(client);
      const user = this.jwtService.verify<SocketUser>(token);

      if (!user.sub) {
        this.logger.warn(`Socket rejected: ${client.id} - missing user.sub in token`);
        client.disconnect(true);
        return;
      }

      client.data.user = user;
      await client.join(this.getUserRoom(user.sub));

      if (user.role) {
        await client.join(`role:${user.role}`);
      }

      this.logger.log(`Socket connected: ${client.id} user=${user.sub}`);
    } catch (error: any) {
      this.logger.warn(`Socket rejected: ${client.id} - Reason: ${error?.message || error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.sub;
    this.logger.log(`Socket disconnected: ${client.id} user=${userId || "unknown"}`);
  }

  emitNewNotification(userId: string, notification: unknown) {
    this.server
      .to(this.getUserRoom(userId))
      .emit("notification:new", notification);
  }

  emitUnreadCount(userId: string, unreadCount: number) {
    this.server
      .to(this.getUserRoom(userId))
      .emit("notification:unread-count", { unreadCount });
  }

  emitRead(userId: string, notificationId: string) {
    this.server
      .to(this.getUserRoom(userId))
      .emit("notification:read", { notificationId });
  }

  private extractToken(client: Socket): string {
    let token =
      client.handshake.auth?.token ||
      (client.handshake.query?.token as string) ||
      (client.handshake.query?.auth as string) ||
      client.handshake.headers.authorization;

    if (typeof token === "string") {
      if (token.startsWith("Bearer ")) {
        token = token.slice(7);
      }
      token = token.trim();
      if (token.length > 0) return token;
    }

    throw new Error("Missing socket auth token");
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }
}
