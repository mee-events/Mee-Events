import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createExpenseSchema,
  createVendorSettlementSchema,
  createWorkerPayoutSchema,
  issueInvoiceSchema,
  recordCustomerPaymentSchema,
  recordRefundSchema,
  updateEventFinanceSchema,
  updateVendorSettlementSchema,
  updateWorkerPayoutSchema,
  type CreateExpenseRequest,
  type CreateVendorSettlementRequest,
  type CreateWorkerPayoutRequest,
  type CustomerPaymentFinanceListResponse,
  type CustomerPaymentFinanceSummary,
  type CustomerRefundSummary,
  type EventExpenseListResponse,
  type EventExpenseSummary,
  type EventFinanceDetailResponse,
  type EventFinanceListResponse,
  type EventFinancialSummary,
  type FinanceDashboardResponse,
  type InvoiceListResponse,
  type InvoiceSummary,
  type IssueInvoiceRequest,
  type LedgerListResponse,
  type ReceiptListResponse,
  type RecordCustomerPaymentRequest,
  type RecordRefundRequest,
  type UpdateEventFinanceRequest,
  type UpdateVendorSettlementRequest,
  type UpdateWorkerPayoutRequest,
  type VendorSettlementListResponse,
  type VendorSettlementSummary,
  type WorkerPayoutListResponse,
  type WorkerPayoutSummary,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { FinanceService } from "../application/finance.service";

@ApiTags("CRM Finance")
@ApiBearerAuth()
@Controller("crm/finance")
@UseGuards(CapabilityGuard)
export class CrmFinanceController {
  public constructor(private readonly finance: FinanceService) {}

  @Get("dashboard")
  @RequireCapability("finance.dashboard")
  @ApiOperation({ summary: "Finance dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<FinanceDashboardResponse> {
    return this.finance.getDashboard(principalOf(request));
  }

  @Get("events")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "List event financial summaries" })
  public listEvents(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventFinanceListResponse> {
    return this.finance.listEventFinance(principalOf(request));
  }

  @Get("events/:eventRecordId")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "Event finance detail" })
  public getEvent(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventFinanceDetailResponse> {
    return this.finance.getEventFinance(principalOf(request), eventRecordId);
  }

  @Post("events/:eventRecordId/ensure")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("finance.manage")
  @ApiOperation({ summary: "Ensure event financial summary exists" })
  public ensure(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventFinancialSummary> {
    return this.finance.ensureEventFinance(
      principalOf(request),
      eventRecordId,
      requestIdOf(request),
    );
  }

  @Patch("events/:eventRecordId")
  @RequireCapability("finance.manage")
  @ApiOperation({ summary: "Update budget/revenue/settlement status" })
  public updateEvent(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
    @Body(new ZodValidationPipe(updateEventFinanceSchema))
    body: UpdateEventFinanceRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventFinancialSummary> {
    return this.finance.updateEventFinance(
      principalOf(request),
      eventRecordId,
      body,
      requestIdOf(request),
    );
  }

  @Post("payments")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("finance.manage")
  @ApiOperation({ summary: "Record customer payment against an event" })
  public recordPayment(
    @Body(new ZodValidationPipe(recordCustomerPaymentSchema))
    body: RecordCustomerPaymentRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<CustomerPaymentFinanceSummary> {
    return this.finance.recordCustomerPayment(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("payments")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "List finance customer payments" })
  public listPayments(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<CustomerPaymentFinanceListResponse> {
    return this.finance.listCustomerPayments(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("refunds")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("finance.manage")
  @ApiOperation({ summary: "Record customer refund" })
  public refund(
    @Body(new ZodValidationPipe(recordRefundSchema)) body: RecordRefundRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<CustomerRefundSummary> {
    return this.finance.recordRefund(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("expenses")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "List event expenses" })
  public listExpenses(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventExpenseListResponse> {
    return this.finance.listExpenses(principalOf(request));
  }

  @Post("expenses")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("finance.manage")
  @ApiOperation({ summary: "Create event expense" })
  public createExpense(
    @Body(new ZodValidationPipe(createExpenseSchema))
    body: CreateExpenseRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventExpenseSummary> {
    return this.finance.createExpense(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("vendors")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "List vendor settlements" })
  public listVendorSettlements(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorSettlementListResponse> {
    return this.finance.listVendorSettlements(principalOf(request));
  }

  @Post("vendors")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("finance.settlement")
  @ApiOperation({ summary: "Create vendor settlement" })
  public createVendorSettlement(
    @Body(new ZodValidationPipe(createVendorSettlementSchema))
    body: CreateVendorSettlementRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorSettlementSummary> {
    return this.finance.createVendorSettlement(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Patch("vendors/:settlementId")
  @RequireCapability("finance.settlement")
  @ApiOperation({ summary: "Update vendor settlement status" })
  public updateVendorSettlement(
    @Param("settlementId", new ParseUUIDPipe()) settlementId: string,
    @Body(new ZodValidationPipe(updateVendorSettlementSchema))
    body: UpdateVendorSettlementRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorSettlementSummary> {
    return this.finance.updateVendorSettlement(
      principalOf(request),
      settlementId,
      body,
      requestIdOf(request),
    );
  }

  @Get("workers")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "List worker payouts" })
  public listWorkerPayouts(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerPayoutListResponse> {
    return this.finance.listWorkerPayouts(principalOf(request));
  }

  @Post("workers")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("finance.settlement")
  @ApiOperation({ summary: "Create worker payout" })
  public createWorkerPayout(
    @Body(new ZodValidationPipe(createWorkerPayoutSchema))
    body: CreateWorkerPayoutRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerPayoutSummary> {
    return this.finance.createWorkerPayout(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Patch("workers/:payoutId")
  @RequireCapability("finance.settlement")
  @ApiOperation({ summary: "Update worker payout status" })
  public updateWorkerPayout(
    @Param("payoutId", new ParseUUIDPipe()) payoutId: string,
    @Body(new ZodValidationPipe(updateWorkerPayoutSchema))
    body: UpdateWorkerPayoutRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerPayoutSummary> {
    return this.finance.updateWorkerPayout(
      principalOf(request),
      payoutId,
      body,
      requestIdOf(request),
    );
  }

  @Get("invoices")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "List invoices" })
  public listInvoices(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InvoiceListResponse> {
    return this.finance.listInvoices(principalOf(request));
  }

  @Post("invoices")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("finance.manage")
  @ApiOperation({ summary: "Issue invoice for an event" })
  public issueInvoice(
    @Body(new ZodValidationPipe(issueInvoiceSchema)) body: IssueInvoiceRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InvoiceSummary> {
    return this.finance.issueInvoice(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("receipts")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "List receipts" })
  public listReceipts(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<ReceiptListResponse> {
    return this.finance.listReceipts(principalOf(request));
  }

  @Get("ledger")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "Ledger entries" })
  public listLedger(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<LedgerListResponse> {
    return this.finance.listLedger(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }
}

@ApiTags("Finance Ops")
@ApiBearerAuth()
@Controller("finance")
@UseGuards(CapabilityGuard)
export class FinanceOpsController {
  public constructor(private readonly finance: FinanceService) {}

  @Get("me/payments")
  @RequireCapability("payment.read_own")
  @ApiOperation({ summary: "Customer payment history (event-linked)" })
  public ownPayments(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<CustomerPaymentFinanceListResponse> {
    return this.finance.listOwnCustomerPayments(principalOf(request));
  }

  @Get("me/invoices")
  @RequireCapability("payment.read_own")
  @ApiOperation({ summary: "Customer invoices" })
  public ownInvoices(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InvoiceListResponse> {
    return this.finance.listOwnInvoices(principalOf(request));
  }

  @Get("me/receipts")
  @RequireCapability("payment.read_own")
  @ApiOperation({ summary: "Customer receipts" })
  public ownReceipts(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<ReceiptListResponse> {
    return this.finance.listOwnReceipts(principalOf(request));
  }

  @Get("me/events/:eventRecordId")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "Manager event finance summary" })
  public eventFinance(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventFinanceDetailResponse> {
    return this.finance.getEventFinance(principalOf(request), eventRecordId);
  }

  @Get("me/vendors")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "Manager vendor settlement status" })
  public vendorSettlements(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorSettlementListResponse> {
    return this.finance.listVendorSettlements(principalOf(request));
  }

  @Get("me/workers")
  @RequireCapability("finance.read")
  @ApiOperation({ summary: "Manager worker payout status" })
  public workerPayouts(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerPayoutListResponse> {
    return this.finance.listWorkerPayouts(principalOf(request));
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
