import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/core/providers/ticket_provider.dart';
import 'package:intl/intl.dart';

class TicketScreen extends ConsumerWidget {
  const TicketScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingState = ref.watch(bookingProvider);
    final ticket = bookingState.value;

    if (ticket == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: AppBar(
          backgroundColor: AppColors.canvas,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.close, color: AppColors.ink),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Center(
          child: Text('No active ticket found.', style: AppTypography.titleMd),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceSoft, // Ivory background for ticket
      appBar: AppBar(
        backgroundColor: AppColors.surfaceSoft,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.ink),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Your Booking', style: AppTypography.titleMd),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            children: [
              // Success Header
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, color: AppColors.success, size: 48),
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Booking Confirmed!', style: AppTypography.displaySm),
              const SizedBox(height: AppSpacing.xs),
              Text('Your royal event is secured.', style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
              const SizedBox(height: AppSpacing.xxl),

              // The Ticket Card
              Container(
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: AppRadius.cardAll,
                  border: Border.all(color: AppColors.goldAccent.withValues(alpha: 0.3)),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.scrim.withValues(alpha: 0.05),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Top Section: Event Image & Title
                    ClipRRect(
                      borderRadius: AppRadius.topCard,
                      child: AspectRatio(
                        aspectRatio: 21 / 9,
                        child: AppImage(
                          imageUrl: ticket.venue.imagePath,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(color: AppColors.surfaceSoft),
                          errorWidget: (context, url, error) => Container(
                            color: AppColors.surfaceStrong,
                            child: const Icon(Icons.image_not_supported, color: AppColors.muted),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(ticket.venue.title, style: AppTypography.titleMd),
                          const SizedBox(height: AppSpacing.xs),
                          Row(
                            children: [
                              const Icon(Icons.location_on, size: 14, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(ticket.venue.location, style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    
                    // Dashed Divider
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                      child: Row(
                        children: List.generate(
                          30,
                          (index) => Expanded(
                            child: Container(
                              height: 1,
                              color: index % 2 == 0 ? AppColors.hairline : Colors.transparent,
                            ),
                          ),
                        ),
                      ),
                    ),

                    // Bottom Section: Details & QR
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildTicketDetail('DATE', DateFormat('MMM dd, yyyy').format(ticket.bookingDate)),
                              const SizedBox(height: AppSpacing.md),
                              _buildTicketDetail('TIME', '10:00 AM Onwards'),
                              const SizedBox(height: AppSpacing.md),
                              _buildTicketDetail('GUESTS', 'Up to 500'),
                            ],
                          ),
                          Column(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(AppSpacing.xs),
                                decoration: BoxDecoration(
                                  color: AppColors.canvas,
                                  borderRadius: AppRadius.smAll,
                                  border: Border.all(color: AppColors.hairline),
                                ),
                                child: QrImageView(
                                  data: ticket.id,
                                  version: QrVersions.auto,
                                  size: 100.0,
                                  eyeStyle: const QrEyeStyle(
                                    eyeShape: QrEyeShape.square,
                                    color: AppColors.primary,
                                  ),
                                  dataModuleStyle: const QrDataModuleStyle(
                                    dataModuleShape: QrDataModuleShape.square,
                                    color: AppColors.ink,
                                  ),
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Text(ticket.id, style: AppTypography.uppercaseTag.copyWith(color: AppColors.muted)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xxl),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    // Return home
                    Navigator.popUntil(context, (route) => route.isFirst);
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
                  ),
                  child: Text('Back to Home', style: AppTypography.buttonMd),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTicketDetail(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.uppercaseTag.copyWith(color: AppColors.muted)),
        const SizedBox(height: 2),
        Text(value, style: AppTypography.titleSm),
      ],
    );
  }
}
