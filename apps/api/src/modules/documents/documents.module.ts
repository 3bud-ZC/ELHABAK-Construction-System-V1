import { Module } from "@nestjs/common";
import { AuditService } from "../admin/audit.service";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { StorageService } from "../projects/storage.service";
import { DocumentAccessService } from "./document-access.service";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [DocumentsController],
  providers: [AuditService, StorageService, DocumentAccessService, DocumentsService]
})
export class DocumentsModule {}
