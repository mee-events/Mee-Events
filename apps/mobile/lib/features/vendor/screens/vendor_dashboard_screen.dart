import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/features/vendor/data/vendor_preview_data.dart';
import 'package:mee_events/features/vendor/widgets/vendor_quote_reply_modal.dart';
import 'package:mee_events/shared/dashboard_scaffold.dart';
import 'package:mee_events/shared/section_header.dart';
import 'package:mee_events/shared/summary_card.dart';
import 'package:mee_events/shared/detail_row.dart';

class VendorDashboardScreen extends StatefulWidget {
  const VendorDashboardScreen({super.key});

  @override
  State<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends State<VendorDashboardScreen> {
  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      accentColor: AppColors.vendorAccent,
      roleBadge: 'Vendor',
      title: 'Vendor Dashboard',
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(
                eyebrow: 'DASHBOARD',
                title: 'Hello, ${vendorPreviewData.businessName}',
              ),
              const SizedBox(height: AppSpacing.xl),

              // Summary Cards
              Row(
                children: [
                  Expanded(
                    child: SummaryCard(
                      label: 'New requests',
                      value: vendorPreviewData.newRequests.toString(),
                      tone: SummaryTone.gold,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: SummaryCard(
                      label: 'Active jobs',
                      value: vendorPreviewData.activeJobs.toString(),
                      tone: SummaryTone.green,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),

              // Price Review Status Card
              Card(
                color: AppColors.surfaceCard,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: AppColors.hairlineSoft),
                  borderRadius: AppRadius.cardAll,
                ),
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Price review status', style: AppTypography.bodyMd),
                      Text(
                        vendorPreviewData.priceReviewStatus,
                        style: AppTypography.titleSm.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),

              // Next Opportunity
              if (vendorPreviewData.nextOpportunity != null) ...[
                SectionHeader(
                  eyebrow: 'NEXT OPPORTUNITY',
                  title: vendorPreviewData.nextOpportunity!.title,
                ),
                const SizedBox(height: AppSpacing.md),
                Card(
                  color: AppColors.surfaceCard,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    side: const BorderSide(color: AppColors.hairlineSoft),
                    borderRadius: AppRadius.cardAll,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: Column(
                      children: [
                        DetailRow(label: 'Client', value: vendorPreviewData.nextOpportunity!.client),
                        DetailRow(label: 'Date', value: vendorPreviewData.nextOpportunity!.date),
                        DetailRow(label: 'Status', value: vendorPreviewData.nextOpportunity!.status),
                        DetailRow(label: 'Est. Value', value: vendorPreviewData.nextOpportunity!.estimatedValue ?? 'N/A'),
                        const SizedBox(height: AppSpacing.md),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {
                              VendorQuoteReplyModal.show(
                                context,
                                clientName: vendorPreviewData.nextOpportunity!.client,
                                eventType: vendorPreviewData.nextOpportunity!.title,
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: AppColors.canvas,
                              shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
                            ),
                            child: Text('Propose Quote Now', style: AppTypography.buttonSm),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
              ],

              // Quick Actions Grid
              const SectionHeader(
                eyebrow: 'QUICK ACTIONS',
                title: 'Vendor Controls',
              ),
              const SizedBox(height: AppSpacing.md),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: AppSpacing.md,
                crossAxisSpacing: AppSpacing.md,
                children: [
                  _buildInteractiveActionTile(
                    icon: Icons.rate_review,
                    label: 'Review Request',
                    onTap: () {
                      VendorQuoteReplyModal.show(
                        context,
                        clientName: 'Vinay (Taj Falaknuma Wedding)',
                        eventType: 'Hyderabadi Shahi Dawat',
                      );
                    },
                  ),
                  _buildInteractiveActionTile(
                    icon: Icons.local_offer,
                    label: 'Propose Price',
                    onTap: () {
                      VendorQuoteReplyModal.show(
                        context,
                        clientName: 'Rahul (Jubilee Hills Gala)',
                        eventType: 'Nizami Stage & Decor',
                      );
                    },
                  ),
                  _buildInteractiveActionTile(
                    icon: Icons.trending_up,
                    label: 'Job Progress',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Chowmahalla Palace Setup: 85% Completed')),
                      );
                    },
                  ),
                  _buildInteractiveActionTile(
                    icon: Icons.payments,
                    label: 'Payments',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Total Month Revenue: ₹18.50 Lakhs Received')),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInteractiveActionTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          borderRadius: AppRadius.cardAll,
          border: Border.all(color: AppColors.hairlineSoft),
          boxShadow: [
            BoxShadow(
              color: AppColors.scrim.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: AppColors.primary),
            const SizedBox(height: AppSpacing.sm),
            Text(label, style: AppTypography.titleSm, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
