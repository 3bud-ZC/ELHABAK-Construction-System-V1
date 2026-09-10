import type { Notification, Project } from "@elhabak/database";

export type NotificationWithProject = Notification & { project: Pick<Project, "id" | "code" | "name"> | null };

export function toNotificationResponse(notification: NotificationWithProject | Notification) {
  const project = "project" in notification ? notification.project : null;
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    projectId: notification.projectId,
    project: project ? { id: project.id, code: project.code, name: project.name } : null,
    entityId: notification.entityId,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString()
  };
}
