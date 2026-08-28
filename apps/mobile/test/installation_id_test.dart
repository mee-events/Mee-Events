import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/auth/installation_id.dart';

void main() {
  test('same store returns the same installation id', () async {
    final store = MemoryInstallationIdStore();
    final first = await store.readOrCreate();
    final second = await store.readOrCreate();
    expect(first, second);
    expect(isValidInstallationId(first), isTrue);
    expect(first.startsWith('mobile-'), isTrue);
  });

  test('a new store models a reinstall with a different id', () async {
    final firstInstall = MemoryInstallationIdStore(initial: 'mobile-install-a');
    final reinstall = MemoryInstallationIdStore(initial: 'mobile-install-b');
    expect(await firstInstall.readOrCreate(), 'mobile-install-a');
    expect(await reinstall.readOrCreate(), 'mobile-install-b');
    expect(
      await firstInstall.readOrCreate(),
      isNot(await reinstall.readOrCreate()),
    );
  });

  test('invalid stored values are replaced once and then reused', () async {
    final store = MemoryInstallationIdStore(initial: 'short');
    final generated = await store.readOrCreate();
    expect(isValidInstallationId(generated), isTrue);
    expect(await store.readOrCreate(), generated);
  });
}
