import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/features/worker/data/worker_preview_data.dart';
import 'package:mee_events/shared/dashboard_scaffold.dart';
import 'package:mee_events/shared/section_header.dart';
import 'package:mee_events/shared/summary_card.dart';
import 'package:mee_events/shared/detail_row.dart';

class WorkerDashboardScreen extends StatefulWidget {
  const WorkerDashboardScreen({super.key});

  @override
  State<WorkerDashboardScreen> createState() => _WorkerDashboardScreenState();
}

class _WorkerDashboardScreenState extends State<WorkerDashboardScreen> {
  bool _isCheckedIn = false;
  final List<Map<String, dynamic>> _checklist = [
    {'task': 'Stage Lighting & Truss Rigging Check', 'completed': true},
    {'task': 'VIP Lounge Floral Arrangement', 'completed': true},
    {'task': 'Audio Sound System Soundcheck', 'completed': false},
    {'task': 'Steward Briefing & Dinner Counter Ready', 'completed': false},
  ];

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      accentColor: AppColors.workerAccent,
      roleBadge: 'Worker',
      title: 'Worker Dashboard',
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SectionHeader(
                eyebrow: 'DASHBOARD',
                title: 'Hello, Mahesh',
              ),
              const SizedBox(height: AppSpacing.xl),

              // Summary Cards
              Row(
                children: [
                  Expanded(
                    child: SummaryCard(
                      label: 'Upcoming shifts',
                      value: workerPreviewData.upcomingShifts.toString(),
                      tone: SummaryTone.green,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: SummaryCard(
                      label: 'Approved days',
                      value: workerPreviewData.approvedDays.toString(),
                      tone: SummaryTone.gold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),

              // Next Shift Card with Check-In Toggle
              if (workerPreviewData.nextShift != null) ...[
                SectionHeader(
                  eyebrow: 'TODAY\'S SHIFT',
                  title: workerPreviewData.nextShift!.eventName,
                ),
                const SizedBox(height: AppSpacing.md),
                Card(
                  color: AppColors.surfaceCard,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    side: BorderSide(
                      color: _isCheckedIn ? AppColors.success : AppColors.hairlineSoft,
                      width: _isCheckedIn ? 2 : 1,
                    ),
                    borderRadius: AppRadius.cardAll,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        DetailRow(label: 'Venue', value: workerPreviewData.nextShift!.venue),
                        DetailRow(label: 'Date', value: workerPreviewData.nextShift!.date),
                        DetailRow(label: 'Time', value: workerPreviewData.nextShift!.time),
                        DetailRow(label: 'Role', value: workerPreviewData.nextShift!.role),
                        const SizedBox(height: AppSpacing.md),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              setState(() => _isCheckedIn = !_isCheckedIn);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(_isCheckedIn ? 'Checked in to Taj Falaknuma!' : 'Checked out.'),
                                  backgroundColor: _isCheckedIn ? AppColors.success : AppColors.primary,
                                ),
                              );
                            },
                            icon: Icon(_isCheckedIn ? Icons.check_circle : Icons.qr_code_scanner),
                            label: Text(_isCheckedIn ? 'Checked In (Shift Active)' : 'Clock In Now'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _isCheckedIn ? AppColors.success : AppColors.primary,
                              foregroundColor: AppColors.canvas,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
              ],

              // Event Day Checklist
              const SectionHeader(
                eyebrow: 'CHECKLIST',
                title: 'Event Day Tasks',
              ),
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCard,
                  borderRadius: AppRadius.cardAll,
                  border: Border.all(color: AppColors.hairlineSoft),
                ),
                child: Column(
                  children: _checklist.map((item) {
                    return CheckboxListTile(
                      title: Text(
                        item['task'],
                        style: AppTypography.bodySm.copyWith(
                          decoration: item['completed'] ? TextDecoration.lineThrough : null,
                          color: item['completed'] ? AppColors.muted : AppColors.ink,
                        ),
                      ),
                      value: item['completed'],
                      activeColor: AppColors.primary,
                      onChanged: (val) {
                        setState(() {
                          item['completed'] = val ?? false;
                        });
                      },
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
