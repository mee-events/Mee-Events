import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/enquiry.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/models/quotation.dart';

class MobileApi {
  final ApiClient apiClient;

  const MobileApi({required this.apiClient});

  Future<PlatformBootstrapResponse> getPlatformBootstrap(String accessToken) async {
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
      body: {
        'challengeId': challengeId,
        'code': code,
        'deviceId': deviceId,
      },
      fromJson: AuthSession.fromJson,
    );
  }

  Future<void> logout() async {
    await apiClient.request<Map<String, dynamic>>(
      '/auth/logout',
      method: 'POST',
      body: {},
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

  Future<Enquiry> createEnquiry({
    required String eventTypeCode,
    String? eventDate,
    String? location,
    int? guestCount,
    String? notes,
    List<String> serviceCategoryCodes = const [],
  }) {
    final body = <String, dynamic>{
      'eventTypeCode': eventTypeCode,
      'serviceCategoryCodes': serviceCategoryCodes,
      'contactPreference': 'phone',
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
}
