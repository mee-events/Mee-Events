import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/config/environment.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/screens/customer_dashboard_screen.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Phone-number and OTP login against the platform auth endpoints.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();

  OtpChallenge? _challenge;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final phone = _normalizeIndianMobile(_phoneController.text);
    if (phone == null) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = ref.read(mobileApiProvider);
      final challenge = await api.requestOtp(phone);
      if (!mounted) return;
      if (challenge.debugCode != null) {
        _otpController.text = challenge.debugCode!;
      }
      setState(() => _challenge = challenge);
      if (challenge.debugCode != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Dev OTP: ${challenge.debugCode} (also in the backend terminal)',
            ),
            duration: const Duration(seconds: 8),
          ),
        );
      }
    } on ApiRequestException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.error.message);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Could not send the code: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyOtp() async {
    final challenge = _challenge;
    final code = _otpController.text.trim();
    if (challenge == null || code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = ref.read(mobileApiProvider);
      final session = await api.verifyOtp(
        challengeId: challenge.challengeId,
        code: code,
        deviceId: _deviceId(),
      );
      ref.read(sessionProvider.notifier).signIn(session);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => const CustomerDashboardScreen(),
        ),
      );
    } on ApiRequestException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.error.message);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Could not verify the code: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _continueAsPreview() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => const CustomerDashboardScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final awaitingOtp = _challenge != null;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.xxxl),
              Text('Welcome to Mee Events', style: AppTypography.displayXl),
              const SizedBox(height: AppSpacing.sm),
              Text(
                awaitingOtp
                    ? 'Enter the 6-digit code sent to your phone.'
                    : 'Log in with your mobile number to plan events and track enquiries.',
                style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
              ),
              const SizedBox(height: AppSpacing.xxxl),
              if (!awaitingOtp)
                MePhoneField(
                  controller: _phoneController,
                  errorText: _error,
                )
              else ...[
                MeOtpField(
                  controller: _otpController,
                  errorText: _error,
                ),
                MeButton.text(
                  label: 'Use a different number',
                  onPressed: _busy
                      ? null
                      : () {
                          setState(() {
                            _challenge = null;
                            _otpController.clear();
                            _error = null;
                          });
                        },
                ),
              ],
              if (_error != null && awaitingOtp) ...[
                const SizedBox(height: AppSpacing.md),
                Text(
                  _error!,
                  style: AppTypography.bodySm.copyWith(color: AppColors.error),
                ),
              ],
              const SizedBox(height: AppSpacing.xxl),
              MeButton.primary(
                label: awaitingOtp ? 'Verify and continue' : 'Send code',
                busy: _busy,
                onPressed: awaitingOtp ? _verifyOtp : _requestOtp,
              ),
              const Spacer(),
              if (Environment.isDevelopmentPreview)
                Center(
                  child: MeButton.text(
                    label: 'Skip login (development preview)',
                    onPressed: _continueAsPreview,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

String _deviceId() {
  final random = Random();
  final suffix =
      List.generate(16, (_) => random.nextInt(16).toRadixString(16)).join();
  return 'mobile-$suffix';
}

String? _normalizeIndianMobile(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.length == 10) {
    return digits;
  }
  if (digits.length == 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  if (digits.length == 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  return null;
}
