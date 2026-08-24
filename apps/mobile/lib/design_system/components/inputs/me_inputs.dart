import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

const double _focusedBorderWidth = 1.5;

InputDecoration meInputDecoration({
  String? label,
  String? hint,
  String? prefixText,
  Widget? prefixIcon,
  Widget? suffixIcon,
  String? errorText,
}) {
  return InputDecoration(
    labelText: label,
    hintText: hint,
    prefixText: prefixText,
    prefixIcon: prefixIcon,
    suffixIcon: suffixIcon,
    errorText: errorText,
    counterText: '',
    filled: true,
    fillColor: AppColors.surfaceCard,
    border: const OutlineInputBorder(
      borderRadius: AppRadius.mdAll,
      borderSide: BorderSide(color: AppColors.hairline),
    ),
    enabledBorder: const OutlineInputBorder(
      borderRadius: AppRadius.mdAll,
      borderSide: BorderSide(color: AppColors.hairline),
    ),
    focusedBorder: const OutlineInputBorder(
      borderRadius: AppRadius.mdAll,
      borderSide: BorderSide(
        color: AppColors.primary,
        width: _focusedBorderWidth,
      ),
    ),
    errorBorder: const OutlineInputBorder(
      borderRadius: AppRadius.mdAll,
      borderSide: BorderSide(color: AppColors.error),
    ),
    focusedErrorBorder: const OutlineInputBorder(
      borderRadius: AppRadius.mdAll,
      borderSide: BorderSide(
        color: AppColors.error,
        width: _focusedBorderWidth,
      ),
    ),
    labelStyle: AppTypography.bodyMd.copyWith(color: AppColors.muted),
    hintStyle: AppTypography.bodyMd.copyWith(color: AppColors.mutedSoft),
  );
}

class MeTextField extends StatelessWidget {
  const MeTextField({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.errorText,
    this.keyboardType,
    this.maxLines = 1,
    this.onChanged,
    this.enabled = true,
    this.obscureText = false,
    this.textInputAction,
    this.autofillHints,
  });

  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final String? errorText;
  final TextInputType? keyboardType;
  final int maxLines;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final bool obscureText;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      onChanged: onChanged,
      enabled: enabled,
      obscureText: obscureText,
      textInputAction: textInputAction,
      autofillHints: autofillHints,
      style: AppTypography.bodyMd,
      decoration: meInputDecoration(
        label: label,
        hint: hint,
        errorText: errorText,
      ),
    );
  }
}

class MeSearchField extends StatelessWidget {
  const MeSearchField({
    super.key,
    this.controller,
    this.focusNode,
    this.hint = 'Search',
    this.onChanged,
    this.onClear,
    this.onSubmitted,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;
  final String hint;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onClear;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      textInputAction: TextInputAction.search,
      style: AppTypography.bodyMd,
      decoration: meInputDecoration(
        hint: hint,
        prefixIcon: const Icon(
          Icons.search,
          size: AppIconSize.md,
          color: AppColors.muted,
        ),
        suffixIcon: onClear == null
            ? null
            : IconButton(
                onPressed: onClear,
                icon: const Icon(Icons.close, size: AppIconSize.md),
              ),
      ),
    );
  }
}

class MePhoneField extends StatelessWidget {
  const MePhoneField({
    super.key,
    this.controller,
    this.label = 'Mobile number',
    this.errorText,
    this.onChanged,
    this.countryPrefix = '+91',
  });

  final TextEditingController? controller;
  final String label;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final String countryPrefix;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.phone,
      autofillHints: const [AutofillHints.telephoneNumber],
      onChanged: onChanged,
      style: AppTypography.bodyMd,
      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d\s+]'))],
      decoration: meInputDecoration(
        label: label,
        prefixText: '$countryPrefix ',
        errorText: errorText,
      ),
    );
  }
}

class MeOtpField extends StatelessWidget {
  const MeOtpField({
    super.key,
    this.controller,
    this.label = 'One-time code',
    this.errorText,
    this.onChanged,
    this.length = 6,
  });

  final TextEditingController? controller;
  final String label;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final int length;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      maxLength: length,
      autofillHints: const [AutofillHints.oneTimeCode],
      onChanged: onChanged,
      style: AppTypography.titleMd.copyWith(letterSpacing: 4),
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: meInputDecoration(label: label, errorText: errorText),
    );
  }
}

class MeDropdown<T> extends StatelessWidget {
  const MeDropdown({
    super.key,
    required this.items,
    required this.onChanged,
    this.value,
    this.label,
    this.hint,
  });

  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;
  final T? value;
  final String? label;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return InputDecorator(
      decoration: meInputDecoration(label: label, hint: hint),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          hint: hint == null
              ? null
              : Text(
                  hint!,
                  style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                ),
          items: items,
          onChanged: onChanged,
          style: AppTypography.bodyMd.copyWith(color: AppColors.ink),
        ),
      ),
    );
  }
}

class MeDateField extends StatelessWidget {
  const MeDateField({
    super.key,
    required this.label,
    required this.onPick,
    this.valueText,
  });

  final String label;
  final String? valueText;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPick,
      icon: const Icon(
        Icons.calendar_today,
        size: AppIconSize.sm,
        color: AppColors.primary,
      ),
      label: Text(valueText ?? label, style: AppTypography.bodyMd),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.ink,
        side: const BorderSide(color: AppColors.hairline),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
        alignment: Alignment.centerLeft,
      ),
    );
  }
}

class MeTimeField extends StatelessWidget {
  const MeTimeField({
    super.key,
    required this.label,
    required this.onPick,
    this.valueText,
  });

  final String label;
  final String? valueText;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPick,
      icon: const Icon(
        Icons.schedule,
        size: AppIconSize.sm,
        color: AppColors.primary,
      ),
      label: Text(valueText ?? label, style: AppTypography.bodyMd),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.ink,
        side: const BorderSide(color: AppColors.hairline),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
        alignment: Alignment.centerLeft,
      ),
    );
  }
}

Future<DateTime?> showMeDatePicker(
  BuildContext context, {
  DateTime? initialDate,
  DateTime? firstDate,
  DateTime? lastDate,
}) {
  final now = DateTime.now();
  return showDatePicker(
    context: context,
    initialDate: initialDate ?? now.add(const Duration(days: 30)),
    firstDate: firstDate ?? now,
    lastDate: lastDate ?? now.add(const Duration(days: 730)),
  );
}

Future<TimeOfDay?> showMeTimePicker(
  BuildContext context, {
  TimeOfDay? initialTime,
}) {
  return showTimePicker(
    context: context,
    initialTime: initialTime ?? TimeOfDay.now(),
  );
}
