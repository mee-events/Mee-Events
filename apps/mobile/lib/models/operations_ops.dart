class OperationsDashboardSnapshot {
  final int totalEvents;
  final int inProgressEvents;
  final int completedEvents;
  final int openIssues;
  final int pendingTasks;
  final int checkedInWorkers;

  const OperationsDashboardSnapshot({
    required this.totalEvents,
    required this.inProgressEvents,
    required this.completedEvents,
    required this.openIssues,
    required this.pendingTasks,
    required this.checkedInWorkers,
  });

  factory OperationsDashboardSnapshot.fromJson(Map<String, dynamic> json) {
    return OperationsDashboardSnapshot(
      totalEvents: json['totalEvents'] as int? ?? 0,
      inProgressEvents: json['inProgressEvents'] as int? ?? 0,
      completedEvents: json['completedEvents'] as int? ?? 0,
      openIssues: json['openIssues'] as int? ?? 0,
      pendingTasks: json['pendingTasks'] as int? ?? 0,
      checkedInWorkers: json['checkedInWorkers'] as int? ?? 0,
    );
  }
}

class OperationsProgressItem {
  final String id;
  final String eventRecordId;
  final String? eventNumber;
  final String? eventName;
  final int totalTasks;
  final int completedTasks;
  final int pendingTasks;
  final int overallCompletionPercent;
  final String status;

  const OperationsProgressItem({
    required this.id,
    required this.eventRecordId,
    this.eventNumber,
    this.eventName,
    required this.totalTasks,
    required this.completedTasks,
    required this.pendingTasks,
    required this.overallCompletionPercent,
    required this.status,
  });

  factory OperationsProgressItem.fromJson(Map<String, dynamic> json) {
    return OperationsProgressItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      eventNumber: json['eventNumber'] as String?,
      eventName: json['eventName'] as String?,
      totalTasks: json['totalTasks'] as int? ?? 0,
      completedTasks: json['completedTasks'] as int? ?? 0,
      pendingTasks: json['pendingTasks'] as int? ?? 0,
      overallCompletionPercent: json['overallCompletionPercent'] as int? ?? 0,
      status: json['status'] as String? ?? '',
    );
  }
}

class OperationsTaskItem {
  final String id;
  final String eventRecordId;
  final String? eventNumber;
  final String title;
  final String? description;
  final String priority;
  final String status;
  final String category;
  final int completionPercent;
  final bool isMandatory;
  final String? startAt;
  final String? endAt;
  final String? notes;

  const OperationsTaskItem({
    required this.id,
    required this.eventRecordId,
    this.eventNumber,
    required this.title,
    this.description,
    required this.priority,
    required this.status,
    required this.category,
    required this.completionPercent,
    required this.isMandatory,
    this.startAt,
    this.endAt,
    this.notes,
  });

  factory OperationsTaskItem.fromJson(Map<String, dynamic> json) {
    return OperationsTaskItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      eventNumber: json['eventNumber'] as String?,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      priority: json['priority'] as String? ?? 'normal',
      status: json['status'] as String? ?? '',
      category: json['category'] as String? ?? '',
      completionPercent: json['completionPercent'] as int? ?? 0,
      isMandatory: json['isMandatory'] as bool? ?? false,
      startAt: json['startAt'] as String?,
      endAt: json['endAt'] as String?,
      notes: json['notes'] as String?,
    );
  }
}

class AttendanceLogItem {
  final String id;
  final String eventRecordId;
  final String workerId;
  final String? workerName;
  final String? taskId;
  final String? checkInAt;
  final String? checkOutAt;
  final String status;
  final int? workingMinutes;

  const AttendanceLogItem({
    required this.id,
    required this.eventRecordId,
    required this.workerId,
    this.workerName,
    this.taskId,
    this.checkInAt,
    this.checkOutAt,
    required this.status,
    this.workingMinutes,
  });

  factory AttendanceLogItem.fromJson(Map<String, dynamic> json) {
    return AttendanceLogItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      workerId: json['workerId'] as String,
      workerName: json['workerName'] as String?,
      taskId: json['taskId'] as String?,
      checkInAt: json['checkInAt'] as String?,
      checkOutAt: json['checkOutAt'] as String?,
      status: json['status'] as String? ?? '',
      workingMinutes: json['workingMinutes'] as int?,
    );
  }
}

class EventIssueItem {
  final String id;
  final String eventRecordId;
  final String issueType;
  final String priority;
  final String status;
  final String description;
  final String createdAt;

  const EventIssueItem({
    required this.id,
    required this.eventRecordId,
    required this.issueType,
    required this.priority,
    required this.status,
    required this.description,
    required this.createdAt,
  });

  factory EventIssueItem.fromJson(Map<String, dynamic> json) {
    return EventIssueItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      issueType: json['issueType'] as String? ?? 'other',
      priority: json['priority'] as String? ?? 'normal',
      status: json['status'] as String? ?? '',
      description: json['description'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class EventPhotoItem {
  final String id;
  final String eventRecordId;
  final String category;
  final String? caption;
  final String? storageKey;

  const EventPhotoItem({
    required this.id,
    required this.eventRecordId,
    required this.category,
    this.caption,
    this.storageKey,
  });

  factory EventPhotoItem.fromJson(Map<String, dynamic> json) {
    return EventPhotoItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      category: json['category'] as String? ?? '',
      caption: json['caption'] as String?,
      storageKey: json['storageKey'] as String?,
    );
  }
}

class MaterialUsageItem {
  final String id;
  final String eventRecordId;
  final String itemLabel;
  final num quantityIssued;
  final num quantityUsed;
  final num quantityReturned;
  final num quantityDamaged;
  final num quantityLost;
  final String status;

  const MaterialUsageItem({
    required this.id,
    required this.eventRecordId,
    required this.itemLabel,
    required this.quantityIssued,
    required this.quantityUsed,
    required this.quantityReturned,
    required this.quantityDamaged,
    required this.quantityLost,
    required this.status,
  });

  factory MaterialUsageItem.fromJson(Map<String, dynamic> json) {
    return MaterialUsageItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      itemLabel: json['itemLabel'] as String? ?? '',
      quantityIssued: json['quantityIssued'] as num? ?? 0,
      quantityUsed: json['quantityUsed'] as num? ?? 0,
      quantityReturned: json['quantityReturned'] as num? ?? 0,
      quantityDamaged: json['quantityDamaged'] as num? ?? 0,
      quantityLost: json['quantityLost'] as num? ?? 0,
      status: json['status'] as String? ?? '',
    );
  }
}

class EventOperationsDetail {
  final String eventRecordId;
  final String? eventNumber;
  final String? eventName;
  final OperationsProgressItem progress;
  final List<OperationsTaskItem> tasks;
  final List<AttendanceLogItem> attendance;
  final List<EventIssueItem> issues;
  final List<EventPhotoItem> photos;
  final List<MaterialUsageItem> materials;

  const EventOperationsDetail({
    required this.eventRecordId,
    this.eventNumber,
    this.eventName,
    required this.progress,
    required this.tasks,
    required this.attendance,
    required this.issues,
    required this.photos,
    required this.materials,
  });

  factory EventOperationsDetail.fromJson(Map<String, dynamic> json) {
    final progressJson =
        json['progress'] as Map<String, dynamic>? ??
        <String, dynamic>{
          'id': json['eventRecordId'] as String? ?? '',
          'eventRecordId': json['eventRecordId'] as String? ?? '',
        };
    return EventOperationsDetail(
      eventRecordId: json['eventRecordId'] as String,
      eventNumber: json['eventNumber'] as String?,
      eventName: json['eventName'] as String?,
      progress: OperationsProgressItem.fromJson(progressJson),
      tasks: ((json['tasks'] as List<dynamic>?) ?? [])
          .map((e) => OperationsTaskItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      attendance: ((json['attendance'] as List<dynamic>?) ?? [])
          .map((e) => AttendanceLogItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      issues: ((json['issues'] as List<dynamic>?) ?? [])
          .map((e) => EventIssueItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      photos: ((json['photos'] as List<dynamic>?) ?? [])
          .map((e) => EventPhotoItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      materials: ((json['materials'] as List<dynamic>?) ?? [])
          .map((e) => MaterialUsageItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
