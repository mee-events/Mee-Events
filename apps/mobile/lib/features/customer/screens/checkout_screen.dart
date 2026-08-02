import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/core/models/payment.dart';
import 'package:mee_events/core/models/venue.dart';
import 'package:mee_events/core/providers/ticket_provider.dart';
import 'ticket_screen.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  final EventVenue venue;

  const CheckoutScreen({super.key, required this.venue});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  DepositOption _depositOption = DepositOption.advance25;
  PaymentMethod _paymentMethod = PaymentMethod.gpay;
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    final basePrice = widget.venue.price;
    final gstAmount = (basePrice * 0.18).round();
    const convenienceFee = 2500;
    final totalAmount = basePrice + gstAmount + convenienceFee;
    final payableAmount = _depositOption == DepositOption.advance25
        ? (totalAmount * 0.25).round()
        : totalAmount;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.ink),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Checkout', style: AppTypography.displaySm),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Summary Card
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                borderRadius: AppRadius.cardAll,
                border: Border.all(color: AppColors.hairlineSoft),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.scrim.withValues(alpha: 0.04),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('RESERVATION SUMMARY', style: AppTypography.captionSm.copyWith(color: AppColors.goldAccent, fontWeight: FontWeight.bold)),
                  const SizedBox(height: AppSpacing.sm),
                  Text(widget.venue.title, style: AppTypography.titleMd),
                  Text(widget.venue.location, style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
                  const SizedBox(height: AppSpacing.md),
                  const Divider(color: AppColors.hairlineSoft, height: 1),
                  const SizedBox(height: AppSpacing.md),
                  _buildPriceRow('Venue Package Price', _formatCurrency(basePrice)),
                  const SizedBox(height: 6),
                  _buildPriceRow('GST (18%)', _formatCurrency(gstAmount)),
                  const SizedBox(height: 6),
                  _buildPriceRow('Platform Service Fee', _formatCurrency(convenienceFee)),
                  const SizedBox(height: AppSpacing.md),
                  const Divider(color: AppColors.hairlineSoft, height: 1),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Total Event Cost', style: AppTypography.titleSm),
                      Text(_formatCurrency(totalAmount), style: AppTypography.titleMd.copyWith(color: AppColors.ink, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // Deposit Option Toggle
            Text('Payment Type', style: AppTypography.titleSm),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _depositOption = DepositOption.advance25),
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: _depositOption == DepositOption.advance25 ? AppColors.surfaceSoft : AppColors.canvas,
                        borderRadius: AppRadius.smAll,
                        border: Border.all(
                          color: _depositOption == DepositOption.advance25 ? AppColors.primary : AppColors.hairlineSoft,
                          width: _depositOption == DepositOption.advance25 ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('25% Royal Advance', style: AppTypography.titleSm),
                          const SizedBox(height: 4),
                          Text('Pay balance at venue', style: AppTypography.captionSm.copyWith(color: AppColors.muted)),
                          const SizedBox(height: 8),
                          Text(_formatCurrency((totalAmount * 0.25).round()), style: AppTypography.titleMd.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _depositOption = DepositOption.full),
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: _depositOption == DepositOption.full ? AppColors.surfaceSoft : AppColors.canvas,
                        borderRadius: AppRadius.smAll,
                        border: Border.all(
                          color: _depositOption == DepositOption.full ? AppColors.primary : AppColors.hairlineSoft,
                          width: _depositOption == DepositOption.full ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Full Payment', style: AppTypography.titleSm),
                          const SizedBox(height: 4),
                          Text('100% Protected', style: AppTypography.captionSm.copyWith(color: AppColors.muted)),
                          const SizedBox(height: 8),
                          Text(_formatCurrency(totalAmount), style: AppTypography.titleMd.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),

            // Payment Methods Selection
            Text('Select Payment Method', style: AppTypography.titleSm),
            const SizedBox(height: AppSpacing.sm),

            _buildPaymentOption(
              method: PaymentMethod.gpay,
              icon: Icons.account_balance_wallet,
              title: 'Google Pay / BHIM UPI',
              subtitle: 'Instant 1-tap checkout',
            ),
            _buildPaymentOption(
              method: PaymentMethod.phonepe,
              icon: Icons.mobile_friendly,
              title: 'PhonePe / Paytm UPI',
              subtitle: 'Fast UPI Payment',
            ),
            _buildPaymentOption(
              method: PaymentMethod.card,
              icon: Icons.credit_card,
              title: 'Credit / Debit Card',
              subtitle: 'Visa, MasterCard, RuPay',
            ),
            _buildPaymentOption(
              method: PaymentMethod.netBanking,
              icon: Icons.account_balance,
              title: 'Net Banking',
              subtitle: 'HDFC, ICICI, SBI & major banks',
            ),
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),

      // Bottom Sticky Pay Button
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.primary,
          boxShadow: [
            BoxShadow(
              color: AppColors.scrim.withValues(alpha: 0.1),
              offset: const Offset(0, -4),
              blurRadius: 10,
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('DUE NOW', style: AppTypography.captionSm.copyWith(color: AppColors.goldAccent)),
                  Text(
                    _formatCurrency(payableAmount),
                    style: AppTypography.titleMd.copyWith(color: AppColors.canvas, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: _isProcessing
                    ? null
                    : () async {
                        setState(() => _isProcessing = true);

                        // Trigger booking provider
                        final success = await ref.read(bookingProvider.notifier).bookVenue(widget.venue);

                        if (mounted) {
                          setState(() => _isProcessing = false);
                          if (success) {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(builder: (context) => const TicketScreen()),
                            );
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.goldAccent,
                  foregroundColor: AppColors.ink,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                  shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
                ),
                child: _isProcessing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.ink),
                      )
                    : Text('Pay & Confirm', style: AppTypography.buttonMd),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPriceRow(String label, String amount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
        Text(amount, style: AppTypography.bodySm.copyWith(fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildPaymentOption({
    required PaymentMethod method,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final isSelected = _paymentMethod == method;
    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = method),
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surfaceSoft : AppColors.surfaceCard,
          borderRadius: AppRadius.smAll,
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.hairlineSoft,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AppColors.primary : AppColors.muted, size: 24),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTypography.titleSm),
                  Text(subtitle, style: AppTypography.captionSm.copyWith(color: AppColors.muted)),
                ],
              ),
            ),
            Radio<PaymentMethod>(
              value: method,
              groupValue: _paymentMethod,
              activeColor: AppColors.primary,
              onChanged: (val) {
                if (val != null) setState(() => _paymentMethod = val);
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatCurrency(int amount) {
    final String priceStr = amount.toString();
    if (priceStr.length <= 3) return '₹$priceStr';
    
    String result = priceStr.substring(priceStr.length - 3);
    String remaining = priceStr.substring(0, priceStr.length - 3);
    while (remaining.length > 2) {
      result = '${remaining.substring(remaining.length - 2)},$result';
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.isNotEmpty) {
      result = '$remaining,$result';
    }
    return '₹$result';
  }
}
