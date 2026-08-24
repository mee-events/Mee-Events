import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_motion.dart';
import 'package:mee_events/theme/app_opacity.dart';

/// Shared press feedback: subtle scale + opacity, optional ink splash.
///
/// When [onTap] is null, only visual feedback is applied (child handles taps).
class MePressable extends StatefulWidget {
  const MePressable({
    super.key,
    required this.child,
    this.onTap,
    this.enabled = true,
    this.borderRadius,
    this.splashColor,
  });

  final Widget child;
  final VoidCallback? onTap;
  final bool enabled;
  final BorderRadius? borderRadius;
  final Color? splashColor;

  static const double _pressedScale = 0.98;

  @override
  State<MePressable> createState() => _MePressableState();
}

class _MePressableState extends State<MePressable> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (!widget.enabled || _pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final scaled = AnimatedScale(
      scale: _pressed ? MePressable._pressedScale : 1,
      duration: AppMotion.fast,
      curve: AppMotion.enter,
      child: AnimatedOpacity(
        opacity: _pressed ? (1 - AppOpacity.pressed) : AppOpacity.opaque,
        duration: AppMotion.fast,
        curve: AppMotion.enter,
        child: widget.child,
      ),
    );

    if (widget.onTap == null) {
      return Listener(
        behavior: HitTestBehavior.translucent,
        onPointerDown: widget.enabled ? (_) => _setPressed(true) : null,
        onPointerUp: (_) => _setPressed(false),
        onPointerCancel: (_) => _setPressed(false),
        child: scaled,
      );
    }

    return Material(
      color: AppColors.scrim.withValues(alpha: AppOpacity.invisible),
      child: InkWell(
        onTap: widget.enabled ? widget.onTap : null,
        onHighlightChanged: widget.enabled ? _setPressed : null,
        onTapCancel: () => _setPressed(false),
        borderRadius: widget.borderRadius,
        splashColor: widget.splashColor ?? AppColors.primarySoft,
        highlightColor: AppColors.primarySoft.withValues(
          alpha: AppOpacity.soft,
        ),
        child: scaled,
      ),
    );
  }
}
