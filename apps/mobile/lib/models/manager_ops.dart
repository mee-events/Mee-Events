class ManagerDashboardSnapshot {
  final int assignedEvents;
  final int activeTasks;
  final int overdueTasks;
  final int completedTasksToday;
  final List<ManagerTaskSummary> upcomingTasks;
  final List<ManagerTaskSummary> overdueTaskList;
  final List<ManagerEventSummary> myEvents;

  const ManagerDashboardSnapshot({
    required this.assignedEvents,
    required this.activeTasks,
    required this.overdueTasks,
    required this.completedTasksToday,
    required this.upcomingTasks,
    required this.overdueTaskList,
    required this.myEvents,
  });

  factory ManagerDashboardSnapshot.fromJson(Map<String, dynamic> json) {
    return ManagerDashboardSnapshot(
      assignedEvents: json['assignedEvents'] as int? ?? 0,
      activeTasks: json['activeTasks'] as int? ?? 0,
      overdueTasks: json['overdueTasks'] as int? ?? 0,
      completedTasksToday: json['completedTasksToday'] as int? ?? 0,
      upcomingTasks: _tasks(json['upcomingTasks']),
      overdueTaskList: _tasks(json['overdueTaskList']),
      myEvents: ((json['myEvents'] as List<dynamic>?) ?? [])
          .map((e) => ManagerEventSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ManagerEventSummary {
  final String id;
  final String eventNumber;
  final String eventName;
  final String status;
  final String? eventDate;
  final String? venueName;

  const ManagerEventSummary({
    required this.id,
    required this.eventNumber,
    required this.eventName,
    required this.status,
    this.eventDate,
    this.venueName,
  });

  factory ManagerEventSummary.fromJson(Map<String, dynamic> json) {
    return ManagerEventSummary(
      id: json['id'] as String,
      eventNumber: json['eventNumber'] as String? ?? '',
      eventName: json['eventName'] as String? ?? '',
      status: json['status'] as String? ?? '',
      eventDate: json['eventDate'] as String?,
      venueName: json['venueName'] as String?,
    );
  }
}

class ManagerTaskSummary {
  final String id;
  final String eventRecordId;
  final String title;
  final String status;
  final String priority;
  final bool overdue;
  final String? dueAt;
  final String? eventNumber;
  final String? description;

  const ManagerTaskSummary({
    required this.id,
    required this.eventRecordId,
    required this.title,
    required this.status,
    required this.priority,
    required this.overdue,
    this.dueAt,
    this.eventNumber,
    this.description,
  });

  factory ManagerTaskSummary.fromJson(Map<String, dynamic> json) {
    return ManagerTaskSummary(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      title: json['title'] as String? ?? '',
      status: json['status'] as String? ?? '',
      priority: json['priority'] as String? ?? 'normal',
      overdue: json['overdue'] as bool? ?? false,
      dueAt: json['dueAt'] as String?,
      eventNumber: json['eventNumber'] as String?,
      description: json['description'] as String?,
    );
  }
}

class ManagerTaskDetail extends ManagerTaskSummary {
  final List<ManagerTimelineItem> history;
  final List<ManagerTimelineItem> comments;

  const ManagerTaskDetail({
    required super.id,
    required super.eventRecordId,
    required super.title,
    required super.status,
    required super.priority,
    required super.overdue,
    super.dueAt,
    super.eventNumber,
    super.description,
    required this.history,
    required this.comments,
  });

  factory ManagerTaskDetail.fromJson(Map<String, dynamic> json) {
    final base = ManagerTaskSummary.fromJson(json);
    return ManagerTaskDetail(
      id: base.id,
      eventRecordId: base.eventRecordId,
      title: base.title,
      status: base.status,
      priority: base.priority,
      overdue: base.overdue,
      dueAt: base.dueAt,
      eventNumber: base.eventNumber,
      description: base.description,
      history: ((json['history'] as List<dynamic>?) ?? [])
          .map(
            (item) => ManagerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['changeType'] as String? ?? 'history',
              content: item['summary'] as String? ?? '',
              occurredAt: item['occurredAt'] as String? ?? '',
            ),
          )
          .toList(),
      comments: ((json['comments'] as List<dynamic>?) ?? [])
          .map(
            (item) => ManagerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: 'Comment',
              content: item['content'] as String? ?? '',
              occurredAt: item['createdAt'] as String? ?? '',
            ),
          )
          .toList(),
    );
  }
}

class ManagerEventDashboard {
  final ManagerEventSummary event;
  final List<ManagerTaskSummary> tasks;
  final List<ManagerTimelineItem> timeline;
  final List<ManagerTimelineItem> activities;

  const ManagerEventDashboard({
    required this.event,
    required this.tasks,
    required this.timeline,
    required this.activities,
  });

  factory ManagerEventDashboard.fromJson(Map<String, dynamic> json) {
    final eventJson = json['event'] as Map<String, dynamic>;
    return ManagerEventDashboard(
      event: ManagerEventSummary.fromJson(eventJson),
      tasks: _tasks(json['tasks']),
      timeline: ((json['timeline'] as List<dynamic>?) ?? [])
          .map(
            (item) => ManagerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['title'] as String? ?? '',
              content: item['content'] as String? ?? '',
              occurredAt: item['occurredAt'] as String? ?? '',
            ),
          )
          .toList(),
      activities: ((json['activities'] as List<dynamic>?) ?? [])
          .map(
            (item) => ManagerTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['activityType'] as String? ?? '',
              content: item['content'] as String? ?? '',
              occurredAt: item['occurredAt'] as String? ?? '',
            ),
          )
          .toList(),
    );
  }
}

class ManagerTimelineItem {
  final String id;
  final String title;
  final String content;
  final String occurredAt;

  const ManagerTimelineItem({
    required this.id,
    required this.title,
    required this.content,
    required this.occurredAt,
  });
}

List<ManagerTaskSummary> _tasks(dynamic raw) {
  return ((raw as List<dynamic>?) ?? [])
      .map((item) => ManagerTaskSummary.fromJson(item as Map<String, dynamic>))
      .toList();
}
