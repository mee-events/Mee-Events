import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/core/models/venue.dart';
import 'package:mee_events/core/providers/ticket_provider.dart';
import 'ticket_screen.dart';
import 'checkout_screen.dart';

class EventDetailScreen extends ConsumerStatefulWidget {
  final EventVenue venue;

  const EventDetailScreen({super.key, required this.venue});

  @override
  ConsumerState<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends ConsumerState<EventDetailScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(context),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: AppSpacing.xl),
                  Text(widget.venue.title, style: AppTypography.displayLg),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, size: 20, color: AppColors.goldAccent),
                      const SizedBox(width: 4),
                      Text(widget.venue.rating.toStringAsFixed(2), style: AppTypography.titleMd.copyWith(color: AppColors.primary)),
                      Text(' (${widget.venue.reviewCount} Reviews)', style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
                      const SizedBox(width: 8),
                      Text('·', style: AppTypography.bodyMd),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.venue.location,
                          style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600, decoration: TextDecoration.underline),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  const Divider(color: AppColors.hairlineSoft, thickness: 1),
                  const SizedBox(height: AppSpacing.md),
                  
                  _buildHostRow(),
                  
                  const SizedBox(height: AppSpacing.md),
                  const Divider(color: AppColors.hairlineSoft, thickness: 1),
                  const SizedBox(height: AppSpacing.xl),

                  if (widget.venue.features.isNotEmpty) _buildFeatureRow(Icons.diamond_outlined, widget.venue.features[0], 'Authentic royal hospitality and heritage dining experiences.'),
                  const SizedBox(height: AppSpacing.lg),
                  if (widget.venue.features.length > 1) _buildFeatureRow(Icons.verified_outlined, widget.venue.features[1], 'Certified for grand events.'),
                  const SizedBox(height: AppSpacing.lg),
                  if (widget.venue.features.length > 2) _buildFeatureRow(Icons.calendar_today_outlined, widget.venue.features[2], 'Check available dates.'),

                  const SizedBox(height: AppSpacing.xl),
                  const Divider(color: AppColors.hairlineSoft, thickness: 1),
                  const SizedBox(height: AppSpacing.xl),
                  
                  Text('About the Venue', style: AppTypography.displaySm),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    widget.venue.description,
                    style: AppTypography.bodyMd.copyWith(color: AppColors.body),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text('Read full details', style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600, color: AppColors.goldAccent, decoration: TextDecoration.underline)),

                  const SizedBox(height: 120), // Bottom padding for sticky bar
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildStickyFooter(context),
    );
  }

  Widget _buildSliverAppBar(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 320.0,
      floating: false,
      pinned: true,
      backgroundColor: AppColors.primary,
      elevation: 0,
      leading: Container(
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.glassBackground,
          shape: BoxShape.circle,
        ),
        child: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      actions: [
        Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.glassBackground,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.share_outlined, color: AppColors.primary),
            onPressed: () {},
          ),
        ),
        Container(
          margin: const EdgeInsets.only(top: 8, bottom: 8, right: 16),
          decoration: BoxDecoration(
            color: AppColors.glassBackground,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.favorite_border_rounded, color: AppColors.primary),
            onPressed: () {},
          ),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          children: [
            AppImage(
              imageUrl: widget.venue.imagePath,
              fit: BoxFit.cover,
              width: double.infinity,
              height: double.infinity,
              placeholder: (context, url) => Container(color: AppColors.surfaceSoft),
              errorWidget: (context, url, error) => Container(
                color: AppColors.surfaceSoft,
                child: const Icon(Icons.image_not_supported, color: AppColors.muted),
              ),
            ),
            // A subtle top gradient to ensure back buttons are visible like luxury hotel brochures
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.scrim.withValues(alpha: 0.5),
                    Colors.transparent,
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.3, 1.0],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHostRow() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Managed by Taj Hotels', style: AppTypography.titleMd),
              const SizedBox(height: 4),
              Text('Luxury heritage property', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surfaceSoft,
              borderRadius: AppRadius.smAll,
              border: Border.all(color: AppColors.goldAccent.withValues(alpha: 0.3)),
            ),
            child: const Icon(Icons.business_center, color: AppColors.goldAccent),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, String title, String subtitle) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 28, color: AppColors.primary),
        const SizedBox(width: AppSpacing.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.titleMd),
              const SizedBox(height: 4),
              Text(subtitle, style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStickyFooter(BuildContext context) {
    final bookingState = ref.watch(bookingProvider);
    final isLoading = bookingState is AsyncLoading;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.primary, // Rich Emerald background for footer
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
                Row(
                  children: [
                    Text(widget.venue.formattedPrice, style: AppTypography.titleMd.copyWith(fontWeight: FontWeight.w700, color: AppColors.canvas)),
                    Text(' / day', style: AppTypography.bodySm.copyWith(color: AppColors.surfaceSoft)),
                  ],
                ),
                Text('Including premium catering', style: AppTypography.captionSm.copyWith(color: AppColors.goldAccent)),
              ],
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => CheckoutScreen(venue: widget.venue)),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.goldAccent, // Gold button
                foregroundColor: AppColors.ink,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                shape: const RoundedRectangleBorder(
                  borderRadius: AppRadius.smAll,
                ),
                disabledBackgroundColor: AppColors.goldAccent.withValues(alpha: 0.5),
              ),
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.ink),
                    )
                  : Text('Reserve Venue', style: AppTypography.buttonMd),
            ),
          ],
        ),
      ),
    );
  }
}
