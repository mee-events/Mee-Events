import 'dart:async';

abstract interface class OtpTicker {
  void cancel();
}

abstract interface class OtpTimeSource {
  DateTime now();

  OtpTicker startPeriodic(Duration interval, void Function() onTick);
}

class SystemOtpTimeSource implements OtpTimeSource {
  const SystemOtpTimeSource();

  @override
  DateTime now() => DateTime.now();

  @override
  OtpTicker startPeriodic(Duration interval, void Function() onTick) {
    return _SystemOtpTicker(Timer.periodic(interval, (_) => onTick()));
  }
}

class _SystemOtpTicker implements OtpTicker {
  const _SystemOtpTicker(this._timer);

  final Timer _timer;

  @override
  void cancel() => _timer.cancel();
}
