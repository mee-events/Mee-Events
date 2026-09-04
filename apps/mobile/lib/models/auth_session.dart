/// Authenticated device session returned by POST /auth/otp/verify.
class AuthSession {
  final String accessToken;
  final String refreshToken;
  final int accessTokenExpiresInSeconds;
  final DateTime accessTokenExpiresAt;
  final String sessionId;
  final String userId;
  final String mobileNumber;
  final String lastActiveRole;
  final int sessionGeneration;
  final int tokenRevision;
  final int roleRevision;

  AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.accessTokenExpiresInSeconds,
    required this.accessTokenExpiresAt,
    required this.sessionId,
    required this.userId,
    required this.mobileNumber,
    required this.lastActiveRole,
    this.sessionGeneration = 0,
    this.tokenRevision = 0,
    this.roleRevision = 0,
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
      sessionId: _requiredUuid(json, 'sessionId'),
      userId: _requiredValue(user?['id'] ?? json['userId'], 'userId'),
      mobileNumber: _requiredValue(
        user?['mobileNumber'] ?? json['mobileNumber'],
        'mobileNumber',
      ),
      lastActiveRole: _requiredValue(
        user?['lastActiveRole'] ?? json['lastActiveRole'],
        'lastActiveRole',
      ),
    ).._validateRole();
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
    sessionId: sessionId,
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
      sessionId: tokens.sessionId,
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: tokens.activeRole,
      sessionGeneration: sessionGeneration,
      tokenRevision: tokenRevision + 1,
      roleRevision:
          roleRevision + (tokens.activeRole == lastActiveRole ? 0 : 1),
    );
  }

  AuthSession withRotatedRefreshToken(String nextRefreshToken) {
    return AuthSession(
      accessToken: accessToken,
      refreshToken: nextRefreshToken,
      accessTokenExpiresInSeconds: accessTokenExpiresInSeconds,
      accessTokenExpiresAt: accessTokenExpiresAt,
      sessionId: sessionId,
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: lastActiveRole,
      sessionGeneration: sessionGeneration,
      tokenRevision: tokenRevision + 1,
      roleRevision: roleRevision,
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
      sessionId: result.sessionId,
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: result.activeRole,
      sessionGeneration: sessionGeneration,
      tokenRevision: tokenRevision + 1,
      roleRevision:
          roleRevision + (result.activeRole == lastActiveRole ? 0 : 1),
    );
  }

  AuthSession withSessionGeneration(int nextGeneration) {
    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      accessTokenExpiresInSeconds: accessTokenExpiresInSeconds,
      accessTokenExpiresAt: accessTokenExpiresAt,
      sessionId: sessionId,
      userId: userId,
      mobileNumber: mobileNumber,
      lastActiveRole: lastActiveRole,
      sessionGeneration: nextGeneration,
      tokenRevision: 0,
      roleRevision: 0,
    );
  }

  AuthSessionSnapshot get snapshot => AuthSessionSnapshot(
    sessionId: sessionId,
    userId: userId,
    activeRole: lastActiveRole,
    sessionGeneration: sessionGeneration,
    tokenRevision: tokenRevision,
    roleRevision: roleRevision,
  );
}

class AuthSessionSnapshot {
  const AuthSessionSnapshot({
    required this.sessionId,
    required this.userId,
    required this.activeRole,
    required this.sessionGeneration,
    required this.tokenRevision,
    required this.roleRevision,
  });

  final String sessionId;
  final String userId;
  final String activeRole;
  final int sessionGeneration;
  final int tokenRevision;
  final int roleRevision;

  bool hasSameSession(AuthSession? current) {
    return current != null &&
        current.sessionId == sessionId &&
        current.userId == userId &&
        current.sessionGeneration == sessionGeneration;
  }

  bool hasSameRole(AuthSession? current) {
    return hasSameSession(current) &&
        current!.lastActiveRole == activeRole &&
        current.roleRevision == roleRevision;
  }
}

/// The minimum durable data required to rotate and restore a device session.
class StoredAuthSession {
  static const int currentVersion = 3;

  const StoredAuthSession({
    required this.refreshToken,
    required this.sessionId,
    required this.userId,
    required this.mobileNumber,
    required this.lastActiveRole,
  });

  final String refreshToken;
  final String? sessionId;
  final String userId;
  final String mobileNumber;
  final String lastActiveRole;

  factory StoredAuthSession.fromJson(Map<String, dynamic> json) {
    final version = json['version'];
    if (version != null && version != 2 && version != currentVersion) {
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
      sessionId: version == currentVersion
          ? _requiredUuid(json, 'sessionId')
          : _optionalString(json['sessionId'], 'sessionId'),
      userId: _requiredString(json, 'userId'),
      mobileNumber: mobileNumber,
      lastActiveRole: role,
    );
  }

  Map<String, dynamic> toJson() => {
    'version': currentVersion,
    'refreshToken': refreshToken,
    'sessionId': sessionId,
    'userId': userId,
    'mobileNumber': mobileNumber,
    'lastActiveRole': lastActiveRole,
  };

  AuthSession withTokens(SessionTokens tokens, DateTime now) {
    if (sessionId != null && sessionId != tokens.sessionId) {
      throw const FormatException('Stored session identity changed');
    }
    return AuthSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      accessTokenExpiresAt: now.add(
        Duration(seconds: tokens.accessTokenExpiresInSeconds),
      ),
      sessionId: tokens.sessionId,
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
  final String sessionId;
  final String activeRole;

  const SessionTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.accessTokenExpiresInSeconds,
    required this.sessionId,
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
      sessionId: _requiredUuid(json, 'sessionId'),
      activeRole: activeRole,
    ).._validateRole();
  }
}

/// Role-bound access token returned by POST /auth/switch-role.
class SwitchRoleResult {
  final String accessToken;
  final int accessTokenExpiresInSeconds;
  final String sessionId;
  final String activeRole;

  const SwitchRoleResult({
    required this.accessToken,
    required this.accessTokenExpiresInSeconds,
    required this.sessionId,
    required this.activeRole,
  });

  factory SwitchRoleResult.fromJson(Map<String, dynamic> json) {
    final result = SwitchRoleResult(
      accessToken: _requiredString(json, 'accessToken'),
      accessTokenExpiresInSeconds: _requiredExpiry(json),
      sessionId: _requiredUuid(json, 'sessionId'),
      activeRole: _requiredString(json, 'activeRole'),
    );
    if (!_mobileSessionRoles.contains(result.activeRole)) {
      throw const FormatException('Role-switch response role is invalid');
    }
    return result;
  }
}

extension on AuthSession {
  void _validateRole() {
    if (!_knownSessionRoles.contains(lastActiveRole)) {
      throw const FormatException('Session role is invalid');
    }
  }
}

extension on SessionTokens {
  void _validateRole() {
    if (!_knownSessionRoles.contains(activeRole)) {
      throw const FormatException('Refresh-session role is invalid');
    }
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

const _mobileSessionRoles = {
  'customer',
  'vendor_owner',
  'vendor_member',
  'worker',
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

String? _optionalString(Object? value, String key) {
  if (value == null) return null;
  return _requiredValue(value, key);
}

String _requiredUuid(Map<String, dynamic> json, String key) {
  final value = _requiredString(json, key);
  if (!_uuidPattern.hasMatch(value)) {
    throw FormatException('$key is invalid');
  }
  return value;
}

final _uuidPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);

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
