import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
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
  verifyOtpSchema,
  type LogoutResponse,
  type RefreshSessionRequest,
  type RefreshSessionResponse,
  type RequestOtpRequest,
  type RequestOtpResponse,
  type VerifyOtpRequest,
  type VerifyOtpResponse,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { Public } from "../../authorization/public.decorator";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { AuthService } from "../application/auth.service";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  public constructor(private readonly auth: AuthService) {}

  @Public()
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
}

function requestIdOf(
  request: AuthenticatedPlatformRequest,
): string | undefined {
  const id: unknown = request.id;
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}
