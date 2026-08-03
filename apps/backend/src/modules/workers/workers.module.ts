import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresWorkerRepository } from "./adapters/postgres-worker.repository";
import { WorkerService } from "./application/worker.service";
import { WORKER_REPOSITORY } from "./ports/worker-repository";
import { CrmWorkerController } from "./presentation/crm-worker.controller";
import { WorkerController } from "./presentation/worker.controller";

@Module({
  imports: [IdentityModule],
  controllers: [CrmWorkerController, WorkerController],
  providers: [
    WorkerService,
    AccessTokenGuard,
    CapabilityGuard,
    {
      provide: WORKER_REPOSITORY,
      useClass: PostgresWorkerRepository,
    },
  ],
  exports: [WorkerService],
})
export class WorkersModule {}
