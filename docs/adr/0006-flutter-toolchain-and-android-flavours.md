# ADR 0006: Flutter toolchain and Android flavours

- Status: superseded by ADR 0010
- Date: 2026-07-27

## Context

ME Event needs repeatable dev, staging, and production mobile builds with isolated
application identities. Flutter 3.44.8 generates Android projects with AGP 9,
while some current Flutter plugins still require the legacy Kotlin Gradle plugin.

## Decision

- Pin CI to Flutter 3.44.8 and Dart 3.12-compatible dependencies.
- Use Android product flavours named `dev`, `staging`, and `prod`.
- Use application IDs `com.meevent.app.dev`, `com.meevent.app.staging`, and
  `com.meevent.app`.
- Pass non-secret environment configuration through `--dart-define`.
- Never sign a release with debug keys.
- Temporarily set `android.builtInKotlin=false` and explicitly apply the Kotlin
  Android plugin until `jni` and its dependent Flutter plugin chain are compatible
  with AGP 9 built-in Kotlin.

## Consequences

The Kotlin escape hatch is technical debt and must be removed when upstream
plugins support AGP 9. Dependency upgrades must include an Android build test.
Native iOS schemes and bundle IDs require full Xcode and remain a tracked blocker.
