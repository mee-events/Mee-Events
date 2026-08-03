import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/workspace/event_workspace_module.dart';
import 'package:mee_events/features/customer/workspace/event_workspace_snapshot.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/shared/detail_row.dart';
import 'package:mee_events/shared/section_header.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

final _inr = NumberFormat.currency(
  locale: 'en_IN',
  symbol: '₹',
  decimalDigits: 0,
);

String _money(String raw) {
  return _inr.format(double.tryParse(raw) ?? 0);
}

/// Loads booking + quotation (+ optional enquiry / event record) for My Event.
final eventWorkspaceProvider = FutureProvider.autoDispose
    .family<EventWorkspaceSnapshot?, String>((ref, bookingId) async {
  final session = ref.watch(sessionProvider);
  if (session == null) return null;

  final api = ref.watch(mobileApiProvider);
  final booking = await api.getBookingDetail(bookingId);
  final quotation = await api.getQuotation(booking.quotationId);

  EventRecordDetail? eventRecord;
  final eventId = booking.eventRecordId;
  if (eventId != null) {
    try {
      eventRecord = await api.getEvent(eventId);
    } catch (_) {
      // Event Record is optional enrichment for this workspace.
    }
  }

  try {
    final enquiry = await api.getEnquiry(booking.enquiryId);
    return EventWorkspaceSnapshot(
      booking: booking,
      quotation: quotation,
      enquiry: enquiry,
      eventRecord: eventRecord,
    );
  } catch (_) {
    return EventWorkspaceSnapshot(
      booking: booking,
      quotation: quotation,
      eventRecord: eventRecord,
    );
  }
});

/// Production customer "My Event" workspace after booking confirmation.
class EventWorkspaceScreen extends ConsumerWidget {
  const EventWorkspaceScreen({
    super.key,
    required this.bookingId,
    this.modules = const [],
  });

  final String bookingId;

  /// Future Vendor / Worker / Event Record modules plug in here.
  final List<EventWorkspaceModule> modules;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncWorkspace = ref.watch(eventWorkspaceProvider(bookingId));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'My Event'),
      body: asyncWorkspace.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          kind: MeErrorKind.network,
          title: 'Could not load your event',
          message: '$error',
          onRetry: () => ref.invalidate(eventWorkspaceProvider(bookingId)),
        ),
        data: (snapshot) {
          if (snapshot == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'Sign in required',
              message: 'Sign in to view your event workspace.',
            );
          }
          return _EventWorkspaceBody(
            snapshot: snapshot,
            modules: modules,
          );
        },
      ),
    );
  }
}

class _EventWorkspaceBody extends ConsumerWidget {
  const _EventWorkspaceBody({
    required this.snapshot,
    required this.modules,
  });

  final EventWorkspaceSnapshot snapshot;
  final List<EventWorkspaceModule> modules;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timeline = snapshot.timeline;

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        ref.invalidate(eventWorkspaceProvider(snapshot.booking.id));
        await ref.read(eventWorkspaceProvider(snapshot.booking.id).future);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          SectionHeader(
            eyebrow: snapshot.eventNumber.toUpperCase(),
            title: snapshot.eventName,
          ),
          const SizedBox(height: AppSpacing.md),
          MeBadge(
            label: snapshot.bookingStatus,
            tone: MeStatusTone.success,
          ),
          const SizedBox(height: AppSpacing.xl),
          MeSurfaceCard(
            child: Column(
              children: [
                DetailRow(label: 'Event number', value: snapshot.eventNumber),
                DetailRow(
                  label: 'Booking number',
                  value: snapshot.bookingNumber,
                ),
                DetailRow(label: 'Event name', value: snapshot.eventName),
                DetailRow(label: 'Event date', value: snapshot.eventDate),
                DetailRow(label: 'Venue', value: snapshot.venue),
                DetailRow(label: 'Guests', value: snapshot.guestCountLabel),
                DetailRow(
                  label: 'Booking status',
                  value: snapshot.bookingStatus,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text('Timeline', style: AppTypography.titleMd),
          const SizedBox(height: AppSpacing.md),
          MeSurfaceCard(
            child: timeline.isEmpty
                ? Text(
                    'Timeline updates will appear as your event progresses.',
                    style: AppTypography.bodyMd.copyWith(
                      color: AppColors.muted,
                    ),
                  )
                : MeTimeline(
                    steps: [
                      for (var i = 0; i < timeline.length; i++)
                        MeTimelineStep(
                          title: timeline[i].title,
                          subtitle: [
                            if (timeline[i].subtitle != null)
                              timeline[i].subtitle!,
                            _formatWhen(timeline[i].occurredAt),
                          ].where((part) => part.isNotEmpty).join(' · '),
                          done: timeline[i].done || i > 0,
                          active: i == 0,
                        ),
                    ],
                  ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text('Payment summary', style: AppTypography.titleMd),
          const SizedBox(height: AppSpacing.md),
          MePaymentCard(
            title: 'Total amount',
            amount: _money(snapshot.totalAmount),
            subtitle: 'Contract value',
          ),
          const SizedBox(height: AppSpacing.sm),
          MePaymentCard(
            title: 'Advance paid',
            amount: _money(snapshot.advancePaid),
            subtitle: 'Collected',
          ),
          const SizedBox(height: AppSpacing.sm),
          MePaymentCard(
            title: 'Remaining balance',
            amount: _money(snapshot.remainingBalance),
            subtitle: 'Due before event',
          ),
          const SizedBox(height: AppSpacing.xl),
          Text('Documents', style: AppTypography.titleMd),
          const SizedBox(height: AppSpacing.md),
          MeSurfaceCard(
            onTap: () => _openQuotationPdf(context, ref),
            child: Row(
              children: [
                const Icon(Icons.description_outlined, color: AppColors.primary),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Quotation', style: AppTypography.titleSm),
                      Text(
                        snapshot.quotation.referenceCode,
                        style: AppTypography.captionSm.copyWith(
                          color: AppColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.download_outlined, color: AppColors.muted),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          MeSurfaceCard(
            onTap: () => _openBookingConfirmationPlaceholder(context),
            child: Row(
              children: [
                const Icon(
                  Icons.verified_outlined,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Booking confirmation',
                        style: AppTypography.titleSm,
                      ),
                      Text(
                        snapshot.bookingNumber,
                        style: AppTypography.captionSm.copyWith(
                          color: AppColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.download_outlined, color: AppColors.muted),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text('Support', style: AppTypography.titleMd),
          const SizedBox(height: AppSpacing.md),
          MeSurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Your event manager', style: AppTypography.titleSm),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Priya Sharma',
                  style: AppTypography.bodyMd.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Assigned manager details will sync from CRM in a later slice.',
                  style: AppTypography.bodySm.copyWith(color: AppColors.muted),
                ),
                const SizedBox(height: AppSpacing.md),
                DetailRow(label: 'Phone', value: '+91 90000 00000'),
                DetailRow(label: 'WhatsApp', value: '+91 90000 00000'),
                DetailRow(label: 'Email', value: 'manager@meeevents.in'),
              ],
            ),
          ),
          for (final module in modules) ...[
            Builder(
              builder: (context) {
                final section = module.buildSection(context, snapshot);
                if (section == null) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.xl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(module.title, style: AppTypography.titleMd),
                      const SizedBox(height: AppSpacing.md),
                      section,
                    ],
                  ),
                );
              },
            ),
          ],
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }

  Future<void> _openQuotationPdf(BuildContext context, WidgetRef ref) async {
    try {
      final api = ref.read(mobileApiProvider);
      final response =
          await api.quotationPdfPlaceholder(snapshot.quotation.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            response['message']?.toString() ??
                'PDF generation is not available yet.',
          ),
        ),
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  void _openBookingConfirmationPlaceholder(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Booking confirmation PDF generation is not available yet.',
        ),
      ),
    );
  }

  String _formatWhen(String iso) {
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    return DateFormat('dd MMM yyyy, hh:mm a').format(parsed.toLocal());
  }
}
