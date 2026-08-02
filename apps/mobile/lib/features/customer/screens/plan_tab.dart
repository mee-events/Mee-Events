import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/screens/event_record_screen.dart';
import 'package:mee_events/features/customer/screens/new_enquiry_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class PlanTab extends ConsumerWidget {
  const PlanTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final liveEvents = ref.watch(eventsProvider).maybeWhen(
          data: (items) => items ?? const [],
          orElse: () => const [],
        );
    final liveBookings = ref.watch(bookingsProvider).maybeWhen(
          data: (items) => items ?? const [],
          orElse: () => const [],
        );

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Your Plans'),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        icon: const Icon(Icons.celebration_outlined),
        label: const Text('Plan an event'),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => session == null
                  ? const LoginScreen()
                  : const NewEnquiryScreen(),
            ),
          );
        },
      ),
      body: liveEvents.isEmpty && liveBookings.isEmpty
          ? const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'No upcoming plans',
              message: 'Submit an enquiry to start planning your event.',
            )
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                if (liveEvents.isNotEmpty) ...[
                  Text('Your events', style: AppTypography.titleMd),
                  const SizedBox(height: AppSpacing.md),
                  for (final event in liveEvents)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: MeOrderCard(
                        reference: event.eventNumber,
                        title: event.eventName,
                        subtitle:
                            '${event.eventDate ?? 'Date TBD'} · ₹${event.advancePaid} advance · ${event.statusLabel}',
                        status: MeBadge(
                          label: event.statusLabel,
                          tone: MeStatusTone.success,
                        ),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) =>
                                  EventRecordScreen(eventId: event.id),
                            ),
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: AppSpacing.lg),
                ],
                if (liveBookings.isNotEmpty && liveEvents.isEmpty) ...[
                  Text('Confirmed bookings', style: AppTypography.titleMd),
                  const SizedBox(height: AppSpacing.md),
                  for (final booking in liveBookings)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: MeOrderCard(
                        reference: booking.bookingNumber,
                        title: booking.eventNumber ??
                            booking.quotationReferenceCode ??
                            'Event booking',
                        subtitle:
                            'Advance paid · ₹${booking.advancePaid} · ${booking.status}',
                        status: const MeBadge(
                          label: 'Confirmed',
                          tone: MeStatusTone.success,
                        ),
                        onTap: () {
                          final eventId = booking.eventRecordId;
                          if (eventId == null) {
                            return;
                          }
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) =>
                                  EventRecordScreen(eventId: eventId),
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ],
            ),
    );
  }
}
