import 'package:mee_events/features/worker/models/worker_types.dart';

const workerPreviewData = WorkerPreviewData(
  name: 'Mahesh',
  id: 'W-1042',
  upcomingShifts: 2,
  approvedDays: 18,
  nextShift: WorkerShift(
    eventName: 'Riya & Arjun Wedding',
    venue: 'Taj Falaknuma Palace',
    date: '15 Feb 2025',
    time: '6:00 AM – 11:00 PM',
    role: 'Lead Decorator',
  ),
  skills: ['Decoration', 'Lighting', 'Stage Setup'],
);
