import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/screens/enquiry_success_screen.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/widgets/enquiry_checkout/enquiry_step_indicator.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Multi-step enquiry checkout flow (Services → Details → Send).
class EnquiryCheckoutScreen extends ConsumerStatefulWidget {
  const EnquiryCheckoutScreen({
    super.key,
    this.initialEventTypeCode,
    this.initialServiceCategoryCodes = const [],
    this.contextNotes,
  });

  /// Pre-select occasion when opening from detail flows.
  final String? initialEventTypeCode;

  /// Pre-select service categories / departments.
  final List<String> initialServiceCategoryCodes;

  /// Seed notes with originating service/occasion context.
  final String? contextNotes;

  @override
  ConsumerState<EnquiryCheckoutScreen> createState() =>
      _EnquiryCheckoutScreenState();
}

class _EnquiryCheckoutScreenState extends ConsumerState<EnquiryCheckoutScreen> {
  static const int _stepCount = 3;
  int _currentStep = 0;

  // Form State
  final _locationController = TextEditingController();
  final _guestsController = TextEditingController();
  final _notesController = TextEditingController();

  List<CatalogItem>? _eventTypes;
  List<CatalogItem>? _serviceCategories;
  String? _selectedEventType;
  final Set<String> _selectedServices = {};
  DateTime? _eventDate;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCatalog();
  }

  @override
  void dispose() {
    _locationController.dispose();
    _guestsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadCatalog() async {
    try {
      final api = ref.read(mobileApiProvider);
      final eventTypes = await api.listEventTypes();
      final serviceCategories = await api.listServiceCategories();
      if (!mounted) return;
      setState(() {
        _eventTypes = eventTypes;
        _serviceCategories = serviceCategories;
        _error = null;
        final initialType = widget.initialEventTypeCode;
        if (initialType != null &&
            eventTypes.any((e) => e.code == initialType)) {
          _selectedEventType = initialType;
        }
        final allowed = {for (final c in serviceCategories) c.code};
        for (final code in widget.initialServiceCategoryCodes) {
          if (allowed.contains(code)) {
            _selectedServices.add(code);
          }
        }
        final notes = widget.contextNotes?.trim();
        if (notes != null &&
            notes.isNotEmpty &&
            _notesController.text.trim().isEmpty) {
          _notesController.text = notes;
        }
      });
    } on ApiRequestException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.error.message);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showMeDatePicker(context, initialDate: _eventDate);
    if (picked != null) {
      setState(() => _eventDate = picked);
    }
  }

  void _goToStep(int step) {
    if (step < 0 || step >= _stepCount) return;
    setState(() {
      _error = null;
      _currentStep = step;
    });
  }

  void _next() {
    if (_currentStep == 0) {
      if (_selectedEventType == null) {
        setState(() => _error = 'Please select an event type to continue.');
        return;
      }
    } else if (_currentStep == 1) {
      if (_eventDate == null || _locationController.text.trim().isEmpty) {
        setState(() => _error = 'Please provide an event date and location.');
        return;
      }
    }
    _goToStep(_currentStep + 1);
  }

  void _back() => _goToStep(_currentStep - 1);

  Future<void> _submit() async {
    if (_selectedEventType == null) {
      setState(() => _error = 'Please select an event type.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = ref.read(mobileApiProvider);
      final enquiry = await api.createEnquiry(
        eventTypeCode: _selectedEventType!,
        eventDate: _eventDate == null
            ? null
            : DateFormat('yyyy-MM-dd').format(_eventDate!),
        location: _locationController.text.trim(),
        guestCount: int.tryParse(_guestsController.text.trim()),
        notes: _notesController.text.trim(),
        serviceCategoryCodes: _selectedServices.toList(),
        planItems: (ref.read(eventPlanProvider).valueOrNull ?? const [])
            .map((item) => item.toApiJson())
            .toList(),
      );
      ref.invalidate(enquiriesProvider);
      await ref.read(eventPlanProvider.notifier).clear();
      if (!mounted) return;

      // Navigate to success screen
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) =>
              EnquirySuccessScreen(referenceCode: enquiry.referenceCode),
        ),
      );
    } on ApiRequestException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoaded = _eventTypes != null && _serviceCategories != null;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: 'Plan an event',
        leading: MeIconButton(
          icon: Icons.arrow_back_rounded,
          color: AppColors.ink,
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
      ),
      // Sticky bottom bar prevents keyboard squashing
      bottomNavigationBar: isLoaded ? _buildBottomBar() : null,
      body: !isLoaded
          ? Center(
              child: _error == null
                  ? const MeCircularLoader()
                  : MeErrorState(
                      kind: MeErrorKind.server,
                      message: _error,
                      onRetry: () {
                        setState(() => _error = null);
                        _loadCatalog();
                      },
                    ),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                EnquiryStepIndicator(currentStep: _currentStep),
                Expanded(
                  child: IndexedStack(
                    index: _currentStep,
                    children: [
                      _buildSummaryStep(),
                      _buildDetailsStep(),
                      _buildSendStep(),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildBottomBar() {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppColors.canvas,
        border: Border(top: BorderSide(color: AppColors.hairlineSoft)),
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.lg,
          AppSpacing.lg + bottomPadding,
        ),
        child: Row(
          children: [
            MeButton.text(
              label: 'Back',
              onPressed: _currentStep > 0 && !_busy ? _back : null,
            ),
            const Spacer(),
            if (_currentStep < _stepCount - 1)
              MeButton.primary(label: 'Next', expand: false, onPressed: _next)
            else
              MeButton.primary(
                label: 'Submit Enquiry',
                busy: _busy,
                expand: false,
                onPressed: _submit,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryStep() {
    final eventTypes = _eventTypes!;
    final serviceCategories = _serviceCategories!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Services', style: AppTypography.displaySm),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'What kind of event are you planning?',
            style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'EVENT TYPE',
            style: AppTypography.eyebrow.copyWith(color: AppColors.goldAccent),
          ),
          const SizedBox(height: AppSpacing.sm),
          MeSurfaceCard(
            padding: EdgeInsets.zero,
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (var i = 0; i < eventTypes.length; i++) ...[
                  if (i > 0)
                    const Divider(
                      height: 1,
                      color: AppColors.hairlineSoft,
                      indent: 56,
                    ),
                  _EnquirySelectRow(
                    label: eventTypes[i].displayName,
                    selected: _selectedEventType == eventTypes[i].code,
                    onTap: () =>
                        setState(() => _selectedEventType = eventTypes[i].code),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'SERVICES NEEDED',
            style: AppTypography.eyebrow.copyWith(color: AppColors.goldAccent),
          ),
          const SizedBox(height: AppSpacing.sm),
          MeSurfaceCard(
            padding: EdgeInsets.zero,
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (var i = 0; i < serviceCategories.length; i++) ...[
                  if (i > 0)
                    const Divider(
                      height: 1,
                      color: AppColors.hairlineSoft,
                      indent: 56,
                    ),
                  _EnquirySelectRow(
                    label: serviceCategories[i].displayName,
                    selected: _selectedServices.contains(
                      serviceCategories[i].code,
                    ),
                    multiSelect: true,
                    onTap: () => setState(() {
                      final code = serviceCategories[i].code;
                      if (_selectedServices.contains(code)) {
                        _selectedServices.remove(code);
                      } else {
                        _selectedServices.add(code);
                      }
                    }),
                  ),
                ],
              ],
            ),
          ),
          if (_error != null && _currentStep == 0) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              _error!,
              style: AppTypography.bodySm.copyWith(color: AppColors.error),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Details', style: AppTypography.displaySm),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Tell us when and where.',
            style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: AppSpacing.xl),
          MeSurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: double.infinity,
                  child: MeDateField(
                    label: 'Event date',
                    valueText: _eventDate == null
                        ? null
                        : DateFormat('MMM dd, yyyy').format(_eventDate!),
                    onPick: _pickDate,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                MeTextField(
                  controller: _locationController,
                  label: 'Location',
                  hint: 'City, venue, or area',
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: AppSpacing.md),
                MeTextField(
                  controller: _guestsController,
                  label: 'Guest count',
                  hint: 'Approximate number of guests',
                  keyboardType: TextInputType.number,
                  onChanged: (_) => setState(() {}),
                ),
              ],
            ),
          ),
          if (_error != null && _currentStep == 1) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              _error!,
              style: AppTypography.bodySm.copyWith(color: AppColors.error),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSendStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Send', style: AppTypography.displaySm),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Any final notes for our team?',
            style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: AppSpacing.xl),
          MeSurfaceCard(
            child: MeTextField(
              controller: _notesController,
              label: 'Note',
              hint: 'Special requests, themes, or context',
              maxLines: 4,
              onChanged: (_) => setState(() {}),
            ),
          ),
          if (_error != null && _currentStep == 2) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              _error!,
              style: AppTypography.bodySm.copyWith(color: AppColors.error),
            ),
          ],
        ],
      ),
    );
  }
}

class _EnquirySelectRow extends StatelessWidget {
  const _EnquirySelectRow({
    required this.label,
    required this.selected,
    required this.onTap,
    this.multiSelect = false,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool multiSelect;

  @override
  Widget build(BuildContext context) {
    final icon = multiSelect
        ? (selected ? Icons.check_box : Icons.check_box_outline_blank)
        : (selected ? Icons.radio_button_checked : Icons.radio_button_off);

    return MePressable(
      onTap: onTap,
      splashColor: AppColors.primarySoft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: AppIconSize.lg,
                color: selected ? AppColors.primary : AppColors.muted,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.titleMd.copyWith(
                    color: selected ? AppColors.primary : AppColors.ink,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
