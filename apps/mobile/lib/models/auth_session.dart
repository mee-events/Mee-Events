/// Authenticated device session returned by POST /auth/otp/verify.
class AuthSession {
  final String accessToken;
  final String refreshToken;
  final int accessTokenExpiresInSeconds;
  final DateTime accessTokenExpiresAt;
  final String userId;
  final String mobileNumber;
  final String lastActiveRole;

  AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.accessTokenExpiresInSeconds,
    required this.accessTokenExpiresAt,
    required this.userId,
    required this.mobileNumber,
    required this.lastActiveRole,
  });

  factory AuthSession.fromJson(Map<String, dynamic> json, {DateTime? now}) {
    final user = json['user'] as Map<String, dynamic>?;
    final expiresInSeconds = _requiredExpiry(json);
    final issuedAt = now ?? DateTime.now();
    return AuthSession(
      accessToken: _requiredString(json, 'accessToken'),
      refreshToken: _requiredString(json, 'refreshToken', minLength: 32),
      accessTokenExpiresInSeconds: expiresInSeconds,
      accessTokenExpiresAt: issuedAt.add(Duration(seconds: expiresInSeconds)),
      userId: _requiredValue(user?['id'] ?? json['userId'], 'userId'),
      mobileNumber: _requiredValue(
        user?['mobileNumber'] ?? json['mobileNumber'],
        'mobileNumber',
      ),
      lastActiveRole: _requiredValue(
        user?['lastActiveRole'] ?? json['lastActiveRole'],
        'lastActiveRole',
      ),
    );
  }

  bool hasUsableAccessToken(
    DateTime now, {
    Duration clockSkew = const Duration(seconds: 30),
  }) {
    return accessToken.isNotEmpty &&
        accessTokenExpiresAt.isAfter(now.add(clockSkew));
  }

  StoredAuthSession toStoredSession() => StoredAuthSession(
    refreshToken: refreshToken,
    userId: userId,
    mobileNumber: mobileNumber,
    lastActiveRole: lastActiveRole,
  );

  /// Secure-storage payload. Access tokens remain memory-first.
  Map<String, dynamic> toStorageJson() => toStoredSession().toJson();

  AuthSession withRefreshedTokens(SessionTokens tokens, {DateTime? now}) {
    final issuedAt = now ?? DateTime.now();
    return AuthSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      accessTokenExpiresAt: issuedAt.add(
        Duration(seconds: tokens.accessTokenExpiresInSeconds),
      ),
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: tokens.activeRole,
    );
  }

  AuthSession withSwitchedRole(SwitchRoleResult result, {DateTime? now}) {
    final issuedAt = now ?? DateTime.now();
    return AuthSession(
      accessToken: result.accessToken,
      refreshToken: refreshToken,
      accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
      accessTokenExpiresAt: issuedAt.add(
        Duration(seconds: result.accessTokenExpiresInSeconds),
      ),
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: result.activeRole,
    );
  }
}

/// The minimum durable data required to rotate and restore a device session.
class StoredAuthSession {
  static const int currentVersion = 2;

  const StoredAuthSession({
    required this.refreshToken,
    required this.userId,
    required this.mobileNumber,
    required this.lastActiveRole,
  });

  final String refreshToken;
  final String userId;
  final String mobileNumber;
  final String lastActiveRole;

  factory StoredAuthSession.fromJson(Map<String, dynamic> json) {
    final version = json['version'];
    if (version != null && version != currentVersion) {
      throw const FormatException('Unsupported stored session version');
    }
    final role = _requiredString(json, 'lastActiveRole');
    if (!_knownSessionRoles.contains(role)) {
      throw const FormatException('Stored session role is invalid');
    }
    final mobileNumber = _requiredString(json, 'mobileNumber');
    if (!RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(mobileNumber)) {
      throw const FormatException('Stored mobile number is invalid');
    }
    return StoredAuthSession(
      refreshToken: _requiredString(json, 'refreshToken', minLength: 32),
      userId: _requiredString(json, 'userId'),
      mobileNumber: mobileNumber,
      lastActiveRole: role,
    );
  }

  Map<String, dynamic> toJson() => {
    'version': currentVersion,
    'refreshToken': refreshToken,
    'userId': userId,
    'mobileNumber': mobileNumber,
    'lastActiveRole': lastActiveRole,
  };

  AuthSession withTokens(SessionTokens tokens, DateTime now) {
    return AuthSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      accessTokenExpiresAt: now.add(
        Duration(seconds: tokens.accessTokenExpiresInSeconds),
      ),
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: tokens.activeRole,
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
      accessToken: _requiredString(json, 'accessToken'),
      refreshToken: _requiredString(json, 'refreshToken', minLength: 32),
      accessTokenExpiresInSeconds: _requiredExpiry(json),
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
      accessToken: _requiredString(json, 'accessToken'),
      accessTokenExpiresInSeconds: _requiredExpiry(json),
      activeRole: _requiredString(json, 'activeRole'),
    );
  }
}

const _knownSessionRoles = {
  'customer',
  'vendor_owner',
  'vendor_member',
  'worker',
  'employee',
  'support',
  'finance',
  'manager',
  'administrator',
  'auditor',
};

String _requiredString(
  Map<String, dynamic> json,
  String key, {
  int minLength = 1,
}) {
  return _requiredValue(json[key], key, minLength: minLength);
}

String _requiredValue(Object? value, String key, {int minLength = 1}) {
  if (value is! String ||
      value.trim().length < minLength ||
      value.length > 512) {
    throw FormatException('$key is invalid');
  }
  return value;
}

int _requiredExpiry(Map<String, dynamic> json) {
  final value = json['accessTokenExpiresInSeconds'];
  if (value is! int || value <= 0 || value > 3600) {
    throw const FormatException('Access-token expiry is invalid');
  }
  return value;
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
