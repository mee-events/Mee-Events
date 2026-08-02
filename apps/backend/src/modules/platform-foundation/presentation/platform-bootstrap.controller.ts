import {
  Controller,
  Get,
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
import { PlatformFoundationService } from "../application/platform-foundation.service";
import type { PlatformBootstrap } from "../domain/platform-foundation";
import {
  AccessTokenGuard,
  type AuthenticatedPlatformRequest,
} from "../security/access-token.guard";

@ApiTags("Platform foundation")
@ApiBearerAuth()
@Controller("platform")
@UseGuards(AccessTokenGuard)
export class PlatformBootstrapController {
  public constructor(private readonly foundation: PlatformFoundationService) {}

  @Get("bootstrap")
  @ApiOperation({
    summary:
      "Load the authenticated role, Hyderabad branch, modules and capabilities",
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401 })
  public bootstrap(
    @Req() request: AuthenticatedPlatformRequest,
  ): PlatformBootstrap {
    if (request.user === undefined) {
      throw new UnauthorizedException();
    }
    return this.foundation.createBootstrap(request.user, String(request.id));
  }
}
