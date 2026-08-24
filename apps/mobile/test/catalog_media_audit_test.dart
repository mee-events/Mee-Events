import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

bool isJpeg(Uint8List bytes) =>
    bytes.length >= 3 &&
    bytes[0] == 0xFF &&
    bytes[1] == 0xD8 &&
    bytes[2] == 0xFF;

bool isPng(Uint8List bytes) =>
    bytes.length >= 8 &&
    bytes[0] == 0x89 &&
    bytes[1] == 0x50 &&
    bytes[2] == 0x4E &&
    bytes[3] == 0x47;

bool looksLikeHtml(Uint8List bytes) {
  final head = String.fromCharCodes(bytes.take(80)).toLowerCase();
  return head.contains('<html') ||
      head.contains('<!doctype') ||
      head.contains('404');
}

List<File> walkImages(Directory dir) {
  return dir.listSync(recursive: true).whereType<File>().where((file) {
    final name = file.path.toLowerCase();
    return name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp') ||
        name.endsWith('.gif');
  }).toList();
}

void main() {
  test('bundled catalogue images are classified by magic bytes', () {
    final imagesDir = Directory('assets/images');
    expect(imagesDir.existsSync(), isTrue);
    final files = walkImages(imagesDir);
    final pubspec = File('pubspec.yaml').readAsStringSync();
    final dartFiles = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) => file.path.endsWith('.dart'))
        .toList();
    final dartSources = dartFiles
        .map((file) => file.readAsStringSync())
        .join('\n');
    final assetRefs =
        RegExp(r"assets/images/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp|gif)")
            .allMatches('$dartSources\n$pubspec')
            .map((match) => match.group(0)!)
            .toSet();

    var valid = 0;
    var htmlMasquerade = 0;
    var emptyOrCorrupt = 0;
    final htmlPaths = <String>[];
    final existingAssets = <String>{};

    for (final file in files) {
      final bytes = file.readAsBytesSync();
      final relative = file.path.replaceAll('\\', '/');
      existingAssets.add(relative);
      if (bytes.isEmpty) {
        emptyOrCorrupt += 1;
        continue;
      }
      if (looksLikeHtml(bytes)) {
        htmlMasquerade += 1;
        htmlPaths.add(relative);
        continue;
      }
      if (isJpeg(bytes) || isPng(bytes)) {
        valid += 1;
      } else {
        emptyOrCorrupt += 1;
      }
    }

    final dangling = assetRefs
        .where((path) => !existingAssets.contains(path))
        .toList();
    final unused = existingAssets
        .where((path) => !dartSources.contains(path) && !pubspec.contains(path))
        .toList();

    expect(files.length, greaterThan(50));
    expect(valid, greaterThan(10));
    expect(htmlMasquerade, greaterThanOrEqualTo(24));
    expect(htmlPaths.length, htmlMasquerade);
    expect(emptyOrCorrupt, greaterThanOrEqualTo(0));
    expect(dangling, isEmpty);
    expect(unused.length, greaterThanOrEqualTo(0));
  });
}
