import type { Prisma } from "@elhabak/database";

export const chatMessageInclude = {
  author: { select: { id: true, displayName: true, role: true } }
} satisfies Prisma.ProjectMessageInclude;

export type ChatMessageWithAuthor = Prisma.ProjectMessageGetPayload<{ include: typeof chatMessageInclude }>;

export function toChatMessageResponse(message: ChatMessageWithAuthor) {
  return {
    id: message.id,
    projectId: message.projectId,
    type: message.type,
    text: message.text,
    voice:
      message.type === "VOICE"
        ? {
            originalFilename: message.originalFilename,
            mimeType: message.mimeType,
            fileSize: message.fileSize,
            durationSeconds: message.durationSeconds
          }
        : null,
    author: {
      id: message.author.id,
      displayName: message.author.displayName,
      role: message.author.role
    },
    createdAt: message.createdAt.toISOString()
  };
}
