/// Authenticated device session returned by POST /auth/otp/verify.
class AuthSession {
  final String accessToken;
  final String refreshToken;
  final int accessTokenExpiresInSeconds;
  final String userId;
  final String mobileNumber;
  final String lastActiveRole;

  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.accessTokenExpiresInSeconds,
    required this.userId,
    required this.mobileNumber,
    required this.lastActiveRole,
  });

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    return AuthSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      accessTokenExpiresInSeconds:
          json['accessTokenExpiresInSeconds'] as int,
      userId: user['id'] as String,
      mobileNumber: user['mobileNumber'] as String,
      lastActiveRole: user['lastActiveRole'] as String,
    );
  }
}

/// OTP challenge returned by POST /auth/otp/request.
class OtpChallenge {
  final String challengeId;
  final int expiresInSeconds;
  final int resendAfterSeconds;
  /// Only returned by the local OTP provider in development.
  final String? debugCode;

  const OtpChallenge({
    required this.challengeId,
    required this.expiresInSeconds,
    required this.resendAfterSeconds,
    this.debugCode,
  });

  factory OtpChallenge.fromJson(Map<String, dynamic> json) {
    return OtpChallenge(
      challengeId: json['challengeId'] as String,
      expiresInSeconds: json['expiresInSeconds'] as int,
      resendAfterSeconds: json['resendAfterSeconds'] as int,
      debugCode: json['debugCode'] as String?,
    );
  }
}
