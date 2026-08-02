import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/core/models/quote_request.dart';
import 'package:mee_events/core/providers/quote_provider.dart';
import 'package:intl/intl.dart';

class QuoteChatOverlay extends ConsumerWidget {
  final QuoteRequest quote;

  const QuoteChatOverlay({super.key, required this.quote});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final messages = ref.watch(chatMessagesProvider(quote.id));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.ink),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(quote.vendorName, style: AppTypography.titleMd),
            Text(quote.serviceTitle, style: AppTypography.captionSm.copyWith(color: AppColors.muted)),
          ],
        ),
      ),
      body: Column(
        children: [
          // Itemized Quote Summary Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.surfaceSoft,
              border: const Border(bottom: BorderSide(color: AppColors.hairlineSoft)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('OFFICIAL QUOTATION', style: AppTypography.captionSm.copyWith(color: AppColors.goldAccent, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: quote.status == QuoteStatus.quoteReceived ? AppColors.success.withValues(alpha: 0.1) : AppColors.surfaceStrong,
                        borderRadius: AppRadius.smAll,
                      ),
                      child: Text(
                        quote.status == QuoteStatus.quoteReceived ? 'QUOTE READY' : 'PENDING',
                        style: AppTypography.captionSm.copyWith(
                          color: quote.status == QuoteStatus.quoteReceived ? AppColors.success : AppColors.muted,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total Estimated Price:', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
                    Text(quote.formattedTotal, style: AppTypography.titleMd.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                  ],
                ),
                if (quote.breakdownItems.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  const Divider(color: AppColors.hairlineSoft, height: 1),
                  const SizedBox(height: AppSpacing.sm),
                  ...quote.breakdownItems.map((item) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('• ${item.title}', style: AppTypography.captionSm),
                          Text('₹${item.amount}', style: AppTypography.captionSm.copyWith(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    );
                  }),
                ],
              ],
            ),
          ),

          // Chat Messages List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final msg = messages[index];
                return Align(
                  alignment: msg.isVendor ? Alignment.centerLeft : Alignment.centerRight,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: AppSpacing.md),
                    padding: const EdgeInsets.all(AppSpacing.md),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                    decoration: BoxDecoration(
                      color: msg.isVendor ? AppColors.surfaceSoft : AppColors.primary,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(12),
                        topRight: const Radius.circular(12),
                        bottomLeft: Radius.circular(msg.isVendor ? 0 : 12),
                        bottomRight: Radius.circular(msg.isVendor ? 12 : 0),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          msg.senderName,
                          style: AppTypography.captionSm.copyWith(
                            color: msg.isVendor ? AppColors.goldAccent : AppColors.canvas.withValues(alpha: 0.7),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          msg.text,
                          style: AppTypography.bodySm.copyWith(
                            color: msg.isVendor ? AppColors.ink : AppColors.canvas,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Align(
                          alignment: Alignment.bottomRight,
                          child: Text(
                            DateFormat('hh:mm a').format(msg.timestamp),
                            style: AppTypography.captionSm.copyWith(
                              color: msg.isVendor ? AppColors.muted : AppColors.canvas.withValues(alpha: 0.5),
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Bottom Bar & Action
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: const BoxDecoration(
              color: AppColors.canvas,
              border: Border(top: BorderSide(color: AppColors.hairlineSoft)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSoft,
                        borderRadius: AppRadius.pillAll,
                      ),
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Type your message...',
                          hintStyle: AppTypography.bodySm.copyWith(color: AppColors.muted),
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send, color: AppColors.primary),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Message sent to vendor!')),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
