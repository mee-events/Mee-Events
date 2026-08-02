import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/screens/new_enquiry_screen.dart';
import 'package:mee_events/features/customer/screens/quotation_detail_screen.dart';
import 'package:mee_events/models/enquiry.dart';
import 'package:mee_events/models/quotation.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';

/// Live customer enquiries from GET /enquiries, with linked quotations.
class EnquiriesTab extends ConsumerWidget {
  const EnquiriesTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final enquiries = ref.watch(enquiriesProvider);
    final quotations = ref.watch(quotationsProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Enquiries'),
      body: session == null
          ? MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'Log in to track your enquiries',
              message:
                  'Your submitted enquiries and their live status appear here.',
              actionLabel: 'Log in',
              onAction: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              },
            )
          : enquiries.when(
              loading: () => const Center(child: MeCircularLoader()),
              error: (error, _) => MeErrorState(
                kind: MeErrorKind.network,
                message: '$error',
                onRetry: () {
                  ref.invalidate(enquiriesProvider);
                  ref.invalidate(quotationsProvider);
                },
              ),
              data: (items) => items == null || items.isEmpty
                  ? MeEmptyState(
                      kind: MeEmptyKind.enquiries,
                      actionLabel: 'Plan an event',
                      onAction: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => const NewEnquiryScreen(),
                          ),
                        );
                      },
                    )
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: () async {
                        ref.invalidate(enquiriesProvider);
                        ref.invalidate(quotationsProvider);
                        await Future.wait([
                          ref.read(enquiriesProvider.future),
                          ref.read(quotationsProvider.future),
                        ]);
                      },
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          final enquiry = items[index];
                          final quote = quotations.maybeWhen(
                            data: (list) => list
                                ?.where((q) => q.enquiryId == enquiry.id)
                                .firstOrNull,
                            orElse: () => null,
                          );
                          return Padding(
                            padding: const EdgeInsets.only(
                              bottom: AppSpacing.md,
                            ),
                            child: _EnquiryCard(
                              enquiry: enquiry,
                              quotation: quote,
                            ),
                          );
                        },
                      ),
                    ),
            ),
    );
  }
}

class _EnquiryCard extends StatelessWidget {
  const _EnquiryCard({required this.enquiry, this.quotation});

  final Enquiry enquiry;
  final QuotationSummary? quotation;

  @override
  Widget build(BuildContext context) {
    final isActive =
        enquiry.status != 'closed' && enquiry.status != 'cancelled';
    return InkWell(
      onTap: quotation == null
          ? null
          : () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => QuotationDetailScreen(
                    quotationId: quotation!.id,
                  ),
                ),
              );
            },
      borderRadius: BorderRadius.circular(12),
      child: MeOrderCard(
        reference: enquiry.referenceCode,
        title: enquiry.eventTypeName,
        subtitle: [
          if (enquiry.eventDate != null) enquiry.eventDate!,
          if (enquiry.guestCount != null) '${enquiry.guestCount} guests',
          if (enquiry.location != null) enquiry.location!,
          if (quotation != null) 'Quote ${quotation!.referenceCode}',
        ].where((part) => part.isNotEmpty).join(' · '),
        status: MeBadge(
          label: quotation?.statusLabel ?? enquiry.statusLabel,
          tone: isActive ? MeStatusTone.success : MeStatusTone.neutral,
        ),
      ),
    );
  }
}
