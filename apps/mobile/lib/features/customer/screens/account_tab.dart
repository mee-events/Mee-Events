import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/finance/screens/customer_finance_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';

class AccountTab extends ConsumerWidget {
  const AccountTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final displayName =
        session == null ? 'Guest' : session.mobileNumber;
    final avatarLetter = session == null ? 'G' : 'M';

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xxl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Account', style: AppTypography.displayMd),
            const SizedBox(height: AppSpacing.xl),
            Row(
              children: [
                CircleAvatar(
                  radius: AppSpacing.xxxl,
                  backgroundColor: AppColors.mutedSoft,
                  child: Text(
                    avatarLetter,
                    style: AppTypography.displayXl.copyWith(color: AppColors.ink),
                  ),
                ),
                const SizedBox(width: AppSpacing.lg),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session == null ? 'Welcome' : 'Mee Events member',
                      style: AppTypography.titleSm,
                    ),
                    Text(displayName, style: AppTypography.bodyMd.copyWith(color: AppColors.muted)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl),
            Material(
              color: AppColors.surfaceCard,
              shape: RoundedRectangleBorder(
                side: const BorderSide(color: AppColors.hairlineSoft),
                borderRadius: AppRadius.cardAll,
              ),
              child: Column(
                children: [
                  _buildMenuItem(Icons.event, 'My Events'),
                  const Divider(height: 1, color: AppColors.hairlineSoft, indent: 56),
                  _buildMenuItem(
                    Icons.payments_outlined,
                    'Payments & billing',
                    onTap: session == null
                        ? () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) => const LoginScreen(),
                              ),
                            );
                          }
                        : () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) =>
                                    const CustomerFinanceScreen(),
                              ),
                            );
                          },
                  ),
                  const Divider(height: 1, color: AppColors.hairlineSoft, indent: 56),
                  _buildMenuItem(Icons.bookmark_outline, 'Saved Services'),
                  const Divider(height: 1, color: AppColors.hairlineSoft, indent: 56),
                  _buildMenuItem(Icons.notifications_outlined, 'Notifications'),
                  const Divider(height: 1, color: AppColors.hairlineSoft, indent: 56),
                  _buildMenuItem(Icons.help_outline, 'Help & Support'),
                  const Divider(height: 1, color: AppColors.hairlineSoft, indent: 56),
                  _buildMenuItem(Icons.info_outline, 'About'),
                  const Divider(height: 1, color: AppColors.hairlineSoft, indent: 56),
                  if (session == null)
                    _buildMenuItem(
                      Icons.login,
                      'Log in',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => const LoginScreen(),
                          ),
                        );
                      },
                    )
                  else
                    _buildMenuItem(
                      Icons.logout,
                      'Logout',
                      isDestructive: true,
                      onTap: () => _logout(context, ref),
                    ),
                ],
              ),
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
                'Made with ❤️ in Hyderabad',
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
    ref.read(sessionProvider.notifier).signOut();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  Widget _buildMenuItem(
    IconData icon,
    String label, {
    bool isDestructive = false,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: isDestructive ? AppColors.error : AppColors.ink),
      title: Text(
        label,
        style: AppTypography.titleMd.copyWith(
          color: isDestructive ? AppColors.error : AppColors.ink,
        ),
      ),
      trailing: const Icon(Icons.chevron_right, color: AppColors.muted, size: 20),
      onTap: onTap ?? () {},
    );
  }
}
