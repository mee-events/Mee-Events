import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  submitAdvancePaymentSchema,
  type ConfirmAdvanceResult,
  type PaymentListResponse,
  type PaymentSummary,
  type SubmitAdvancePaymentRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { PaymentService } from "../application/payment.service";

@ApiTags("Payments")
@ApiBearerAuth()
@Controller("payments")
@UseGuards(CapabilityGuard)
export class PaymentController {
  public constructor(private readonly payments: PaymentService) {}

  @Post("advance")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("payment.submit_own")
  @ApiOperation({ summary: "Submit advance payment for an approved quotation" })
  public submitAdvance(
    @Body(new ZodValidationPipe(submitAdvancePaymentSchema))
    body: SubmitAdvancePaymentRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<PaymentSummary> {
    return this.payments.submitAdvance(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get()
  @RequireCapability("payment.read_own")
  @ApiOperation({ summary: "List the customer's payments" })
  public list(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<PaymentListResponse> {
    return this.payments.listOwn(principalOf(request));
  }
}

@ApiTags("CRM Payments")
@ApiBearerAuth()
@Controller("crm/payments")
@UseGuards(CapabilityGuard)
export class CrmPaymentController {
  public constructor(private readonly payments: PaymentService) {}

  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("crm_payment.approve")
  @ApiOperation({
    summary: "Confirm advance payment and create booking",
  })
  public confirm(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<ConfirmAdvanceResult> {
    return this.payments.confirmAdvance(
      principalOf(request),
      id,
      requestIdOf(request),
    );
  }

  @Get("quotation/:quotationId")
  @RequireCapability("crm_payment.read")
  @ApiOperation({ summary: "List pending advance payments for a quotation" })
  public pendingForQuotation(
    @Param("quotationId", new ParseUUIDPipe()) quotationId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<PaymentListResponse> {
    return this.payments.listPendingForQuotation(
      principalOf(request),
      quotationId,
    );
  }
}

function principalOf(
  request: AuthenticatedPlatformRequest,
): AuthenticatedPrincipal {
  const principal = request.user;
  if (principal === undefined) {
    throw new UnauthorizedException("Authenticated principal is required");
  }
  return principal;
}

function requestIdOf(
  request: AuthenticatedPlatformRequest,
): string | undefined {
  const id: unknown = request.id;
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}
