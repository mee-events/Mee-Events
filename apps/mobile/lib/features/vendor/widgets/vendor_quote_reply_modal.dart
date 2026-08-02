import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';

class VendorQuoteReplyModal extends StatefulWidget {
  final String clientName;
  final String eventType;

  const VendorQuoteReplyModal({
    super.key,
    required this.clientName,
    required this.eventType,
  });

  static void show(BuildContext context, {required String clientName, required String eventType}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => VendorQuoteReplyModal(clientName: clientName, eventType: eventType),
    );
  }

  @override
  State<VendorQuoteReplyModal> createState() => _VendorQuoteReplyModalState();
}

class _VendorQuoteReplyModalState extends State<VendorQuoteReplyModal> {
  final _amountController = TextEditingController(text: '350000');

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.canvas,
        borderRadius: AppRadius.topModal,
      ),
      padding: EdgeInsets.only(
        top: AppSpacing.lg,
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: const BoxDecoration(
                color: AppColors.hairlineSoft,
                borderRadius: AppRadius.pillAll,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text('Propose Price Quote', style: AppTypography.displaySm),
          const SizedBox(height: AppSpacing.xs),
          Text('Client: ${widget.clientName} • ${widget.eventType}', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
          const SizedBox(height: AppSpacing.lg),

          Text('Total Price Proposal (₹)', style: AppTypography.titleSm),
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.surfaceSoft,
              borderRadius: AppRadius.smAll,
              border: Border.all(color: AppColors.hairlineSoft),
            ),
            child: TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              style: AppTypography.titleMd,
              decoration: const InputDecoration(
                prefixText: '₹ ',
                border: InputBorder.none,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Quote proposal of ₹${_amountController.text} sent to ${widget.clientName}!'),
                    backgroundColor: AppColors.primary,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.canvas,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
              ),
              child: Text('Submit Proposal to Client', style: AppTypography.buttonMd),
            ),
          ),
        ],
      ),
    );
  }
}
