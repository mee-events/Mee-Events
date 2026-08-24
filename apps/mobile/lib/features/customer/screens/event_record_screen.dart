import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/providers/event_record_providers.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class EventRecordScreen extends ConsumerWidget {
  final String eventId;

  const EventRecordScreen({super.key, required this.eventId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncEvent = ref.watch(eventRecordProvider(eventId));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Your event'),
      body: asyncEvent.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load event',
          message: error.toString(),
          onRetry: () => ref.invalidate(eventRecordProvider(eventId)),
        ),
        data: (event) {
          if (event == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'Sign in required',
              message: 'Sign in to view your confirmed event.',
            );
          }
          return _EventRecordBody(event: event);
        },
      ),
    );
  }
}

class _EventRecordBody extends StatelessWidget {
  final EventRecordDetail event;

  const _EventRecordBody({required this.event});

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Text(event.eventName, style: AppTypography.displaySm),
        const SizedBox(height: AppSpacing.xs),
        Text(
          event.eventNumber,
          style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
        ),
        const SizedBox(height: AppSpacing.md),
        MeBadge(label: event.statusLabel, tone: MeStatusTone.success),
        const SizedBox(height: AppSpacing.xl),
        _SectionCard(
          title: 'Booking summary',
          child: Column(
            children: [
              _DetailRow('Booking', event.bookingNumber ?? event.bookingId),
              _DetailRow('Event type', event.eventTypeName),
              _DetailRow('Event date', event.eventDate ?? 'To be confirmed'),
              _DetailRow(
                'Guests',
                event.guestCount?.toString() ?? 'To be confirmed',
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _SectionCard(
          title: 'Venue',
          child: Column(
            children: [
              _DetailRow('Name', event.venueName ?? 'To be confirmed'),
              _DetailRow('Address', event.venueAddress ?? 'To be confirmed'),
              _DetailRow(
                'Maps',
                event.mapsLocationPlaceholder ?? 'Location placeholder',
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _SectionCard(
          title: 'Budget',
          child: Column(
            children: [
              _DetailRow(
                'Total',
                currency.format(double.tryParse(event.budgetAmount) ?? 0),
              ),
              _DetailRow(
                'Advance paid',
                currency.format(double.tryParse(event.advancePaid) ?? 0),
              ),
              _DetailRow(
                'Remaining',
                currency.format(double.tryParse(event.pendingAmount) ?? 0),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _SectionCard(
          title: 'Upcoming milestones',
          child: event.upcomingActions.isEmpty
              ? Text(
                  'No upcoming milestones right now.',
                  style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                )
              : Column(
                  children: [
                    for (final action in event.upcomingActions)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.flag_outlined,
                              size: 16,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(action, style: AppTypography.bodyMd),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _SectionCard(
          title: 'Notes',
          child: event.noteEntries.isEmpty
              ? Text(
                  'No customer notes yet.',
                  style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                )
              : Column(
                  children: [
                    for (final note in event.noteEntries)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(note.content, style: AppTypography.bodyMd),
                            const SizedBox(height: 4),
                            Text(
                              DateFormat('dd MMM yyyy, hh:mm a').format(
                                DateTime.parse(note.updatedAt).toLocal(),
                              ),
                              style: AppTypography.captionSm.copyWith(
                                color: AppColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _SectionCard(
          title: 'Timeline',
          child: event.timeline.isEmpty
              ? Text(
                  'Timeline will appear as your event progresses.',
                  style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                )
              : Column(
                  children: [
                    for (final entry in event.timeline)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              margin: const EdgeInsets.only(top: 4),
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    entry.title,
                                    style: AppTypography.titleSm,
                                  ),
                                  if (entry.content != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      entry.content!,
                                      style: AppTypography.bodySm.copyWith(
                                        color: AppColors.muted,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 2),
                                  Text(
                                    DateFormat('dd MMM yyyy, hh:mm a').format(
                                      DateTime.parse(
                                        entry.occurredAt,
                                      ).toLocal(),
                                    ),
                                    style: AppTypography.captionSm.copyWith(
                                      color: AppColors.muted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: AppRadius.cardAll,
        border: Border.all(color: AppColors.hairlineSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.titleMd),
          const SizedBox(height: AppSpacing.md),
          child,
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: AppTypography.bodySm.copyWith(color: AppColors.muted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
