import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/shared/section_header.dart';
import 'package:mee_events/shared/detail_row.dart';

class WorkspaceOverlay extends StatefulWidget {
  const WorkspaceOverlay({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => const WorkspaceOverlay(),
    );
  }

  @override
  State<WorkspaceOverlay> createState() => _WorkspaceOverlayState();
}

class _WorkspaceOverlayState extends State<WorkspaceOverlay> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Event Workspace'),
        backgroundColor: AppColors.canvas,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: AppColors.ink),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(eyebrow: 'YOUR EVENT', title: 'Riya & Arjun Wedding'),
            const SizedBox(height: AppSpacing.md),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                border: Border.all(color: AppColors.hairlineSoft),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: const Column(
                children: [
                  DetailRow(label: 'Date', value: '15 Feb 2025'),
                  DetailRow(label: 'Venue', value: 'Taj Falaknuma Palace'),
                  DetailRow(label: 'Guests', value: '500'),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(eyebrow: 'SELECTED SERVICES', title: '3 services added'),
            const SizedBox(height: AppSpacing.md),
            _buildServiceItem('🏛️', 'Venue', '₹2,50,000'),
            _buildServiceItem('🍽️', 'Catering', '₹1,50,000'),
            _buildServiceItem('🎨', 'Decoration', '₹75,000'),
            const SizedBox(height: AppSpacing.xxl),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    child: const Text('Add services'),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {},
                    child: const Text('Get Quote'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceItem(String emoji, String name, String price) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        border: Border.all(color: AppColors.hairlineSoft),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      padding: const EdgeInsets.all(AppSpacing.md),
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppTypography.caption),
                Text(price, style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.muted),
        ],
      ),
    );
  }
}
