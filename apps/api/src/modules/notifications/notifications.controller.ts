import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../../shared/http.types";
import { NotificationService } from "./notification.service";

@UseGuards(AuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query("status") status?: string) {
    return this.notifications.list(user, status);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: RequestUser) {
    return this.notifications.unreadCount(user);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.markRead(user, id);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user);
  }
}
