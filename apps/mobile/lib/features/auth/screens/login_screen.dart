import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/indian_mobile_number.dart';
import 'package:mee_events/features/auth/installation_id.dart';
import 'package:mee_events/features/auth/session_provider.dart';
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
    if (_busy) return;

    final phone = normalizeIndianMobileNumber(_phoneController.text);
    if (phone == null) {
      setState(() => _error = 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    FocusScope.of(context).unfocus();
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
      _phoneController.clear();
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
    } on ApiRequestException catch (error) {
      if (!mounted) return;
      setState(() => _error = _requestOtpErrorMessage(error.error));
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = _genericOtpRequestError);
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
      final deviceId = await ref
          .read(installationIdStoreProvider)
          .readOrCreate();
      if (!mounted) return;
      final session = await api.verifyOtp(
        challengeId: challenge.challengeId,
        code: code,
        deviceId: deviceId,
      );
      await ref.read(sessionProvider.notifier).signIn(session);
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
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

  @override
  Widget build(BuildContext context) {
    final awaitingOtp = _challenge != null;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: AutofillGroup(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppSpacing.xl),
                Semantics(
                  header: true,
                  child: Text('Mee Events', style: AppTypography.titleMd),
                ),
                const SizedBox(height: AppSpacing.xl),
                Text('Welcome to Mee Events', style: AppTypography.displayXl),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  awaitingOtp
                      ? 'Enter the 6-digit code sent to your phone.'
                      : 'Use your mobile number to securely start planning and track your events.',
                  style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                ),
                const SizedBox(height: AppSpacing.xxl),
                if (!awaitingOtp) ...[
                  Text(
                    '10-digit mobile number - India (+91)',
                    style: AppTypography.caption,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Semantics(
                    label: '10-digit mobile number, India country code plus 91',
                    child: MePhoneField(
                      key: const ValueKey('customer-mobile-field'),
                      controller: _phoneController,
                      label: null,
                      errorText: _error,
                      enabled: !_busy,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _requestOtp(),
                    ),
                  ),
                  if (_error != null)
                    Semantics(
                      key: const ValueKey('customer-auth-error'),
                      container: true,
                      liveRegion: true,
                      label: _error,
                      child: const SizedBox.shrink(),
                    ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'We use this number to send a one-time sign-in code and secure your Mee Events account. Standard SMS charges may apply.',
                    style: AppTypography.captionSm.copyWith(
                      color: AppColors.muted,
                    ),
                  ),
                ] else ...[
                  MeTextField(
                    controller: _otpController,
                    label: 'One-time code',
                    hint: '6 digits',
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: AppSpacing.sm),
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
                  _LiveErrorMessage(message: _error!),
                ],
                const SizedBox(height: AppSpacing.xxl),
                Semantics(
                  liveRegion: _busy,
                  label: _busy && !awaitingOtp ? 'Requesting code' : null,
                  child: MeButton.primary(
                    key: const ValueKey('customer-auth-continue'),
                    label: awaitingOtp ? 'Verify and continue' : 'Continue',
                    busy: _busy,
                    onPressed: _busy
                        ? null
                        : awaitingOtp
                        ? _verifyOtp
                        : _requestOtp,
                  ),
                ),
                if (_busy && !awaitingOtp) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      'Requesting your secure code…',
                      style: AppTypography.bodySm.copyWith(
                        color: AppColors.muted,
                      ),
                    ),
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

const _genericOtpRequestError =
    'We couldn’t send a code right now. Please try again later.';

String _requestOtpErrorMessage(ApiError error) {
  if (error.statusCode == 0 || error.code == 'NETWORK_ERROR') {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (error.statusCode == 429 ||
      error.code == 'OTP_RESEND_COOLDOWN' ||
      error.code == 'OTP_REQUEST_IN_PROGRESS' ||
      error.code == 'OTP_REQUEST_LIMIT' ||
      error.code == 'AUTH_IP_RATE_LIMIT') {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (error.code == 'INVALID_MOBILE_NUMBER' || error.statusCode == 400) {
    return 'Enter a valid 10-digit Indian mobile number.';
  }
  return _genericOtpRequestError;
}

class _LiveErrorMessage extends StatelessWidget {
  const _LiveErrorMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      key: const ValueKey('customer-auth-error'),
      container: true,
      liveRegion: true,
      label: message,
      child: ExcludeSemantics(
        child: Text(
          message,
          style: AppTypography.bodySm.copyWith(color: AppColors.error),
        ),
      ),
    );
  }
}
