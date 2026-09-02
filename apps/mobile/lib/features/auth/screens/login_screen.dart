import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/indian_mobile_number.dart';
import 'package:mee_events/features/auth/installation_id.dart';
import 'package:mee_events/features/auth/otp_time_source.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Customer phone-number and OTP login against the platform auth endpoints.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, this.timeSource = const SystemOtpTimeSource()});

  final OtpTimeSource timeSource;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with WidgetsBindingObserver {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _phoneFocusNode = FocusNode();
  final _otpFocusNode = FocusNode();

  OtpChallenge? _challenge;
  String? _mobileNumber;
  DateTime? _expiresAt;
  DateTime? _resendAt;
  OtpTicker? _ticker;
  bool _busy = false;
  bool _verificationUnavailable = false;
  bool _resendAvailabilityAnnounced = false;
  int _expirySecondsRemaining = 0;
  int _resendSecondsRemaining = 0;
  String? _error;

  bool get _awaitingOtp => _challenge != null;
  bool get _resendAvailable => _resendSecondsRemaining <= 0;
  bool get _needsNewCode => _verificationUnavailable || _challenge == null;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshTiming();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker?.cancel();
    _phoneController.dispose();
    _otpController.dispose();
    _phoneFocusNode.dispose();
    _otpFocusNode.dispose();
    super.dispose();
  }

  Future<void> _requestOtp({bool resend = false}) async {
    if (_busy) return;
    if (resend && !_resendAvailable && !_verificationUnavailable) return;

    final phone = resend
        ? _mobileNumber
        : normalizeIndianMobileNumber(_phoneController.text);
    if (phone == null) {
      setState(() => _error = _invalidMobileMessage);
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final challenge = await ref.read(mobileApiProvider).requestOtp(phone);
      if (!mounted) return;
      _applyChallenge(phone, challenge);
    } on ApiRequestException catch (exception) {
      if (!mounted) return;
      final error = exception.error;
      setState(() {
        _error = _requestOtpErrorMessage(error, resend: resend);
        if (resend && _requestOutcomeMayHaveReplacedChallenge(error)) {
          _verificationUnavailable = true;
        }
      });
      if (resend && !_verificationUnavailable) _focusOtp();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = _genericOtpRequestError;
        if (resend) _verificationUnavailable = true;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _applyChallenge(String mobileNumber, OtpChallenge challenge) {
    final receivedAt = widget.timeSource.now();
    _ticker?.cancel();
    _mobileNumber = mobileNumber;
    _challenge = challenge;
    _expiresAt = receivedAt.add(Duration(seconds: challenge.expiresInSeconds));
    _resendAt = receivedAt.add(Duration(seconds: challenge.resendAfterSeconds));
    _verificationUnavailable = false;
    _resendAvailabilityAnnounced = challenge.resendAfterSeconds <= 0;
    _error = null;
    _otpController
      ..clear()
      ..text = challenge.debugCode ?? '';
    _updateRemainingSeconds(receivedAt);
    _phoneController.clear();
    _ticker = widget.timeSource.startPeriodic(
      const Duration(seconds: 1),
      _refreshTiming,
    );
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _otpFocusNode.requestFocus();
    });
  }

  void _refreshTiming() {
    if (!mounted || _challenge == null) return;
    final now = widget.timeSource.now();
    final oldExpiry = _expirySecondsRemaining;
    final oldResend = _resendSecondsRemaining;
    final expired = _secondsUntil(_expiresAt, now) <= 0;
    _updateRemainingSeconds(now);
    final resendBecameAvailable = oldResend > 0 && _resendSecondsRemaining <= 0;
    if (resendBecameAvailable) {
      _resendAvailabilityAnnounced = true;
    }
    final becameExpired = expired && !_verificationUnavailable;
    if (becameExpired) {
      _verificationUnavailable = true;
      _error = _expiredOtpMessage;
      _otpController.clear();
      _ticker?.cancel();
      _ticker = null;
    }
    if (becameExpired ||
        resendBecameAvailable ||
        oldExpiry != _expirySecondsRemaining ||
        oldResend != _resendSecondsRemaining) {
      setState(() {});
    }
  }

  void _updateRemainingSeconds(DateTime now) {
    _expirySecondsRemaining = _secondsUntil(_expiresAt, now);
    _resendSecondsRemaining = _secondsUntil(_resendAt, now);
  }

  Future<void> _verifyOtp() async {
    if (_busy) return;
    _refreshTiming();
    final challenge = _challenge;
    final code = _otpController.text.trim();
    if (_needsNewCode || challenge == null) return;
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = _invalidOtpMessage);
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final deviceId = await ref
          .read(installationIdStoreProvider)
          .readOrCreate();
      if (!mounted) return;
      final session = await ref
          .read(mobileApiProvider)
          .verifyOtp(
            challengeId: challenge.challengeId,
            code: code,
            deviceId: deviceId,
          );
      await ref.read(sessionProvider.notifier).signIn(session);
      if (!mounted) return;
      TextInput.finishAutofillContext(shouldSave: false);
      _clearSensitiveOtpState();
      Navigator.of(context).popUntil((route) => route.isFirst);
    } on ApiRequestException catch (exception) {
      if (!mounted) return;
      final outcome = _verifyOtpError(exception.error);
      setState(() {
        _error = outcome.message;
        if (outcome.terminal) {
          _verificationUnavailable = true;
          _otpController.clear();
          _ticker?.cancel();
          _ticker = null;
        }
      });
      if (!outcome.terminal) _focusOtp();
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = _genericOtpVerifyError);
      _focusOtp();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _useDifferentNumber() {
    if (_busy) return;
    _ticker?.cancel();
    _ticker = null;
    setState(() {
      _clearSensitiveOtpState();
      _phoneController.clear();
      _error = null;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _phoneFocusNode.requestFocus();
    });
  }

  void _clearSensitiveOtpState() {
    _ticker?.cancel();
    _ticker = null;
    _challenge = null;
    _mobileNumber = null;
    _expiresAt = null;
    _resendAt = null;
    _expirySecondsRemaining = 0;
    _resendSecondsRemaining = 0;
    _verificationUnavailable = false;
    _resendAvailabilityAnnounced = false;
    _otpController.clear();
  }

  void _focusOtp() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_needsNewCode) _otpFocusNode.requestFocus();
    });
  }

  @override
  Widget build(BuildContext context) {
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
                Text(
                  _awaitingOtp
                      ? 'Verify your mobile number'
                      : 'Welcome to Mee Events',
                  style: AppTypography.displayXl,
                ),
                const SizedBox(height: AppSpacing.sm),
                if (_awaitingOtp) _buildOtpDestination() else _buildWelcome(),
                const SizedBox(height: AppSpacing.xxl),
                if (_awaitingOtp) _buildOtpForm() else _buildPhoneForm(),
                const SizedBox(height: AppSpacing.xxl),
                _buildPrimaryAction(),
                if (_busy) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      _awaitingOtp
                          ? 'Checking your secure code…'
                          : 'Requesting your secure code…',
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

  Widget _buildWelcome() {
    return Text(
      'Use your mobile number to securely start planning and track your events.',
      style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
    );
  }

  Widget _buildOtpDestination() {
    final mobileNumber = _mobileNumber;
    final masked = mobileNumber == null
        ? maskIndianMobileNumber('')
        : maskIndianMobileNumber(mobileNumber);
    final ending = mobileNumber == null
        ? 'your number'
        : mobileNumber.substring(mobileNumber.length - 4).split('').join(' ');
    return Semantics(
      label: 'Enter the 6-digit code sent to the mobile number ending $ending',
      child: ExcludeSemantics(
        child: Text(
          'Enter the 6-digit code sent to $masked.',
          style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
        ),
      ),
    );
  }

  Widget _buildPhoneForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
            focusNode: _phoneFocusNode,
            label: null,
            errorText: _error,
            enabled: !_busy,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _requestOtp(),
          ),
        ),
        if (_error != null) _SilentLiveError(message: _error!),
        const SizedBox(height: AppSpacing.lg),
        Text(
          'We use this number to send a one-time sign-in code and secure your Mee Events account. Standard SMS charges may apply.',
          style: AppTypography.captionSm.copyWith(color: AppColors.muted),
        ),
      ],
    );
  }

  Widget _buildOtpForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MeOtpField(
          key: const ValueKey('customer-otp-field'),
          controller: _otpController,
          focusNode: _otpFocusNode,
          enabled: !_busy && !_needsNewCode,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _verifyOtp(),
          onChanged: (_) {
            if (_error == _invalidOtpMessage) setState(() => _error = null);
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        if (!_needsNewCode)
          Text(
            'Code expires in ${_formatCountdown(_expirySecondsRemaining)}',
            key: const ValueKey('customer-otp-expiry'),
            style: AppTypography.bodySm.copyWith(color: AppColors.muted),
          ),
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.md),
          _LiveErrorMessage(message: _error!),
        ],
        const SizedBox(height: AppSpacing.lg),
        Text(
          'Didn’t receive the code?',
          style: AppTypography.bodySm.copyWith(color: AppColors.muted),
        ),
        const SizedBox(height: AppSpacing.xs),
        MeButton.text(
          key: const ValueKey('customer-otp-resend'),
          label: _resendAvailable || _verificationUnavailable
              ? 'Resend code'
              : 'Resend code in ${_formatCountdown(_resendSecondsRemaining)}',
          onPressed: !_busy && (_resendAvailable || _verificationUnavailable)
              ? () => _requestOtp(resend: true)
              : null,
        ),
        if (_resendAvailabilityAnnounced)
          Semantics(
            key: const ValueKey('customer-otp-resend-available'),
            liveRegion: true,
            label: 'You can request a new code now.',
            child: const SizedBox.shrink(),
          ),
        const SizedBox(height: AppSpacing.sm),
        MeButton.text(
          key: const ValueKey('customer-otp-change-number'),
          label: 'Use a different number',
          onPressed: _busy ? null : _useDifferentNumber,
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Keep your code private. Mee Events support will never ask you to share it.',
          style: AppTypography.captionSm.copyWith(color: AppColors.muted),
        ),
      ],
    );
  }

  Widget _buildPrimaryAction() {
    final awaitingOtp = _awaitingOtp;
    final needsNewCode = awaitingOtp && _needsNewCode;
    final label = needsNewCode
        ? 'Request new code'
        : awaitingOtp
        ? 'Verify and continue'
        : 'Continue';
    final callback = needsNewCode
        ? () => _requestOtp(resend: true)
        : awaitingOtp
        ? _verifyOtp
        : _requestOtp;
    return Semantics(
      liveRegion: _busy,
      label: _busy
          ? awaitingOtp
                ? 'Checking code'
                : 'Requesting code'
          : null,
      child: MeButton.primary(
        key: const ValueKey('customer-auth-continue'),
        label: label,
        busy: _busy,
        onPressed: _busy ? null : callback,
      ),
    );
  }
}

const _invalidMobileMessage = 'Enter a valid 10-digit Indian mobile number.';
const _invalidOtpMessage = 'Enter the complete 6-digit code.';
const _expiredOtpMessage =
    'This code has expired. Request a new code to continue.';
const _genericOtpRequestError =
    'We couldn’t send a code right now. Please try again later.';
const _genericOtpVerifyError =
    'We couldn’t verify the code right now. Please try again.';

String _requestOtpErrorMessage(ApiError error, {required bool resend}) {
  if (error.statusCode == 0 || error.code == 'NETWORK_ERROR') {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (error.statusCode == 429 ||
      error.code == 'OTP_RESEND_COOLDOWN' ||
      error.code == 'OTP_REQUEST_IN_PROGRESS' ||
      error.code == 'OTP_REQUEST_LIMIT' ||
      error.code == 'AUTH_IP_RATE_LIMIT') {
    return resend
        ? 'Please wait before requesting another code.'
        : 'Too many attempts. Please wait a moment before trying again.';
  }
  if (error.code == 'INVALID_MOBILE_NUMBER' || error.statusCode == 400) {
    return _invalidMobileMessage;
  }
  return _genericOtpRequestError;
}

bool _requestOutcomeMayHaveReplacedChallenge(ApiError error) {
  return error.statusCode == 0 ||
      error.code == 'NETWORK_ERROR' ||
      error.code == 'OTP_DELIVERY_UNAVAILABLE' ||
      error.statusCode >= 500;
}

_VerifyOtpOutcome _verifyOtpError(ApiError error) {
  if (error.statusCode == 0 || error.code == 'NETWORK_ERROR') {
    return const _VerifyOtpOutcome(
      'You appear to be offline. Check your connection and try again.',
    );
  }
  return switch (error.code) {
    'OTP_INCORRECT' => const _VerifyOtpOutcome(
      'That code isn’t correct. Check it and try again.',
    ),
    'OTP_EXPIRED' => const _VerifyOtpOutcome(
      _expiredOtpMessage,
      terminal: true,
    ),
    'OTP_ATTEMPTS_EXHAUSTED' => const _VerifyOtpOutcome(
      'Too many incorrect attempts. Request a new code to continue.',
      terminal: true,
    ),
    'OTP_CHALLENGE_INVALID' => const _VerifyOtpOutcome(
      'This code can no longer be used. Request a new code to continue.',
      terminal: true,
    ),
    _ => const _VerifyOtpOutcome(_genericOtpVerifyError),
  };
}

int _secondsUntil(DateTime? deadline, DateTime now) {
  if (deadline == null) return 0;
  final milliseconds = deadline.difference(now).inMilliseconds;
  if (milliseconds <= 0) return 0;
  return (milliseconds + 999) ~/ 1000;
}

String _formatCountdown(int totalSeconds) {
  final minutes = totalSeconds ~/ 60;
  final seconds = totalSeconds % 60;
  return '${minutes.toString().padLeft(2, '0')}:'
      '${seconds.toString().padLeft(2, '0')}';
}

class _VerifyOtpOutcome {
  const _VerifyOtpOutcome(this.message, {this.terminal = false});

  final String message;
  final bool terminal;
}

class _SilentLiveError extends StatelessWidget {
  const _SilentLiveError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      key: const ValueKey('customer-auth-error'),
      container: true,
      liveRegion: true,
      label: message,
      child: const SizedBox.shrink(),
    );
  }
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
