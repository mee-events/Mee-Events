import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/finance/screens/customer_finance_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class AccountTab extends ConsumerWidget {
  const AccountTab({super.key});

  static const double _avatarSize = 64;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final displayName = session == null ? 'Guest' : session.mobileNumber;
    final avatarLetter = session == null ? 'G' : 'M';

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.xxl,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: _avatarSize,
                  height: _avatarSize,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.hairlineSoft),
                  ),
                  child: Text(
                    avatarLetter,
                    style: AppTypography.displayXl.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.lg),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session == null ? 'Welcome' : 'Mee Events member',
                        style: AppTypography.displaySm.copyWith(
                          color: AppColors.ink,
                        ),
                      ),
                      Text(
                        displayName,
                        style: AppTypography.bodyMd.copyWith(
                          color: AppColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl),
            Text(
              'PERSONAL',
              style: AppTypography.eyebrow.copyWith(
                color: AppColors.goldAccent,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            MeSurfaceCard(
              padding: EdgeInsets.zero,
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  const _AccountMenuRow(icon: Icons.event, label: 'My Events'),
                  const Divider(
                    height: 1,
                    color: AppColors.hairlineSoft,
                    indent: 56,
                  ),
                  _AccountMenuRow(
                    icon: Icons.payments_outlined,
                    label: 'Payments & billing',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => session == null
                              ? const LoginScreen()
                              : const CustomerFinanceScreen(),
                        ),
                      );
                    },
                  ),
                  const Divider(
                    height: 1,
                    color: AppColors.hairlineSoft,
                    indent: 56,
                  ),
                  const _AccountMenuRow(
                    icon: Icons.bookmark_outline,
                    label: 'Saved Services',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              'PREFERENCES',
              style: AppTypography.eyebrow.copyWith(
                color: AppColors.goldAccent,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            const MeSurfaceCard(
              padding: EdgeInsets.zero,
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  _AccountMenuRow(
                    icon: Icons.notifications_outlined,
                    label: 'Notifications',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              'SUPPORT',
              style: AppTypography.eyebrow.copyWith(
                color: AppColors.goldAccent,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            const MeSurfaceCard(
              padding: EdgeInsets.zero,
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  _AccountMenuRow(
                    icon: Icons.help_outline,
                    label: 'Help & Support',
                  ),
                  Divider(height: 1, color: AppColors.hairlineSoft, indent: 56),
                  _AccountMenuRow(icon: Icons.info_outline, label: 'About'),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            if (session == null)
              MeButton.primary(
                label: 'Log in',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const LoginScreen(),
                    ),
                  );
                },
              )
            else
              MeButton.outline(
                label: 'Log out',
                onPressed: () => _logout(context, ref),
              ),
            const SizedBox(height: AppSpacing.xxl),
            Center(
              child: Text(
                'Mee Events v0.1.0',
                style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Center(
              child: Text(
                'Crafted in Hyderabad',
                style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              ),
            ),
            const SizedBox(height: AppSpacing.xxxl),
          ],
        ),
      ),
    );
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final api = ref.read(mobileApiProvider);
    try {
      await api.logout();
    } catch (_) {
      // Session is cleared locally even if the server call fails.
    }
    await ref.read(sessionProvider.notifier).signOut();
    if (!context.mounted) return;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }
}

class _AccountMenuRow extends StatelessWidget {
  const _AccountMenuRow({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return MePressable(
      onTap: onTap ?? () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary, size: AppIconSize.lg),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                label,
                style: AppTypography.titleMd.copyWith(color: AppColors.ink),
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppColors.muted,
              size: AppIconSize.md,
            ),
          ],
        ),
      ),
    );
  }
}
