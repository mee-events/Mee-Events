class VendorOpportunity {
  final String title;
  final String client;
  final String date;
  final String status;
  final String? estimatedValue;

  const VendorOpportunity({
    required this.title,
    required this.client,
    required this.date,
    required this.status,
    this.estimatedValue,
  });
}

class VendorPreviewData {
  final String businessName;
  final String id;
  final int newRequests;
  final int activeJobs;
  final String priceReviewStatus;
  final VendorOpportunity? nextOpportunity;

  const VendorPreviewData({
    required this.businessName,
    required this.id,
    required this.newRequests,
    required this.activeJobs,
    required this.priceReviewStatus,
    this.nextOpportunity,
  });
}
