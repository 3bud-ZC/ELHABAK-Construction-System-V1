import { Injectable } from "@nestjs/common";
import type { Prisma } from "@elhabak/database";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { ProjectAccessService } from "../projects/project-access.service";

export type SearchResult = {
  id: string;
  type: "PROJECT" | "CLIENT" | "USER" | "DESIGN" | "DOCUMENT";
  title: string;
  context: string | null;
  href: string;
};

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectAccessService
  ) { }

  async search(user: RequestUser, rawQuery?: string) {
    const query = rawQuery?.trim();
    if (!query || query.length < 2) return { query: query ?? "", results: [] as SearchResult[] };

    const projectWhere: Prisma.ProjectWhereInput =
      user.role === "ADMIN" || user.role === "ACCOUNTANT"
        ? {}
        : this.projects.projectWhereFor(user);
    const projectSearch: Prisma.ProjectWhereInput = {
      AND: [
        projectWhere,
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { location: { contains: query, mode: "insensitive" } },
            { client: { user: { displayName: { contains: query, mode: "insensitive" } } } }
          ]
        }
      ]
    };

    const canSearchDesigns =
      user.role === "ADMIN" || user.role === "ENGINEER" || user.role === "CLIENT";
    const canSearchDocuments = canSearchDesigns;
    const [projects, clients, users, designs, documents] = await Promise.all([
      this.prisma.project.findMany({
        where: projectSearch,
        select: { id: true, code: true, name: true, location: true },
        orderBy: { updatedAt: "desc" },
        take: 10
      }),
      user.role === "ADMIN"
        ? this.prisma.clientProfile.findMany({
          where: {
            OR: [
              { user: { displayName: { contains: query, mode: "insensitive" } } },
              { user: { email: { contains: query, mode: "insensitive" } } },
              { phone: { contains: query, mode: "insensitive" } }
            ]
          },
          select: { id: true, phone: true, user: { select: { displayName: true, email: true } } },
          take: 8
        })
        : Promise.resolve([]),
      user.role === "ADMIN"
        ? this.prisma.user.findMany({
          where: {
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } }
            ]
          },
          select: { id: true, displayName: true, email: true, role: true },
          orderBy: { displayName: "asc" },
          take: 8
        })
        : Promise.resolve([]),
      canSearchDesigns
        ? this.prisma.designItem.findMany({
          where: {
            project: projectWhere,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } }
            ]
          },
          select: {
            id: true,
            projectId: true,
            title: true,
            discipline: true,
            project: { select: { name: true } }
          },
          orderBy: { updatedAt: "desc" },
          take: 10
        })
        : Promise.resolve([]),
      canSearchDocuments
        ? this.prisma.projectDocument.findMany({
          where: {
            project: projectWhere,
            ...(user.role === "CLIENT" ? { status: "ACTIVE", isClientVisible: true } : {}),
            OR: [
              { reference: { contains: query, mode: "insensitive" } },
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } }
            ]
          },
          select: {
            id: true,
            projectId: true,
            reference: true,
            title: true,
            category: true,
            project: { select: { name: true } }
          },
          orderBy: { updatedAt: "desc" },
          take: 10
        })
        : Promise.resolve([])
    ]);

    const results: SearchResult[] = [
      ...projects.map((project) => ({
        id: project.id,
        type: "PROJECT" as const,
        title: project.name,
        context: [project.code, project.location].filter(Boolean).join(" · ") || null,
        href:
          user.role === "ACCOUNTANT"
            ? `/app/projects/${project.id}/finance`
            : `/app/projects/${project.id}`
      })),
      ...clients.map((client) => ({
        id: client.id,
        type: "CLIENT" as const,
        title: client.user.displayName,
        context: [client.user.email, client.phone].filter(Boolean).join(" · ") || null,
        href: `/app/admin/clients/${client.id}`
      })),
      ...users.map((record) => ({
        id: record.id,
        type: "USER" as const,
        title: record.displayName,
        context: record.email,
        href: `/app/admin/users/${record.id}`
      })),
      ...designs.map((design) => ({
        id: design.id,
        type: "DESIGN" as const,
        title: design.title,
        context: design.project.name,
        href: `/app/projects/${design.projectId}/design/${design.id}`
      })),
      ...documents.map((document) => ({
        id: document.id,
        type: "DOCUMENT" as const,
        title: document.title,
        context: `${document.project.name} · ${document.reference}`,
        href: `/app/projects/${document.projectId}/documents/${document.id}`
      }))
    ];
    return { query, results };
  }
}
