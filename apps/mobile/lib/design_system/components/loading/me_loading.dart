import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_opacity.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/shared/shimmer_loading.dart';

class MeCircularLoader extends StatelessWidget {
  const MeCircularLoader({super.key, this.size = 24});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: const CircularProgressIndicator(
        strokeWidth: 2.5,
        color: AppColors.primary,
      ),
    );
  }
}

class MeSkeleton extends StatelessWidget {
  const MeSkeleton({
    super.key,
    this.width,
    this.height = 16,
    this.borderRadius,
  });

  final double? width;
  final double height;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    return ShimmerBox(
      width: width ?? double.infinity,
      height: height,
      borderRadius: borderRadius ?? AppRadius.smAll,
    );
  }
}

class MeProgressOverlay extends StatelessWidget {
  const MeProgressOverlay({
    super.key,
    required this.visible,
    required this.child,
  });

  final bool visible;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (visible)
          Positioned.fill(
            child: ColoredBox(
              color: AppColors.scrim.withValues(alpha: AppOpacity.scrim),
              child: const Center(child: MeCircularLoader(size: 36)),
            ),
          ),
      ],
    );
  }
}
