import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/role_switcher/mobile_roles.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

const roleSwitchUnavailableMessage =
    'We couldn’t switch roles. Please try again.';

class RoleSwitcherSheet extends StatefulWidget {
  const RoleSwitcherSheet({
    super.key,
    required this.bootstrap,
    required this.onSwitch,
    this.onApplied,
  });

  final PlatformBootstrapResponse bootstrap;
  final Future<SwitchRoleResult> Function(String role) onSwitch;
  final Future<void> Function(SwitchRoleResult result)? onApplied;

  @override
  State<RoleSwitcherSheet> createState() => RoleSwitcherSheetState();
}

class RoleSwitcherSheetState extends State<RoleSwitcherSheet> {
  String? _submittingRole;
  String? _failedRole;
  String? _error;
  bool _busy = false;

  List<MobileRoleOption> get _options => visibleMobileRoles(
    activeRole: widget.bootstrap.activeRole,
    assignedActiveRoles: widget.bootstrap.assignedRoles,
  );

  Future<void> _select(MobileRoleOption option) async {
    if (_busy) return;
    if (option.selected) {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
      return;
    }
    setState(() {
      _busy = true;
      _submittingRole = option.backendRole;
      _failedRole = option.backendRole;
      _error = null;
    });
    try {
      final result = await widget.onSwitch(option.backendRole);
      if (result.activeRole != option.backendRole ||
          result.sessionId != widget.bootstrap.actorSessionId) {
        throw const FormatException('Role switch response did not agree');
      }
      await widget.onApplied?.call(result);
      if (!mounted) return;
      Navigator.of(context).pop(result);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _submittingRole = null;
        _error = roleSwitchUnavailableMessage;
      });
    }
  }

  void _retry() {
    if (_busy) return;
    for (final option in _options) {
      if (option.backendRole == _failedRole) {
        _select(option);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.5;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final options = _options;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: SizedBox(
          height: height,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.lg,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.hairline,
                      borderRadius: AppRadius.pillAll,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text('Switch role', style: AppTypography.displaySm),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Use one account across Customer, Vendor, and Worker.',
                  style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                ),
                const SizedBox(height: AppSpacing.lg),
                Expanded(
                  child: ListView(
                    children: [
                      for (final option in options)
                        _RoleRow(
                          option: option,
                          enabled: !_busy,
                          loading: _submittingRole == option.backendRole,
                          onTap: () => _select(option),
                        ),
                      if (showsApprovalFooter(options)) ...[
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'Vendor and Worker roles appear here after approval.',
                          style: AppTypography.caption.copyWith(
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    _error!,
                    style: AppTypography.bodyMd.copyWith(
                      color: AppColors.error,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  MeButton.text(
                    label: 'Retry',
                    expand: false,
                    onPressed: _busy ? null : _retry,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleRow extends StatelessWidget {
  const _RoleRow({
    required this.option,
    required this.enabled,
    required this.loading,
    required this.onTap,
  });

  final MobileRoleOption option;
  final bool enabled;
  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selected = option.selected;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Semantics(
        button: true,
        selected: selected,
        enabled: enabled,
        label: '${option.label}. ${option.description}',
        child: ExcludeSemantics(
          child: Material(
            color: selected ? AppColors.primarySoft : AppColors.canvas,
            shape: RoundedRectangleBorder(
              borderRadius: AppRadius.mdAll,
              side: BorderSide(
                color: selected ? AppColors.primary : AppColors.hairline,
                width: selected ? 1.5 : 1,
              ),
            ),
            child: InkWell(
              onTap: enabled ? onTap : null,
              borderRadius: AppRadius.mdAll,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 44),
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Row(
                    children: [
                      Icon(option.icon, color: AppColors.primary, size: 22),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              option.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.titleSm,
                            ),
                            Text(
                              option.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.caption.copyWith(
                                color: AppColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (loading)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else if (selected)
                        const Icon(
                          Icons.check_circle,
                          color: AppColors.primary,
                          size: 22,
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
