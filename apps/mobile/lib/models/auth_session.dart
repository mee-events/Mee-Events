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
    final user = json['user'] as Map<String, dynamic>?;
    return AuthSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      accessTokenExpiresInSeconds:
          json['accessTokenExpiresInSeconds'] as int? ?? 900,
      userId: (user?['id'] ?? json['userId']) as String,
      mobileNumber: (user?['mobileNumber'] ?? json['mobileNumber']) as String,
      lastActiveRole:
          (user?['lastActiveRole'] ?? json['lastActiveRole']) as String,
    );
  }

  Map<String, dynamic> toStorageJson() => {
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'accessTokenExpiresInSeconds': accessTokenExpiresInSeconds,
    'userId': userId,
    'mobileNumber': mobileNumber,
    'lastActiveRole': lastActiveRole,
  };

  AuthSession withRefreshedTokens(SessionTokens tokens) {
    return AuthSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: tokens.activeRole,
    );
  }

  AuthSession withSwitchedRole(SwitchRoleResult result) {
    return AuthSession(
      accessToken: result.accessToken,
      refreshToken: refreshToken,
      accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: result.activeRole,
    );
  }
}

/// Rotated tokens returned by POST /auth/refresh.
class SessionTokens {
  final String accessToken;
  final String refreshToken;
  final int accessTokenExpiresInSeconds;
  final String activeRole;

  const SessionTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.accessTokenExpiresInSeconds,
    required this.activeRole,
  });

  factory SessionTokens.fromJson(Map<String, dynamic> json) {
    final activeRole = json['activeRole'];
    if (activeRole is! String || activeRole.isEmpty) {
      throw const FormatException(
        'RefreshSessionResponse.activeRole is required',
      );
    }
    return SessionTokens(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      accessTokenExpiresInSeconds:
          json['accessTokenExpiresInSeconds'] as int? ?? 900,
      activeRole: activeRole,
    );
  }
}

/// Role-bound access token returned by POST /auth/switch-role.
class SwitchRoleResult {
  final String accessToken;
  final int accessTokenExpiresInSeconds;
  final String activeRole;

  const SwitchRoleResult({
    required this.accessToken,
    required this.accessTokenExpiresInSeconds,
    required this.activeRole,
  });

  factory SwitchRoleResult.fromJson(Map<String, dynamic> json) {
    return SwitchRoleResult(
      accessToken: json['accessToken'] as String,
      accessTokenExpiresInSeconds:
          json['accessTokenExpiresInSeconds'] as int? ?? 900,
      activeRole: json['activeRole'] as String,
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
