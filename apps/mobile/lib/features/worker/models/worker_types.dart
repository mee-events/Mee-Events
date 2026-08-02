class WorkerShift {
  final String eventName;
  final String venue;
  final String date;
  final String time;
  final String role;

  const WorkerShift({
    required this.eventName,
    required this.venue,
    required this.date,
    required this.time,
    required this.role,
  });
}

class WorkerPreviewData {
  final String name;
  final String id;
  final int upcomingShifts;
  final int approvedDays;
  final WorkerShift? nextShift;
  final List<String> skills;

  const WorkerPreviewData({
    required this.name,
    required this.id,
    required this.upcomingShifts,
    required this.approvedDays,
    this.nextShift,
    required this.skills,
  });
}
