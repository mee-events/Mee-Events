class WorkerDashboardSnapshot {
  final int totalWorkers;
  final int activeTasks;
  final int pendingAcceptances;
  final int checkedInToday;
  final int completedTasks;
  final List<WorkerTaskItem> openTasks;

  const WorkerDashboardSnapshot({
    required this.totalWorkers,
    required this.activeTasks,
    required this.pendingAcceptances,
    required this.checkedInToday,
    required this.completedTasks,
    required this.openTasks,
  });

  factory WorkerDashboardSnapshot.fromJson(Map<String, dynamic> json) {
    return WorkerDashboardSnapshot(
      totalWorkers: json['totalWorkers'] as int? ?? 0,
      activeTasks: json['activeTasks'] as int? ?? 0,
      pendingAcceptances: json['pendingAcceptances'] as int? ?? 0,
      checkedInToday: json['checkedInToday'] as int? ?? 0,
      completedTasks: json['completedTasks'] as int? ?? 0,
      openTasks: ((json['openTasks'] as List<dynamic>?) ?? [])
          .map((item) => WorkerTaskItem.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class WorkerTaskItem {
  final String id;
  final String eventRecordId;
  final String workerId;
  final String title;
  final String status;
  final String? eventNumber;
  final String? eventName;
  final String? workerDisplayName;
  final String? latestProgressSummary;
  final String? description;

  const WorkerTaskItem({
    required this.id,
    required this.eventRecordId,
    required this.workerId,
    required this.title,
    required this.status,
    this.eventNumber,
    this.eventName,
    this.workerDisplayName,
    this.latestProgressSummary,
    this.description,
  });

  factory WorkerTaskItem.fromJson(Map<String, dynamic> json) {
    return WorkerTaskItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      workerId: json['workerId'] as String,
      title: json['title'] as String? ?? '',
      status: json['status'] as String? ?? '',
      eventNumber: json['eventNumber'] as String?,
      eventName: json['eventName'] as String?,
      workerDisplayName: json['workerDisplayName'] as String?,
      latestProgressSummary: json['latestProgressSummary'] as String?,
      description: json['description'] as String?,
    );
  }
}

class WorkerTaskDetail extends WorkerTaskItem {
  final List<WorkerTimelineItem> history;
  final List<WorkerTimelineItem> progress;
  final List<WorkerTimelineItem> notes;
  final List<WorkerTimelineItem> timeline;
  final List<WorkerTimelineItem> checkins;

  const WorkerTaskDetail({
    required super.id,
    required super.eventRecordId,
    required super.workerId,
    required super.title,
    required super.status,
    super.eventNumber,
    super.eventName,
    super.workerDisplayName,
    super.latestProgressSummary,
    super.description,
    required this.history,
    required this.progress,
    required this.notes,
    required this.timeline,
    required this.checkins,
  });

  factory WorkerTaskDetail.fromJson(Map<String, dynamic> json) {
    final base = WorkerTaskItem.fromJson(json);
    return WorkerTaskDetail(
      id: base.id,
      eventRecordId: base.eventRecordId,
      workerId: base.workerId,
      title: base.title,
      status: base.status,
      eventNumber: base.eventNumber,
      eventName: base.eventName,
      workerDisplayName: base.workerDisplayName,
      latestProgressSummary: base.latestProgressSummary,
      description: base.description,
      history: ((json['history'] as List<dynamic>?) ?? [])
          .map(
            (item) => WorkerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['changeType'] as String? ?? '',
              content: item['summary'] as String? ?? '',
            ),
          )
          .toList(),
      progress: ((json['progress'] as List<dynamic>?) ?? [])
          .map(
            (item) => WorkerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: 'progress',
              content: item['summary'] as String? ?? '',
            ),
          )
          .toList(),
      notes: ((json['notes'] as List<dynamic>?) ?? [])
          .map(
            (item) => WorkerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['noteType'] as String? ?? 'note',
              content: item['content'] as String? ?? '',
            ),
          )
          .toList(),
      timeline: ((json['timeline'] as List<dynamic>?) ?? [])
          .map(
            (item) => WorkerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['title'] as String? ?? '',
              content: item['content'] as String? ?? '',
            ),
          )
          .toList(),
      checkins: ((json['checkins'] as List<dynamic>?) ?? [])
          .map(
            (item) => WorkerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['checkType'] as String? ?? 'check',
              content:
                  item['locationPlaceholder'] as String? ??
                  item['completionNotes'] as String? ??
                  '',
            ),
          )
          .toList(),
    );
  }
}

class WorkerTimelineItem {
  final String id;
  final String title;
  final String content;

  const WorkerTimelineItem({
    required this.id,
    required this.title,
    required this.content,
  });
}
