import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/screens/quotation_detail_screen.dart';
import 'package:mee_events/models/enquiry.dart';
import 'package:mee_events/shared/detail_row.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

final enquiryDetailProvider = FutureProvider.autoDispose
    .family<Enquiry?, String>((ref, enquiryId) async {
      final session = ref.watch(sessionProvider);
      if (session == null) return null;
      return ref.watch(mobileApiProvider).getEnquiry(enquiryId);
    });

/// Customer-facing enquiry status detail (works before a quotation exists).
class EnquiryDetailScreen extends ConsumerWidget {
  const EnquiryDetailScreen({super.key, required this.enquiryId});

  final String enquiryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncEnquiry = ref.watch(enquiryDetailProvider(enquiryId));
    final quotations = ref.watch(quotationsProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: 'Enquiry',
        leading: MeIconButton(
          icon: Icons.arrow_back_rounded,
          color: AppColors.ink,
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
      ),
      body: asyncEnquiry.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          kind: MeErrorKind.network,
          message: '$error',
          onRetry: () => ref.invalidate(enquiryDetailProvider(enquiryId)),
        ),
        data: (enquiry) {
          if (enquiry == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'Sign in required',
              message: 'Sign in to view this enquiry.',
            );
          }
          final quote = quotations.maybeWhen(
            data: (list) =>
                list?.where((q) => q.enquiryId == enquiry.id).firstOrNull,
            orElse: () => null,
          );
          final statusTone =
              enquiry.status == 'closed' || enquiry.status == 'cancelled'
              ? MeStatusTone.neutral
              : MeStatusTone.brand;

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              ref.invalidate(enquiryDetailProvider(enquiryId));
              ref.invalidate(quotationsProvider);
              await ref.read(enquiryDetailProvider(enquiryId).future);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                Text(enquiry.eventTypeName, style: AppTypography.titleLg),
                const SizedBox(height: AppSpacing.sm),
                MeBadge(label: enquiry.statusLabel, tone: statusTone),
                const SizedBox(height: AppSpacing.xl),
                Text(
                  'DETAILS',
                  style: AppTypography.eyebrow.copyWith(
                    color: AppColors.goldAccent,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                MeSurfaceCard(
                  child: Column(
                    children: [
                      DetailRow(
                        label: 'Reference',
                        value: enquiry.referenceCode,
                      ),
                      if (enquiry.eventDate != null)
                        DetailRow(
                          label: 'Event date',
                          value: enquiry.eventDate!,
                        ),
                      if (enquiry.location != null)
                        DetailRow(label: 'Location', value: enquiry.location!),
                      if (enquiry.guestCount != null)
                        DetailRow(
                          label: 'Guests',
                          value: '${enquiry.guestCount}',
                        ),
                      DetailRow(label: 'Status', value: enquiry.statusLabel),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                Text(
                  'WHAT HAPPENS NEXT',
                  style: AppTypography.eyebrow.copyWith(
                    color: AppColors.goldAccent,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                MeSurfaceCard(
                  child: Text(
                    _statusGuidance(enquiry.status),
                    style: AppTypography.bodyMd.copyWith(
                      color: AppColors.muted,
                    ),
                  ),
                ),
                if (quote != null) ...[
                  const SizedBox(height: AppSpacing.xl),
                  MeButton.primary(
                    label: 'View quotation ${quote.referenceCode}',
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) =>
                              QuotationDetailScreen(quotationId: quote.id),
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

String _statusGuidance(String status) {
  switch (status) {
    case 'received':
      return 'We received your enquiry. A Marketing Manager will claim it shortly.';
    case 'contact_pending':
      return 'A Mee Events manager owns your lead and will contact you soon.';
    case 'in_discussion':
      return 'Requirements are being captured. A quotation will follow.';
    case 'proposal_expected':
      return 'Your quotation is being prepared.';
    case 'closed':
      return 'This enquiry is closed.';
    case 'cancelled':
      return 'This enquiry was cancelled.';
    default:
      return 'Pull to refresh for the latest status from Mee Events.';
  }
}
