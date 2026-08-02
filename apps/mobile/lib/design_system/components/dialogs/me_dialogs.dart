import 'package:flutter/material.dart';
import 'package:mee_events/design_system/components/buttons/me_button.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

Future<bool?> showMeConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'Confirm',
  String cancelLabel = 'Cancel',
  bool destructive = false,
}) {
  return showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      title: Text(title, style: AppTypography.displaySm),
      content: Text(message, style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
      actions: [
        MeButton.text(
          label: cancelLabel,
          onPressed: () => Navigator.of(context).pop(false),
        ),
        MeButton.primary(
          label: confirmLabel,
          expand: false,
          pill: false,
          onPressed: () => Navigator.of(context).pop(true),
        ),
      ],
    ),
  );
}

Future<void> showMeSuccessDialog(
  BuildContext context, {
  required String title,
  required String message,
  String actionLabel = 'Done',
}) {
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      title: Row(
        children: [
          const Icon(Icons.check_circle, color: AppColors.success, size: AppIconSize.lg),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(title, style: AppTypography.displaySm)),
        ],
      ),
      content: Text(message, style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
      actions: [
        MeButton.primary(
          label: actionLabel,
          expand: false,
          pill: false,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    ),
  );
}

Future<void> showMeErrorDialog(
  BuildContext context, {
  required String title,
  required String message,
  String actionLabel = 'OK',
}) {
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      title: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: AppIconSize.lg),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(title, style: AppTypography.displaySm)),
        ],
      ),
      content: Text(message, style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
      actions: [
        MeButton.primary(
          label: actionLabel,
          expand: false,
          pill: false,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    ),
  );
}

Future<T?> showMeBottomSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool isScrollControlled = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: isScrollControlled,
    backgroundColor: AppColors.surfaceCard,
    shape: const RoundedRectangleBorder(borderRadius: AppRadius.topModal),
    builder: builder,
  );
}
