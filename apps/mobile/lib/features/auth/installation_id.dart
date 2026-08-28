import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const installationIdStorageKey = 'mee_events.installation_id.v1';

abstract class InstallationIdStore {
  Future<String> readOrCreate();
}

String generateInstallationId([Random? random]) {
  final source = random ?? Random.secure();
  final suffix = List.generate(
    16,
    (_) => source.nextInt(16).toRadixString(16),
  ).join();
  return 'mobile-$suffix';
}

bool isValidInstallationId(String value) {
  final trimmed = value.trim();
  return trimmed.length >= 8 && trimmed.length <= 128;
}

/// Persists one installation ID in secure storage for this app install.
class SecureInstallationIdStore implements InstallationIdStore {
  SecureInstallationIdStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  Future<String>? _inFlight;

  @override
  Future<String> readOrCreate() {
    return _inFlight ??= _readOrCreate();
  }

  Future<String> _readOrCreate() async {
    final existing = await _storage.read(key: installationIdStorageKey);
    if (existing != null && isValidInstallationId(existing)) {
      return existing;
    }
    final generated = generateInstallationId();
    await _storage.write(key: installationIdStorageKey, value: generated);
    return generated;
  }
}

/// In-memory store for tests. A new instance models a reinstall / wiped storage.
class MemoryInstallationIdStore implements InstallationIdStore {
  MemoryInstallationIdStore({this.initial});

  String? value;
  final String? initial;

  @override
  Future<String> readOrCreate() async {
    final existing = value ?? initial;
    if (existing != null && isValidInstallationId(existing)) {
      value = existing;
      return existing;
    }
    final generated = generateInstallationId();
    value = generated;
    return generated;
  }
}

final installationIdStoreProvider = Provider<InstallationIdStore>((ref) {
  return SecureInstallationIdStore();
});
