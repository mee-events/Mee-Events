import { Inject, INestApplication, Module } from "@nestjs/common";
import { APP_GUARD, NestFactory, Reflector } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import type { DeviceSession } from "@me-event/shared-types";
import type {
  AddVendorNoteRequest,
  VendorAssignmentDetailResponse,
  VendorAssignmentSummary,
  VendorDashboardResponse,
  VendorDetailResponse,
  VendorNoteSummary,
  VendorSummary,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GlobalExceptionFilter } from "../src/common/http/global-exception.filter";
import { configureHttpSurface } from "../src/common/http/http-surface";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../src/modules/identity/ports/identity-repository";
import { AccessTokenGuard } from "../src/modules/platform-foundation/security/access-token.guard";
import { authPrincipalCache } from "../src/modules/platform-foundation/security/auth-principal-cache";
import { CapabilityGuard } from "../src/modules/authorization/capability.guard";
import { VendorService } from "../src/modules/vendors/application/vendor.service";
import {
  type VendorMutationContext,
  type VendorRepository,
  VENDOR_REPOSITORY,
} from "../src/modules/vendors/ports/vendor-repository";
import { CrmVendorController } from "../src/modules/vendors/presentation/crm-vendor.controller";
import { VendorController } from "../src/modules/vendors/presentation/vendor.controller";

// Vitest does not emit TypeScript's design:paramtypes metadata. Supply the
// equivalent constructor token in this test module without weakening the
// production controllers' normal Nest dependency requirements.
Inject(VendorService)(VendorController, undefined, 0);
Inject(VendorService)(CrmVendorController, undefined, 0);
Inject(Reflector)(CapabilityGuard, undefined, 0);

const HTTP_JWT_SECRET = "http-vendor-notes-jwt-secret-00000000";
const HYDERABAD_BRANCH_ID = "00000000-0000-4000-8000-000000000001";
const TEST_VENDOR_ID = "00000000-0000-4000-8000-000000000010";

class HttpTestVendorRepository implements VendorRepository {
  public readonly notes: VendorNoteSummary[] = [];
  private readonly members = new Map<string, Set<string>>();

  public async getVendorDashboard(
    _userId: string,
  ): Promise<VendorDashboardResponse> {
    const summary: VendorSummary = {
      id: TEST_VENDOR_ID,
      vendorCode: "VND-HTTP-01",
      businessName: "HTTP Test Vendor",
      ownerName: "HTTP Owner",
      phoneE164: "+919000000088",
      city: "Hyderabad",
      state: "Telangana",
      activeStatus: "active",
      verificationStatus: "verified",
      ratingAverage: "5.00",
      ratingCount: 1,
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return {
      totalVendors: 1,
      activeAssignments: 0,
      pendingAcceptances: 0,
      completedAssignments: 0,
      vendors: [summary],
      openAssignments: [],
    };
  }

  public async isVendorMember(
    vendorId: string,
    userId: string,
  ): Promise<boolean> {
    return this.members.get(userId)?.has(vendorId) === true;
  }

  public async addNote(
    input: VendorMutationContext & {
      readonly vendorId: string;
      readonly body: AddVendorNoteRequest;
    },
  ): Promise<VendorNoteSummary | undefined> {
    const note: VendorNoteSummary = {
      id: randomUUID(),
      vendorId: input.vendorId,
      noteType: input.body.noteType,
      content: input.body.content,
      createdAt: new Date().toISOString(),
      createdByUserId: input.actorUserId,
      ...(input.body.assignmentId === undefined
        ? {}
        : { assignmentId: input.body.assignmentId }),
      ...(input.body.eventRecordId === undefined
        ? {}
        : { eventRecordId: input.body.eventRecordId }),
    };
    this.notes.push(note);
    return note;
  }

  public async getVendor(
    vendorId: string,
    _branchId?: string,
  ): Promise<VendorDetailResponse | undefined> {
    if (vendorId !== TEST_VENDOR_ID) return undefined;
    return {
      id: TEST_VENDOR_ID,
      vendorCode: "VND-HTTP-01",
      businessName: "HTTP Test Vendor",
      ownerName: "HTTP Owner",
      phoneE164: "+919000000088",
      city: "Hyderabad",
      state: "Telangana",
      activeStatus: "active",
      verificationStatus: "verified",
      ratingAverage: "5.00",
      ratingCount: 1,
      bankAccounts: [],
      categories: [],
      contacts: [],
      notes: "test notes",
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public async listVendors(): Promise<{
    readonly items: readonly VendorSummary[];
    readonly total: number;
  }> {
    return { items: [], total: 0 };
  }
  public async createVendor(): Promise<VendorDetailResponse> {
    throw new Error("Not implemented for test");
  }
  public async updateVendor(): Promise<VendorDetailResponse | undefined> {
    throw new Error("Not implemented for test");
  }
  public async assignVendor(): Promise<VendorAssignmentSummary | undefined> {
    throw new Error("Not implemented for test");
  }
  public async updateAssignment(): Promise<
    VendorAssignmentSummary | undefined
  > {
    throw new Error("Not implemented for test");
  }
  public async acceptAssignment(): Promise<
    VendorAssignmentSummary | undefined
  > {
    throw new Error("Not implemented for test");
  }
  public async rejectAssignment(): Promise<
    VendorAssignmentSummary | undefined
  > {
    throw new Error("Not implemented for test");
  }
  public async updateProgress(): Promise<VendorAssignmentSummary | undefined> {
    throw new Error("Not implemented for test");
  }
  public async listAssignments(): Promise<readonly VendorAssignmentSummary[]> {
    return [];
  }
  public async getAssignment(): Promise<
    VendorAssignmentDetailResponse | undefined
  > {
    return undefined;
  }
  public async getCrmDashboard(): Promise<VendorDashboardResponse> {
    return {
      totalVendors: 1,
      activeAssignments: 0,
      pendingAcceptances: 0,
      completedAssignments: 0,
      vendors: [],
      openAssignments: [],
    };
  }
  public async findVendorIdsForUser(
    userId: string,
  ): Promise<readonly string[]> {
    return [...(this.members.get(userId) ?? [])];
  }
  public async findVendorIdForUser(
    userId: string,
  ): Promise<string | undefined> {
    return (await this.findVendorIdsForUser(userId))[0];
  }

  public addMember(userId: string, vendorId: string): void {
    const vendorIds = this.members.get(userId) ?? new Set<string>();
    vendorIds.add(vendorId);
    this.members.set(userId, vendorIds);
  }

  public removeMember(userId: string, vendorId: string): void {
    this.members.get(userId)?.delete(vendorId);
  }
}

@Module({
  imports: [JwtModule.register({ secret: HTTP_JWT_SECRET })],
  controllers: [VendorController, CrmVendorController],
  providers: [
    Reflector,
    VendorService,
    HttpTestVendorRepository,
    {
      provide: VENDOR_REPOSITORY,
      useExisting: HttpTestVendorRepository,
    },
    {
      provide: IDENTITY_REPOSITORY,
      useClass: InMemoryIdentityRepository,
    },
    CapabilityGuard,
    {
      provide: APP_GUARD,
      inject: [JwtService, Reflector, IDENTITY_REPOSITORY],
      useFactory: (
        jwt: JwtService,
        reflector: Reflector,
        repository: IdentityRepository,
      ): AccessTokenGuard => new AccessTokenGuard(jwt, reflector, repository),
    },
  ],
})
class VendorNotesHttpModule {}

describe("Vendor notes real HTTP surface", () => {
  let app: INestApplication | undefined;
  let baseUrl: string;
  let jwtService: JwtService;
  let identityRepo: InMemoryIdentityRepository;
  let testRepo: HttpTestVendorRepository;

  let vendorToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    authPrincipalCache.clear();
    jwtService = new JwtService({ secret: HTTP_JWT_SECRET });

    app = await NestFactory.create(VendorNotesHttpModule, {
      logger: false,
      abortOnError: false,
    });
    app.useGlobalFilters(new GlobalExceptionFilter());
    configureHttpSurface(app, {
      appEnv: "test",
      allowedOrigins: "http://localhost:3001",
      enableOpenApiOverride: false,
    });
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();

    identityRepo = app.get<InMemoryIdentityRepository>(IDENTITY_REPOSITORY);
    testRepo = app.get(HttpTestVendorRepository);

    // Setup vendor owner user
    const vendorUser = await identityRepo.createUser(
      "+919000000088",
      "vendor_owner",
    );
    identityRepo.replaceUser({
      ...vendorUser,
      roles: [
        {
          role: "vendor_owner",
          active: true,
          scopeType: "vendor",
          scopeId: TEST_VENDOR_ID,
        },
      ],
    });
    testRepo.addMember(vendorUser.id, TEST_VENDOR_ID);
    const vendorSession: DeviceSession = {
      id: "vendor-session-http-1",
      userId: vendorUser.id,
      deviceId: "device-v",
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
    await identityRepo.saveSession(vendorSession, "hash-v");
    vendorToken = await jwtService.signAsync({
      sub: vendorUser.id,
      sid: vendorSession.id,
      role: "vendor_owner",
    });

    // Setup CRM employee user
    const employeeUser = await identityRepo.createUser(
      "+919000000089",
      "employee",
    );
    identityRepo.replaceUser({
      ...employeeUser,
      roles: [
        {
          role: "employee",
          active: true,
          scopeType: "branch",
          scopeId: HYDERABAD_BRANCH_ID,
        },
      ],
    });
    const employeeSession: DeviceSession = {
      id: "employee-session-http-1",
      userId: employeeUser.id,
      deviceId: "device-e",
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
    await identityRepo.saveSession(employeeSession, "hash-e");
    employeeToken = await jwtService.signAsync({
      sub: employeeUser.id,
      sid: employeeSession.id,
      role: "employee",
    });
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  describe("POST /api/v1/vendors/me/notes (vendor-self)", () => {
    it("persists omitted noteType as 'vendor' and returns 201 with noteType: 'vendor'", async () => {
      const response = await fetch(`${baseUrl}/api/v1/vendors/me/notes`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${vendorToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          content: "Vendor self note with omitted noteType",
        }),
      });

      expect(response.status).toBe(201);
      const data = (await response.json()) as VendorNoteSummary;
      expect(data.noteType).toBe("vendor");
      expect(data.content).toBe("Vendor self note with omitted noteType");
      expect(data.vendorId).toBe(TEST_VENDOR_ID);

      const saved = testRepo.notes.find((n) => n.id === data.id);
      expect(saved?.noteType).toBe("vendor");
    });

    it("persists explicit noteType 'vendor' and returns 201 with noteType: 'vendor'", async () => {
      const response = await fetch(`${baseUrl}/api/v1/vendors/me/notes`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${vendorToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          vendorId: TEST_VENDOR_ID,
          content: "Vendor self note with literal vendor",
          noteType: "vendor",
        }),
      });

      expect(response.status).toBe(201);
      const data = (await response.json()) as VendorNoteSummary;
      expect(data.noteType).toBe("vendor");
      expect(data.content).toBe("Vendor self note with literal vendor");
    });

    it("rejects attempted 'internal' noteType with HTTP 400 Bad Request", async () => {
      const response = await fetch(`${baseUrl}/api/v1/vendors/me/notes`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${vendorToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          content: "Vendor self note attempting internal classification",
          noteType: "internal",
        }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { message?: string };
      expect(data.message).toBe("Request validation failed");
      expect(
        testRepo.notes.some(
          (n) =>
            n.content === "Vendor self note attempting internal classification",
        ),
      ).toBe(false);
    });

    it("rejects attempted 'progress' noteType with HTTP 400 Bad Request", async () => {
      const response = await fetch(`${baseUrl}/api/v1/vendors/me/notes`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${vendorToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          content: "Vendor self note attempting progress classification",
          noteType: "progress",
        }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { message?: string };
      expect(data.message).toBe("Request validation failed");
      expect(
        testRepo.notes.some(
          (n) =>
            n.content === "Vendor self note attempting progress classification",
        ),
      ).toBe(false);
    });

    it("rejects an employee even when the employee is a vendor member", async () => {
      const employee = await identityRepo.findUserByMobile("+919000000089");
      expect(employee).toBeDefined();
      testRepo.addMember(employee!.id, TEST_VENDOR_ID);
      const before = testRepo.notes.length;

      const response = await fetch(`${baseUrl}/api/v1/vendors/me/notes`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${employeeToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ content: "Employee must not use vendor self" }),
      });

      expect(response.status).toBe(403);
      expect(testRepo.notes).toHaveLength(before);
    });

    it("rejects a vendor grant when membership belongs to another user", async () => {
      const vendor = await identityRepo.findUserByMobile("+919000000088");
      expect(vendor).toBeDefined();
      testRepo.removeMember(vendor!.id, TEST_VENDOR_ID);
      testRepo.addMember("different-vendor-user", TEST_VENDOR_ID);
      const before = testRepo.notes.length;

      const response = await fetch(`${baseUrl}/api/v1/vendors/me/notes`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${vendorToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ content: "Grant without membership" }),
      });

      expect(response.status).toBe(403);
      const data = (await response.json()) as { code?: string };
      expect(data.code).toBe("VENDOR_RESOURCE_FORBIDDEN");
      expect(testRepo.notes).toHaveLength(before);
    });
  });

  describe("POST /api/v1/crm/vendors/:id/notes (CRM employee)", () => {
    it("allows CRM employees to create 'internal' notes", async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/crm/vendors/${TEST_VENDOR_ID}/notes`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${employeeToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            content: "CRM employee internal staff note",
            noteType: "internal",
          }),
        },
      );

      expect(response.status).toBe(201);
      const data = (await response.json()) as VendorNoteSummary;
      expect(data.noteType).toBe("internal");
      expect(data.content).toBe("CRM employee internal staff note");
    });

    it("allows CRM employees to create 'progress' notes", async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/crm/vendors/${TEST_VENDOR_ID}/notes`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${employeeToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            content: "CRM employee progress update note",
            noteType: "progress",
          }),
        },
      );

      expect(response.status).toBe(201);
      const data = (await response.json()) as VendorNoteSummary;
      expect(data.noteType).toBe("progress");
      expect(data.content).toBe("CRM employee progress update note");
    });

    it("allows CRM employees to create 'vendor' classification notes", async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/crm/vendors/${TEST_VENDOR_ID}/notes`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${employeeToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            content: "CRM employee vendor category note",
            noteType: "vendor",
          }),
        },
      );

      expect(response.status).toBe(201);
      const data = (await response.json()) as VendorNoteSummary;
      expect(data.noteType).toBe("vendor");
      expect(data.content).toBe("CRM employee vendor category note");
    });

    it("defaults omitted CRM noteType to 'internal'", async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/crm/vendors/${TEST_VENDOR_ID}/notes`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${employeeToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            content: "CRM employee note with default type",
          }),
        },
      );

      expect(response.status).toBe(201);
      const data = (await response.json()) as VendorNoteSummary;
      expect(data.noteType).toBe("internal");
      expect(data.content).toBe("CRM employee note with default type");
    });
  });
});
