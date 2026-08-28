import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  refreshSessionSchema,
  requestOtpSchema,
  switchRoleSchema,
  verifyOtpSchema,
  type ListSessionsResponse,
  type LogoutAllResponse,
  type LogoutResponse,
  type RefreshSessionRequest,
  type RefreshSessionResponse,
  type RequestOtpRequest,
  type RequestOtpResponse,
  type SwitchRoleRequest,
  type SwitchRoleResponse,
  type VerifyOtpRequest,
  type VerifyOtpResponse,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { Public } from "../../authorization/public.decorator";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { AuthIpRateLimitGuard } from "../application/auth-ip-rate-limit.guard";
import { AuthService } from "../application/auth.service";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  public constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(AuthIpRateLimitGuard)
  @Post("otp/request")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Request a mobile-number OTP challenge" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  public requestOtp(
    @Body(new ZodValidationPipe(requestOtpSchema)) body: RequestOtpRequest,
  ): Promise<RequestOtpResponse> {
    return this.auth.requestOtp(body);
  }

  @Public()
  @UseGuards(AuthIpRateLimitGuard)
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify an OTP and create a device session" })
  @ApiResponse({ status: HttpStatus.OK })
  public verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) body: VerifyOtpRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VerifyOtpResponse> {
    return this.auth.verifyOtp(body, requestIdOf(request));
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate a refresh token and issue new tokens" })
  @ApiResponse({ status: HttpStatus.OK })
  public refresh(
    @Body(new ZodValidationPipe(refreshSessionSchema))
    body: RefreshSessionRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<RefreshSessionResponse> {
    return this.auth.refreshSession(body, requestIdOf(request));
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke the current device session" })
  @ApiResponse({ status: HttpStatus.OK })
  public logout(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<LogoutResponse> {
    const principal = request.user;
    if (principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required");
    }
    return this.auth.logout(
      principal.userId,
      principal.sessionId,
      principal.activeRole,
      requestIdOf(request),
    );
  }

  @Get("sessions")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List active device sessions for the signed-in user",
  })
  @ApiResponse({ status: HttpStatus.OK })
  public listSessions(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<ListSessionsResponse> {
    const principal = request.user;
    if (principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required");
    }
    return this.auth.listSessions(principal.userId, principal.sessionId);
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke every active device session for the user" })
  @ApiResponse({ status: HttpStatus.OK })
  public logoutAll(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<LogoutAllResponse> {
    const principal = request.user;
    if (principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required");
    }
    return this.auth.logoutAll(
      principal.userId,
      principal.activeRole,
      requestIdOf(request),
    );
  }

  @Post("switch-role")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Switch the account's active mobile role" })
  @ApiResponse({ status: HttpStatus.OK })
  public switchRole(
    @Body(new ZodValidationPipe(switchRoleSchema)) body: SwitchRoleRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<SwitchRoleResponse> {
    const principal = request.user;
    if (principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required");
    }
    return this.auth.switchRole(
      principal.userId,
      principal.sessionId,
      body.role,
      requestIdOf(request),
    );
  }
}

function requestIdOf(
  request: AuthenticatedPlatformRequest,
): string | undefined {
  const id: unknown = request.id;
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}
