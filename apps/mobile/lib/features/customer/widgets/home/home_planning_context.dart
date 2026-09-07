import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_provider.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_store.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class HomePlanningContextControl extends StatelessWidget {
  const HomePlanningContextControl({
    super.key,
    required this.planningContext,
    required this.onTap,
  });

  static const controlKey = Key('home-planning-context-control');
  static const minTargetSize = 44.0;

  final CustomerPlanningContext planningContext;
  final VoidCallback onTap;

  String get _dateLabel => planningContext.eventDate == null
      ? 'Add event date'
      : DateFormat('d MMM').format(planningContext.eventDate!);

  String get _semanticLabel {
    final date = planningContext.eventDate == null
        ? 'No event date selected'
        : 'Event date ${DateFormat('d MMMM yyyy').format(planningContext.eventDate!)}';
    return 'Planning context. ${planningContext.compactLocation}. $date. Edit planning context';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        AppSpacing.sm,
      ),
      child: Semantics(
        button: true,
        label: _semanticLabel,
        excludeSemantics: true,
        child: Material(
          key: controlKey,
          color: AppColors.goldSoft.withValues(alpha: 0.52),
          borderRadius: AppRadius.fullAll,
          child: InkWell(
            onTap: onTap,
            borderRadius: AppRadius.fullAll,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: minTargetSize),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: AppIconSize.sm,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        '${planningContext.compactLocation} · $_dateLabel',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.ink,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    const Icon(
                      Icons.tune_rounded,
                      size: AppIconSize.sm,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomePlanningContextSheet extends StatefulWidget {
  const HomePlanningContextSheet({
    super.key,
    required this.initialContext,
    required this.today,
    required this.onSave,
  });

  static const sheetKey = Key('home-planning-context-sheet');
  static const areaFieldKey = Key('home-planning-context-area');
  static const dateFieldKey = Key('home-planning-context-date');
  static const clearAreaKey = Key('home-planning-context-clear-area');
  static const clearDateKey = Key('home-planning-context-clear-date');
  static const saveKey = Key('home-planning-context-save');
  static const persistenceMessageKey = Key(
    'home-planning-context-persistence-message',
  );

  static const guestSessionMessage =
      'Sign in to keep this context after closing the app.';
  static const persistenceFailureMessage =
      "Kept for this session only. We couldn't save it on this device.";

  final CustomerPlanningContext initialContext;
  final DateTime today;
  final Future<PlanningContextSaveResult> Function(
    String area,
    DateTime? eventDate,
  )
  onSave;

  @override
  State<HomePlanningContextSheet> createState() =>
      _HomePlanningContextSheetState();
}

class _HomePlanningContextSheetState extends State<HomePlanningContextSheet> {
  late final TextEditingController _areaController;
  DateTime? _eventDate;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _areaController = TextEditingController(text: widget.initialContext.area);
    _eventDate = widget.initialContext.eventDate;
  }

  @override
  void dispose() {
    _areaController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final today = planningContextDateOnly(widget.today);
    final selected = _eventDate;
    final initialDate =
        selected == null || isPastPlanningContextDate(selected, today)
        ? today
        : selected;
    final defaultLastDate = today.add(const Duration(days: 730));
    final lastDate = initialDate.isAfter(defaultLastDate)
        ? initialDate
        : defaultLastDate;
    final picked = await showMeDatePicker(
      context,
      initialDate: initialDate,
      firstDate: today,
      lastDate: lastDate,
    );
    if (picked != null && mounted) {
      setState(() {
        _eventDate = planningContextDateOnly(picked);
        _error = null;
      });
    }
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final result = await widget.onSave(
      sanitizePlanningContextArea(_areaController.text),
      _eventDate,
    );
    if (!mounted) return;
    switch (result) {
      case PlanningContextSaveResult.persisted:
        Navigator.of(context).pop();
      case PlanningContextSaveResult.sessionOnly:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(HomePlanningContextSheet.guestSessionMessage),
          ),
        );
        Navigator.of(context).pop();
      case PlanningContextSaveResult.persistenceFailed:
        setState(() {
          _saving = false;
          _error = HomePlanningContextSheet.persistenceFailureMessage;
        });
      case PlanningContextSaveResult.rejectedPastDate:
        setState(() {
          _saving = false;
          _error = 'Choose today or a future event date.';
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: SingleChildScrollView(
        key: HomePlanningContextSheet.sheetKey,
        padding: EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.md,
          AppSpacing.lg,
          AppSpacing.lg + bottomInset,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: const BoxDecoration(
                  color: AppColors.hairline,
                  borderRadius: AppRadius.fullAll,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Semantics(
              header: true,
              child: Text(
                'Event planning context',
                style: AppTypography.displaySm,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Mee Events currently serves Hyderabad. Add an optional area or venue and an exact event date to help prepare your event enquiry.',
              style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
            ),
            const SizedBox(height: AppSpacing.md),
            TextField(
              key: HomePlanningContextSheet.areaFieldKey,
              controller: _areaController,
              onChanged: (_) => setState(() => _error = null),
              maxLength: kPlanningContextAreaMaxLength,
              textInputAction: TextInputAction.done,
              inputFormatters: [
                FilteringTextInputFormatter.deny(
                  planningContextControlCharacters,
                  replacementString: ' ',
                ),
                LengthLimitingTextInputFormatter(kPlanningContextAreaMaxLength),
              ],
              style: AppTypography.bodyMd,
              decoration: meInputDecoration(
                label: 'Area or venue within Hyderabad (optional)',
                hint: 'For example, Gachibowli',
              ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                key: HomePlanningContextSheet.clearAreaKey,
                onPressed: _areaController.text.isEmpty
                    ? null
                    : () {
                        _areaController.clear();
                        setState(() {});
                      },
                style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                child: const Text('Clear area'),
              ),
            ),
            SizedBox(
              key: HomePlanningContextSheet.dateFieldKey,
              width: double.infinity,
              child: MeDateField(
                label: 'Add event date',
                valueText: _eventDate == null
                    ? null
                    : DateFormat('d MMM yyyy').format(_eventDate!),
                onPick: _pickDate,
              ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                key: HomePlanningContextSheet.clearDateKey,
                onPressed: _eventDate == null
                    ? null
                    : () => setState(() => _eventDate = null),
                style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                child: const Text('Clear date'),
              ),
            ),
            Text(
              'This helps prepare your enquiry. It does not check live vendor availability or filter services, prices, or recommendations.',
              style: AppTypography.bodySm.copyWith(color: AppColors.muted),
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                _error!,
                key: HomePlanningContextSheet.persistenceMessageKey,
                style: AppTypography.bodySm.copyWith(color: AppColors.error),
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: MeButton.text(
                    label: 'Cancel',
                    expand: true,
                    onPressed: _saving
                        ? null
                        : () => Navigator.of(context).pop(),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: KeyedSubtree(
                    key: HomePlanningContextSheet.saveKey,
                    child: MeButton.primary(
                      label: 'Save context',
                      busy: _saving,
                      onPressed: _save,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
