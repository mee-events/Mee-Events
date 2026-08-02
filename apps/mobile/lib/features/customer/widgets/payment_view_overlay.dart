import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/shared/section_header.dart';

class PaymentViewOverlay extends StatelessWidget {
  const PaymentViewOverlay({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => const PaymentViewOverlay(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Payment'),
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
            const SectionHeader(eyebrow: 'PAYMENT SUMMARY', title: 'Riya & Arjun Wedding'),
            const SizedBox(height: AppSpacing.xl),
            Container(
              decoration: BoxDecoration(
                color: AppColors.mutedSoft,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              padding: const EdgeInsets.all(AppSpacing.xxl),
              child: Center(
                child: Column(
                  children: [
                    Text('Total Amount', style: AppTypography.titleSm.copyWith(color: AppColors.muted)),
                    const SizedBox(height: AppSpacing.xs),
                    Text('₹5,60,500', style: AppTypography.displayLg.copyWith(color: AppColors.ink)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            const SectionHeader(eyebrow: 'PAYMENT PLAN', title: 'Split your payment'),
            const SizedBox(height: AppSpacing.md),
            _buildPaymentCard(
              '30%',
              'Advance Payment',
              '₹1,68,150 • Due now',
              Icons.check_circle,
              AppColors.ink,
            ),
            _buildPaymentCard(
              '70%',
              'Balance Payment',
              '₹3,92,350 • Due before event',
              Icons.circle_outlined,
              AppColors.muted,
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(eyebrow: 'PAYMENT METHOD', title: 'Choose how to pay'),
            const SizedBox(height: AppSpacing.md),
            StatefulBuilder(
              builder: (context, setState) {
                int selectedMethod = 0;
                return Column(
                  children: [
                    _buildPaymentMethodTile(
                      0,
                      selectedMethod,
                      'UPI',
                      Icons.account_balance_wallet,
                      (val) => setState(() => selectedMethod = val),
                    ),
                    _buildPaymentMethodTile(
                      1,
                      selectedMethod,
                      'Credit/Debit Card',
                      Icons.credit_card,
                      (val) => setState(() => selectedMethod = val),
                    ),
                    _buildPaymentMethodTile(
                      2,
                      selectedMethod,
                      'Net Banking',
                      Icons.account_balance,
                      (val) => setState(() => selectedMethod = val),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: AppSpacing.xxl),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.lock),
                label: const Text('Pay ₹1,68,150'),
                onPressed: () {},
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Center(
              child: Text(
                '🔒 Secured by Mee Events',
                style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentCard(String percent, String title, String subtitle, IconData icon, Color iconColor) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        border: Border.all(color: AppColors.hairlineSoft),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: AppColors.mutedSoft,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                percent,
                style: AppTypography.caption.copyWith(color: AppColors.ink),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.titleSm),
                Text(subtitle, style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
              ],
            ),
          ),
          Icon(icon, color: iconColor),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodTile(int index, int selectedIndex, String name, IconData icon, ValueChanged<int> onSelected) {
    final bool isSelected = index == selectedIndex;
    return GestureDetector(
      onTap: () => onSelected(index),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          border: Border.all(color: isSelected ? AppColors.ink : AppColors.hairlineSoft),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        padding: const EdgeInsets.all(AppSpacing.lg),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AppColors.ink : AppColors.muted),
            const SizedBox(width: AppSpacing.md),
            Text(name, style: AppTypography.caption),
            const Spacer(),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.ink : AppColors.hairlineSoft,
                  width: isSelected ? 2.0 : 1.0,
                ),
              ),
              child: isSelected
                  ? Center(
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: const BoxDecoration(
                          color: AppColors.ink,
                          shape: BoxShape.circle,
                        ),
                      ),
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
