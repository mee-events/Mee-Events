import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Android release boundary', () {
    test('main manifest keeps network permission', () {
      final manifest = File(
        'android/app/src/main/AndroidManifest.xml',
      ).readAsStringSync();

      expect(
        manifest,
        contains(
          '<uses-permission android:name="android.permission.INTERNET"/>',
        ),
      );
    });

    test('release never selects the debug signing configuration', () {
      final gradle = File('android/app/build.gradle.kts').readAsStringSync();

      expect(
        gradle,
        isNot(
          matches(RegExp(r'signingConfig\s*=\s*signingConfigs[^\n]*debug')),
        ),
      );
      for (final environmentName in const [
        'ANDROID_RELEASE_STORE_FILE',
        'ANDROID_RELEASE_STORE_PASSWORD',
        'ANDROID_RELEASE_KEY_ALIAS',
        'ANDROID_RELEASE_KEY_PASSWORD',
      ]) {
        expect(gradle, contains(environmentName));
      }
    });

    test('tracked files contain no release key or literal signing value', () {
      final repository = _repositoryRoot();
      final result = Process.runSync(
        'git',
        ['ls-files', '-z'],
        workingDirectory: repository.path,
        stdoutEncoding: utf8,
        stderrEncoding: utf8,
      );
      expect(result.exitCode, 0, reason: 'git tracked-file inventory failed');
      final trackedPaths = (result.stdout as String)
          .split('\u0000')
          .where((path) => path.isNotEmpty)
          .toList(growable: false);

      final forbiddenKeyPaths = trackedPaths.where(_isSigningKeyPath).toList();
      expect(
        forbiddenKeyPaths,
        isEmpty,
        reason: 'release keys and key.properties must remain outside Git',
      );

      final literalAssignments = <String>[];
      for (final path in trackedPaths.where(_isSigningConfigCandidate)) {
        final file = File('${repository.path}/$path');
        final contents = file.readAsStringSync();
        for (final match in _signingAssignment.allMatches(contents)) {
          if (!_isExternalSigningExpression(match.group(2) ?? '')) {
            literalAssignments.add('$path:${match.group(1)}');
          }
        }
      }
      expect(
        literalAssignments,
        isEmpty,
        reason: 'release signing values must be supplied externally',
      );
    });
  });
}

Directory _repositoryRoot() {
  var directory = Directory.current.absolute;
  while (!Directory('${directory.path}/.git').existsSync()) {
    final parent = directory.parent;
    if (parent.path == directory.path) {
      throw StateError('Git repository root not found');
    }
    directory = parent;
  }
  return directory;
}

bool _isSigningKeyPath(String path) {
  final lower = path.toLowerCase();
  final name = lower.split('/').last;
  return name == 'key.properties' ||
      lower.endsWith('.jks') ||
      lower.endsWith('.keystore') ||
      lower.endsWith('.p8') ||
      lower.endsWith('.p12') ||
      lower.endsWith('.pfx');
}

bool _isSigningConfigCandidate(String path) {
  final lower = path.toLowerCase();
  return lower.endsWith('.properties') ||
      lower.endsWith('.gradle') ||
      lower.endsWith('.gradle.kts') ||
      lower.endsWith('.yaml') ||
      lower.endsWith('.yml') ||
      lower.endsWith('.json') ||
      lower.endsWith('.sh') ||
      lower.contains('/.env') ||
      lower.startsWith('.env');
}

final _signingAssignment = RegExp(
  r'''^\s*["']?(storeFile|storePassword|keyAlias|keyPassword|ANDROID_RELEASE_STORE_FILE|ANDROID_RELEASE_STORE_PASSWORD|ANDROID_RELEASE_KEY_ALIAS|ANDROID_RELEASE_KEY_PASSWORD)["']?\s*[:=]\s*(.*?)\s*[,;]?\s*$''',
  multiLine: true,
);

bool _isExternalSigningExpression(String rawValue) {
  final value = rawValue.trim().replaceAll(RegExp(r'''^["']|["']$'''), '');
  if (value.isEmpty ||
      value.contains(r'$') ||
      value.contains('releaseSigning') ||
      value.contains('System.getenv') ||
      value.contains('environmentVariable')) {
    return true;
  }
  final lower = value.toLowerCase();
  return lower.contains('placeholder') ||
      lower.contains('replace') ||
      lower.contains('example') ||
      lower.contains('external') ||
      lower.contains('your_') ||
      (value.startsWith('<') && value.endsWith('>'));
}
