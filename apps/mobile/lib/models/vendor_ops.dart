class VendorDashboardSnapshot {
  final int totalVendors;
  final int activeAssignments;
  final int pendingAcceptances;
  final int completedAssignments;
  final List<VendorAssignmentItem> openAssignments;

  const VendorDashboardSnapshot({
    required this.totalVendors,
    required this.activeAssignments,
    required this.pendingAcceptances,
    required this.completedAssignments,
    required this.openAssignments,
  });

  factory VendorDashboardSnapshot.fromJson(Map<String, dynamic> json) {
    return VendorDashboardSnapshot(
      totalVendors: json['totalVendors'] as int? ?? 0,
      activeAssignments: json['activeAssignments'] as int? ?? 0,
      pendingAcceptances: json['pendingAcceptances'] as int? ?? 0,
      completedAssignments: json['completedAssignments'] as int? ?? 0,
      openAssignments: ((json['openAssignments'] as List<dynamic>?) ?? [])
          .map(
            (item) =>
                VendorAssignmentItem.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}

class VendorAssignmentItem {
  final String id;
  final String eventRecordId;
  final String vendorId;
  final String status;
  final String? eventNumber;
  final String? eventName;
  final String? vendorBusinessName;
  final String? latestProgressSummary;
  final String? assignmentNotes;

  const VendorAssignmentItem({
    required this.id,
    required this.eventRecordId,
    required this.vendorId,
    required this.status,
    this.eventNumber,
    this.eventName,
    this.vendorBusinessName,
    this.latestProgressSummary,
    this.assignmentNotes,
  });

  factory VendorAssignmentItem.fromJson(Map<String, dynamic> json) {
    return VendorAssignmentItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      vendorId: json['vendorId'] as String,
      status: json['status'] as String? ?? '',
      eventNumber: json['eventNumber'] as String?,
      eventName: json['eventName'] as String?,
      vendorBusinessName: json['vendorBusinessName'] as String?,
      latestProgressSummary: json['latestProgressSummary'] as String?,
      assignmentNotes: json['assignmentNotes'] as String?,
    );
  }
}

class VendorAssignmentDetail extends VendorAssignmentItem {
  final List<VendorTimelineItem> history;
  final List<VendorTimelineItem> notes;
  final List<VendorTimelineItem> timeline;

  const VendorAssignmentDetail({
    required super.id,
    required super.eventRecordId,
    required super.vendorId,
    required super.status,
    super.eventNumber,
    super.eventName,
    super.vendorBusinessName,
    super.latestProgressSummary,
    super.assignmentNotes,
    required this.history,
    required this.notes,
    required this.timeline,
  });

  factory VendorAssignmentDetail.fromJson(Map<String, dynamic> json) {
    final base = VendorAssignmentItem.fromJson(json);
    return VendorAssignmentDetail(
      id: base.id,
      eventRecordId: base.eventRecordId,
      vendorId: base.vendorId,
      status: base.status,
      eventNumber: base.eventNumber,
      eventName: base.eventName,
      vendorBusinessName: base.vendorBusinessName,
      latestProgressSummary: base.latestProgressSummary,
      assignmentNotes: base.assignmentNotes,
      history: ((json['history'] as List<dynamic>?) ?? [])
          .map(
            (item) => VendorTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['changeType'] as String? ?? '',
              content: item['summary'] as String? ?? '',
            ),
          )
          .toList(),
      notes: ((json['notes'] as List<dynamic>?) ?? [])
          .map(
            (item) => VendorTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['noteType'] as String? ?? 'note',
              content: item['content'] as String? ?? '',
            ),
          )
          .toList(),
      timeline: ((json['timeline'] as List<dynamic>?) ?? [])
          .map(
            (item) => VendorTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['title'] as String? ?? '',
              content: item['content'] as String? ?? '',
            ),
          )
          .toList(),
    );
  }
}

class VendorTimelineItem {
  final String id;
  final String title;
  final String content;

  const VendorTimelineItem({
    required this.id,
    required this.title,
    required this.content,
  });
}
