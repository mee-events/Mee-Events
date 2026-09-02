import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_selection.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/features/customer/search/search_models.dart';
import 'package:mee_events/models/enquiry.dart';
import 'package:mee_events/models/occasion_stage.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/models/manager_ops.dart';
import 'package:mee_events/models/quotation.dart';
import 'package:mee_events/models/vendor_ops.dart';
import 'package:mee_events/models/worker_ops.dart';
import 'package:mee_events/models/inventory_ops.dart';
import 'package:mee_events/models/finance_ops.dart';
import 'package:mee_events/models/operations_ops.dart';

class MobileApi {
  final ApiClient apiClient;

  const MobileApi({required this.apiClient});

  Future<PlatformBootstrapResponse> getPlatformBootstrap() async {
    return apiClient.request<PlatformBootstrapResponse>(
      '/platform/bootstrap',
      method: 'GET',
      fromJson: PlatformBootstrapResponse.fromJson,
    );
  }

  Future<OtpChallenge> requestOtp(String mobileNumber) {
    return apiClient.request<OtpChallenge>(
      '/auth/otp/request',
      method: 'POST',
      body: {'mobileNumber': mobileNumber, 'countryCode': 'IN'},
      fromJson: OtpChallenge.fromJson,
    );
  }

  Future<AuthSession> verifyOtp({
    required String challengeId,
    required String code,
    required String deviceId,
  }) {
    return apiClient.request<AuthSession>(
      '/auth/otp/verify',
      method: 'POST',
      body: {'challengeId': challengeId, 'code': code, 'deviceId': deviceId},
      fromJson: AuthSession.fromJson,
    );
  }

  Future<SessionTokens> refreshSession(String refreshToken) {
    return apiClient.request<SessionTokens>(
      '/auth/refresh',
      method: 'POST',
      body: {'refreshToken': refreshToken},
      fromJson: SessionTokens.fromJson,
    );
  }

  Future<SwitchRoleResult> switchRole(String role) {
    return apiClient.request<SwitchRoleResult>(
      '/auth/switch-role',
      method: 'POST',
      body: {'role': role},
      fromJson: SwitchRoleResult.fromJson,
    );
  }

  Future<void> logout() async {
    await apiClient.request<Map<String, dynamic>>(
      '/auth/logout',
      method: 'POST',
      body: {},
      allowRetryAfterRefresh: true,
    );
  }

  Future<void> logoutAll() async {
    await apiClient.request<Map<String, dynamic>>(
      '/auth/logout-all',
      method: 'POST',
      body: {},
      allowRetryAfterRefresh: true,
    );
  }

  Future<List<CatalogItem>> listEventTypes() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/catalog/event-types',
      method: 'GET',
    );
    final items = response['eventTypes'] as List<dynamic>;
    return items
        .map((item) => CatalogItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<CatalogItem>> listServiceCategories() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/catalog/service-categories',
      method: 'GET',
    );
    final items = response['serviceCategories'] as List<dynamic>;
    return items
        .map((item) => CatalogItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<CatalogService>> listCatalogServices({String? department}) async {
    final query = department != null ? '?department=$department' : '';
    final response = await apiClient.request<Map<String, dynamic>>(
      '/catalog/services$query',
      method: 'GET',
    );
    final items = response['services'] as List<dynamic>;
    return items
        .map((item) => CatalogService.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<OccasionStage>> getOccasionStages(String occasionCode) async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/catalog/occasions/$occasionCode/stages',
      method: 'GET',
    );
    final items = response['stages'] as List<dynamic>;
    return items
        .map((item) => OccasionStage.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<CatalogService>> getServicesForOccasion(
    String occasionCode,
  ) async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/catalog/occasions/$occasionCode/services',
      method: 'GET',
    );
    final items = response['services'] as List<dynamic>;
    return items
        .map((item) => CatalogService.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<CatalogSelection>> getEventSelections(
    String eventTypeCode,
  ) async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/catalog/event-types/$eventTypeCode/selections',
      method: 'GET',
    );
    final items = response['selections'] as List<dynamic>;
    return items
        .map((item) => CatalogSelection.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<CatalogService> getCatalogService(String code) {
    return apiClient.request<CatalogService>(
      '/catalog/services/$code',
      method: 'GET',
      fromJson: CatalogService.fromJson,
    );
  }

  Future<List<CatalogSubcategory>> getServiceSubcategories(
    String serviceCode,
  ) async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/catalog/services/$serviceCode/subcategories',
      method: 'GET',
    );
    final items = response['subcategories'] as List<dynamic>;
    return items
        .map(
          (item) => CatalogSubcategory.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<List<CatalogProduct>> getServiceProducts(
    String serviceCode, {
    String? subcategory,
  }) async {
    final query = subcategory != null ? '?subcategory=$subcategory' : '';
    final response = await apiClient.request<Map<String, dynamic>>(
      '/catalog/services/$serviceCode/products$query',
      method: 'GET',
    );
    final items = response['products'] as List<dynamic>;
    return items
        .map((item) => CatalogProduct.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<CatalogProduct> getCatalogProduct(String productCode) {
    return apiClient.request<CatalogProduct>(
      '/catalog/products/$productCode',
      method: 'GET',
      fromJson: CatalogProduct.fromJson,
    );
  }

  Future<SearchResponse> search(String q, {String? cursor, int? limit}) async {
    final params = <String, String>{'q': q};
    if (cursor != null && cursor.isNotEmpty) params['cursor'] = cursor;
    if (limit != null) params['limit'] = '$limit';
    final query = Uri(queryParameters: params).query;
    final response = await apiClient.request<Map<String, dynamic>>(
      '/search?$query',
      method: 'GET',
    );
    return SearchResponse.fromJson(response);
  }

  Future<List<String>> trendingSearches() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/search/trending',
      method: 'GET',
    );
    final items = response['items'] as List<dynamic>? ?? const [];
    return items.map((item) => item.toString()).toList();
  }

  Future<Enquiry> createEnquiry({
    required String eventTypeCode,
    String? eventDate,
    String? location,
    int? guestCount,
    String? notes,
    List<String> serviceCategoryCodes = const [],
    List<Map<String, dynamic>> planItems = const [],
  }) {
    final body = <String, dynamic>{
      'eventTypeCode': eventTypeCode,
      'serviceCategoryCodes': serviceCategoryCodes,
      'contactPreference': 'phone',
      if (planItems.isNotEmpty) 'planItems': planItems,
    };
    if (eventDate != null) body['eventDate'] = eventDate;
    if (location != null && location.isNotEmpty) body['location'] = location;
    if (guestCount != null) body['guestCount'] = guestCount;
    if (notes != null && notes.isNotEmpty) body['notes'] = notes;

    return apiClient.request<Enquiry>(
      '/enquiries',
      method: 'POST',
      body: body,
      fromJson: Enquiry.fromJson,
    );
  }

  Future<List<Enquiry>> listEnquiries() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/enquiries',
      method: 'GET',
    );
    final items = response['enquiries'] as List<dynamic>;
    return items
        .map((item) => Enquiry.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<QuotationSummary>> listQuotations() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/quotations',
      method: 'GET',
    );
    final items = response['quotations'] as List<dynamic>;
    return items
        .map((item) => QuotationSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<QuotationDetail> getQuotation(String id) {
    return apiClient.request<QuotationDetail>(
      '/quotations/$id',
      method: 'GET',
      fromJson: QuotationDetail.fromJson,
    );
  }

  Future<QuotationDetail> approveQuotation(String id) {
    return apiClient.request<QuotationDetail>(
      '/quotations/$id/approve',
      method: 'POST',
      body: {},
      fromJson: QuotationDetail.fromJson,
    );
  }

  Future<QuotationDetail> rejectQuotation(String id, String reason) {
    return apiClient.request<QuotationDetail>(
      '/quotations/$id/reject',
      method: 'POST',
      body: {'reason': reason},
      fromJson: QuotationDetail.fromJson,
    );
  }

  Future<QuotationDetail> requestQuotationRevision(String id, String message) {
    return apiClient.request<QuotationDetail>(
      '/quotations/$id/request-revision',
      method: 'POST',
      body: {'message': message},
      fromJson: QuotationDetail.fromJson,
    );
  }

  Future<Map<String, dynamic>> quotationPdfPlaceholder(String id) {
    return apiClient.request<Map<String, dynamic>>(
      '/quotations/$id/pdf',
      method: 'GET',
    );
  }

  Future<PaymentRecord> submitAdvancePayment({
    required String quotationId,
    required String method,
    String? notes,
  }) {
    final body = <String, dynamic>{
      'quotationId': quotationId,
      'method': method,
    };
    if (notes != null && notes.isNotEmpty) body['notes'] = notes;
    return apiClient.request<PaymentRecord>(
      '/payments/advance',
      method: 'POST',
      body: body,
      fromJson: PaymentRecord.fromJson,
    );
  }

  Future<List<PaymentRecord>> listPayments() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/payments',
      method: 'GET',
    );
    final items = response['payments'] as List<dynamic>;
    return items
        .map((item) => PaymentRecord.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<BookingSummary>> listBookings() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/bookings',
      method: 'GET',
    );
    final items = response['bookings'] as List<dynamic>;
    return items
        .map((item) => BookingSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<BookingSummary> getBooking(String id) {
    return apiClient.request<BookingSummary>(
      '/bookings/$id',
      method: 'GET',
      fromJson: BookingSummary.fromJson,
    );
  }

  Future<BookingDetail> getBookingDetail(String id) {
    return apiClient.request<BookingDetail>(
      '/bookings/$id',
      method: 'GET',
      fromJson: BookingDetail.fromJson,
    );
  }

  Future<Enquiry> getEnquiry(String id) {
    return apiClient.request<Enquiry>(
      '/enquiries/$id',
      method: 'GET',
      fromJson: Enquiry.fromJson,
    );
  }

  Future<List<EventRecordSummary>> listEvents() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/events',
      method: 'GET',
    );
    final items = response['events'] as List<dynamic>;
    return items
        .map(
          (item) => EventRecordSummary.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<EventRecordDetail> getEvent(String id) {
    return apiClient.request<EventRecordDetail>(
      '/events/$id',
      method: 'GET',
      fromJson: EventRecordDetail.fromJson,
    );
  }

  Future<ManagerDashboardSnapshot> getManagerDashboard() {
    return apiClient.request<ManagerDashboardSnapshot>(
      '/manager/dashboard',
      method: 'GET',
      fromJson: ManagerDashboardSnapshot.fromJson,
    );
  }

  Future<List<ManagerEventSummary>> listManagerEvents() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/manager/events',
      method: 'GET',
    );
    final items = response['events'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => ManagerEventSummary.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<ManagerEventDashboard> getManagerEventDashboard(String eventId) {
    return apiClient.request<ManagerEventDashboard>(
      '/manager/events/$eventId/dashboard',
      method: 'GET',
      fromJson: ManagerEventDashboard.fromJson,
    );
  }

  Future<List<ManagerTaskSummary>> listManagerTodayTasks() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/manager/tasks/today',
      method: 'GET',
    );
    final items = response['tasks'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => ManagerTaskSummary.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<ManagerTaskDetail> getManagerTask(String taskId) {
    return apiClient.request<ManagerTaskDetail>(
      '/manager/tasks/$taskId',
      method: 'GET',
      fromJson: ManagerTaskDetail.fromJson,
    );
  }

  Future<ManagerTaskSummary> completeManagerTask(String taskId) async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/manager/tasks/$taskId/complete',
      method: 'POST',
      body: <String, dynamic>{},
    );
    return ManagerTaskSummary.fromJson(response);
  }

  Future<void> createManagerProgress({
    required String eventId,
    required String updateKind,
    required String summary,
  }) {
    return apiClient.request<Map<String, dynamic>>(
      '/manager/events/$eventId/progress',
      method: 'POST',
      body: {'updateKind': updateKind, 'summary': summary},
    );
  }

  Future<VendorDashboardSnapshot> getVendorDashboard() {
    return apiClient.request<VendorDashboardSnapshot>(
      '/vendors/me/dashboard',
      method: 'GET',
      fromJson: VendorDashboardSnapshot.fromJson,
    );
  }

  Future<List<VendorAssignmentItem>> listVendorAssignments() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/vendors/me/assignments',
      method: 'GET',
    );
    final items = response['assignments'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => VendorAssignmentItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<VendorAssignmentDetail> getVendorAssignment(String assignmentId) {
    return apiClient.request<VendorAssignmentDetail>(
      '/vendors/me/assignments/$assignmentId',
      method: 'GET',
      fromJson: VendorAssignmentDetail.fromJson,
    );
  }

  Future<VendorAssignmentItem> acceptVendorAssignment(String assignmentId) {
    return apiClient.request<VendorAssignmentItem>(
      '/vendors/me/assignments/$assignmentId/accept',
      method: 'POST',
      body: <String, dynamic>{},
      fromJson: VendorAssignmentItem.fromJson,
    );
  }

  Future<VendorAssignmentItem> rejectVendorAssignment(
    String assignmentId,
    String reason,
  ) {
    return apiClient.request<VendorAssignmentItem>(
      '/vendors/me/assignments/$assignmentId/reject',
      method: 'POST',
      body: {'reason': reason},
      fromJson: VendorAssignmentItem.fromJson,
    );
  }

  Future<VendorAssignmentItem> updateVendorProgress({
    required String assignmentId,
    required String summary,
    String? status,
  }) {
    return apiClient.request<VendorAssignmentItem>(
      '/vendors/me/assignments/$assignmentId/progress',
      method: 'POST',
      body: {'summary': summary, 'status': ?status},
      fromJson: VendorAssignmentItem.fromJson,
    );
  }

  Future<WorkerDashboardSnapshot> getWorkerDashboard() {
    return apiClient.request<WorkerDashboardSnapshot>(
      '/workers/me/dashboard',
      method: 'GET',
      fromJson: WorkerDashboardSnapshot.fromJson,
    );
  }

  Future<List<WorkerTaskItem>> listWorkerTasks() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/workers/me/tasks',
      method: 'GET',
    );
    final items = response['tasks'] as List<dynamic>? ?? [];
    return items
        .map((item) => WorkerTaskItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<WorkerTaskDetail> getWorkerTask(String taskId) {
    return apiClient.request<WorkerTaskDetail>(
      '/workers/me/tasks/$taskId',
      method: 'GET',
      fromJson: WorkerTaskDetail.fromJson,
    );
  }

  Future<WorkerTaskItem> acceptWorkerTask(String taskId) {
    return apiClient.request<WorkerTaskItem>(
      '/workers/me/tasks/$taskId/accept',
      method: 'POST',
      body: <String, dynamic>{},
      fromJson: WorkerTaskItem.fromJson,
    );
  }

  Future<WorkerTaskItem> rejectWorkerTask(String taskId, String reason) {
    return apiClient.request<WorkerTaskItem>(
      '/workers/me/tasks/$taskId/reject',
      method: 'POST',
      body: {'reason': reason},
      fromJson: WorkerTaskItem.fromJson,
    );
  }

  Future<WorkerTaskItem> checkInWorkerTask({
    required String taskId,
    String? gpsPlaceholder,
    String? locationPlaceholder,
  }) {
    return apiClient.request<WorkerTaskItem>(
      '/workers/me/tasks/$taskId/check-in',
      method: 'POST',
      body: {
        'gpsPlaceholder': ?gpsPlaceholder,
        'locationPlaceholder': ?locationPlaceholder,
      },
      fromJson: WorkerTaskItem.fromJson,
    );
  }

  Future<WorkerTaskItem> updateWorkerProgress({
    required String taskId,
    required String summary,
    String? status,
    int? percentComplete,
  }) {
    return apiClient.request<WorkerTaskItem>(
      '/workers/me/tasks/$taskId/progress',
      method: 'POST',
      body: {
        'summary': summary,
        'status': ?status,
        'percentComplete': ?percentComplete,
      },
      fromJson: WorkerTaskItem.fromJson,
    );
  }

  Future<WorkerTaskItem> checkOutWorkerTask({
    required String taskId,
    String? completionNotes,
  }) {
    return apiClient.request<WorkerTaskItem>(
      '/workers/me/tasks/$taskId/check-out',
      method: 'POST',
      body: {'markCompleted': true, 'completionNotes': ?completionNotes},
      fromJson: WorkerTaskItem.fromJson,
    );
  }

  Future<InventoryDashboardSnapshot> getInventoryDashboard() {
    return apiClient.request<InventoryDashboardSnapshot>(
      '/inventory/me/dashboard',
      method: 'GET',
      fromJson: InventoryDashboardSnapshot.fromJson,
    );
  }

  Future<List<InventoryAllocationItem>> listInventoryAllocations({
    String? eventRecordId,
  }) async {
    final suffix = eventRecordId == null
        ? ''
        : '?eventRecordId=${Uri.encodeQueryComponent(eventRecordId)}';
    final response = await apiClient.request<Map<String, dynamic>>(
      '/inventory/me/allocations$suffix',
      method: 'GET',
    );
    final items = response['allocations'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) =>
              InventoryAllocationItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<InventoryAllocationDetail> getInventoryAllocation(
    String allocationId,
  ) {
    return apiClient.request<InventoryAllocationDetail>(
      '/inventory/me/allocations/$allocationId',
      method: 'GET',
      fromJson: InventoryAllocationDetail.fromJson,
    );
  }

  Future<InventoryAllocationItem> updateInventoryAllocation({
    required String allocationId,
    required String status,
    String? vehiclePlaceholder,
    String? venuePlaceholder,
  }) {
    return apiClient.request<InventoryAllocationItem>(
      '/inventory/me/allocations/$allocationId',
      method: 'PATCH',
      body: {
        'status': status,
        'vehiclePlaceholder': ?vehiclePlaceholder,
        'venuePlaceholder': ?venuePlaceholder,
      },
      fromJson: InventoryAllocationItem.fromJson,
    );
  }

  Future<InventoryAllocationItem> returnInventoryAllocation(
    String allocationId,
  ) {
    return apiClient.request<InventoryAllocationItem>(
      '/inventory/me/allocations/$allocationId/return',
      method: 'POST',
      body: {'returnedQuantity': 1, 'conditionOnReturn': 'good'},
      fromJson: InventoryAllocationItem.fromJson,
    );
  }

  Future<List<InventoryMovementItem>> listInventoryMovements({
    String? eventRecordId,
  }) async {
    final suffix = eventRecordId == null
        ? ''
        : '?eventRecordId=${Uri.encodeQueryComponent(eventRecordId)}';
    final response = await apiClient.request<Map<String, dynamic>>(
      '/inventory/me/movements$suffix',
      method: 'GET',
    );
    final items = response['movements'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) =>
              InventoryMovementItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<List<FinancePaymentItem>> listMyFinancePayments() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/finance/me/payments',
      method: 'GET',
    );
    final items = response['payments'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => FinancePaymentItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<List<FinanceInvoiceItem>> listMyFinanceInvoices() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/finance/me/invoices',
      method: 'GET',
    );
    final items = response['invoices'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => FinanceInvoiceItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<List<FinanceReceiptItem>> listMyFinanceReceipts() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/finance/me/receipts',
      method: 'GET',
    );
    final items = response['receipts'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => FinanceReceiptItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<EventFinanceSummaryItem> getMyEventFinance(String eventRecordId) {
    return apiClient.request<EventFinanceSummaryItem>(
      '/finance/me/events/$eventRecordId',
      method: 'GET',
      fromJson: EventFinanceSummaryItem.fromJson,
    );
  }

  Future<List<FinanceSettlementItem>> listMyVendorSettlements() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/finance/me/vendors',
      method: 'GET',
    );
    final items = response['settlements'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => FinanceSettlementItem(
            id: (item as Map<String, dynamic>)['id'] as String? ?? '',
            label:
                item['vendorBusinessName'] as String? ??
                item['vendorId'] as String? ??
                '',
            amount: item['amount'] as String? ?? '0',
            status: item['status'] as String? ?? '',
          ),
        )
        .toList();
  }

  Future<List<FinanceSettlementItem>> listMyWorkerPayouts() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/finance/me/workers',
      method: 'GET',
    );
    final items = response['payouts'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => FinanceSettlementItem(
            id: (item as Map<String, dynamic>)['id'] as String? ?? '',
            label:
                item['workerDisplayName'] as String? ??
                item['workerId'] as String? ??
                '',
            amount: item['amount'] as String? ?? '0',
            status: item['status'] as String? ?? '',
          ),
        )
        .toList();
  }

  Future<OperationsDashboardSnapshot> getOperationsDashboard() {
    return apiClient.request<OperationsDashboardSnapshot>(
      '/operations/me/dashboard',
      method: 'GET',
      fromJson: OperationsDashboardSnapshot.fromJson,
    );
  }

  Future<List<OperationsProgressItem>> listOperationsEvents() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/operations/me/events',
      method: 'GET',
    );
    final items = response['events'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) =>
              OperationsProgressItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<EventOperationsDetail> getOperationsEvent(String eventRecordId) {
    return apiClient.request<EventOperationsDetail>(
      '/operations/me/events/$eventRecordId',
      method: 'GET',
      fromJson: EventOperationsDetail.fromJson,
    );
  }

  Future<List<OperationsTaskItem>> listOperationsTasks({
    String? eventRecordId,
  }) async {
    final suffix = eventRecordId == null
        ? ''
        : '?eventRecordId=${Uri.encodeQueryComponent(eventRecordId)}';
    final response = await apiClient.request<Map<String, dynamic>>(
      '/operations/me/tasks$suffix',
      method: 'GET',
    );
    final items = response['tasks'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) => OperationsTaskItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<AttendanceLogItem> checkInOperationsAttendance(
    Map<String, dynamic> body,
  ) {
    return apiClient.request<AttendanceLogItem>(
      '/operations/me/attendance/check-in',
      method: 'POST',
      body: body,
      fromJson: AttendanceLogItem.fromJson,
    );
  }

  Future<AttendanceLogItem> checkOutOperationsAttendance(
    Map<String, dynamic> body,
  ) {
    return apiClient.request<AttendanceLogItem>(
      '/operations/me/attendance/check-out',
      method: 'POST',
      body: body,
      fromJson: AttendanceLogItem.fromJson,
    );
  }

  Future<List<AttendanceLogItem>> listOperationsAttendance({
    String? eventRecordId,
  }) async {
    final suffix = eventRecordId == null
        ? ''
        : '?eventRecordId=${Uri.encodeQueryComponent(eventRecordId)}';
    final response = await apiClient.request<Map<String, dynamic>>(
      '/operations/me/attendance$suffix',
      method: 'GET',
    );
    final items = response['logs'] as List<dynamic>? ?? [];
    return items
        .map((item) => AttendanceLogItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<EventIssueItem> createOperationsIssue(Map<String, dynamic> body) {
    return apiClient.request<EventIssueItem>(
      '/operations/me/issues',
      method: 'POST',
      body: body,
      fromJson: EventIssueItem.fromJson,
    );
  }

  Future<List<EventIssueItem>> listOperationsIssues({
    String? eventRecordId,
  }) async {
    final suffix = eventRecordId == null
        ? ''
        : '?eventRecordId=${Uri.encodeQueryComponent(eventRecordId)}';
    final response = await apiClient.request<Map<String, dynamic>>(
      '/operations/me/issues$suffix',
      method: 'GET',
    );
    final items = response['issues'] as List<dynamic>? ?? [];
    return items
        .map((item) => EventIssueItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<EventPhotoItem> uploadOperationsPhoto(Map<String, dynamic> body) {
    return apiClient.request<EventPhotoItem>(
      '/operations/me/photos',
      method: 'POST',
      body: body,
      fromJson: EventPhotoItem.fromJson,
    );
  }

  Future<List<OperationsProgressItem>> listOperationsProgress() async {
    final response = await apiClient.request<Map<String, dynamic>>(
      '/operations/me/progress',
      method: 'GET',
    );
    final items = response['progress'] as List<dynamic>? ?? [];
    return items
        .map(
          (item) =>
              OperationsProgressItem.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }
}
