import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Live enquiry submission against POST /enquiries.
class NewEnquiryScreen extends ConsumerStatefulWidget {
  const NewEnquiryScreen({super.key});

  @override
  ConsumerState<NewEnquiryScreen> createState() => _NewEnquiryScreenState();
}

class _NewEnquiryScreenState extends ConsumerState<NewEnquiryScreen> {
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

  Future<void> _submit() async {
    final eventType = _selectedEventType;
    if (eventType == null) {
      setState(() => _error = 'Choose an event type');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = ref.read(mobileApiProvider);
      final enquiry = await api.createEnquiry(
        eventTypeCode: eventType,
        eventDate: _eventDate == null
            ? null
            : DateFormat('yyyy-MM-dd').format(_eventDate!),
        location: _locationController.text.trim(),
        guestCount: int.tryParse(_guestsController.text.trim()),
        notes: _notesController.text.trim(),
        serviceCategoryCodes: _selectedServices.toList(),
      );
      ref.invalidate(enquiriesProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Enquiry ${enquiry.referenceCode} submitted. Our team will contact you shortly.',
          ),
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
    final eventTypes = _eventTypes;
    final serviceCategories = _serviceCategories;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Plan an event'),
      body: eventTypes == null || serviceCategories == null
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
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.xl),
              children: [
                Text('Event type', style: AppTypography.titleMd),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: eventTypes
                      .map(
                        (type) => MeChip(
                          label: type.displayName,
                          selected: _selectedEventType == type.code,
                          onSelected: (_) => setState(
                            () => _selectedEventType = type.code,
                          ),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: AppSpacing.xxl),
                Text('Services needed', style: AppTypography.titleMd),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: serviceCategories
                      .map(
                        (category) => MeChip(
                          label: category.displayName,
                          selected: _selectedServices.contains(category.code),
                          onSelected: (selected) => setState(() {
                            if (selected) {
                              _selectedServices.add(category.code);
                            } else {
                              _selectedServices.remove(category.code);
                            }
                          }),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: AppSpacing.xxl),
                Text('Details', style: AppTypography.titleMd),
                const SizedBox(height: AppSpacing.md),
                MeDateField(
                  label: 'Choose event date',
                  valueText: _eventDate == null
                      ? null
                      : DateFormat('MMM dd, yyyy').format(_eventDate!),
                  onPick: _pickDate,
                ),
                const SizedBox(height: AppSpacing.md),
                MeTextField(
                  controller: _locationController,
                  label: 'Location',
                ),
                const SizedBox(height: AppSpacing.md),
                MeTextField(
                  controller: _guestsController,
                  label: 'Guest count',
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: AppSpacing.md),
                MeTextField(
                  controller: _notesController,
                  label: 'Notes for our team',
                  maxLines: 4,
                ),
                if (_error != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    _error!,
                    style:
                        AppTypography.bodySm.copyWith(color: AppColors.error),
                  ),
                ],
                const SizedBox(height: AppSpacing.xxl),
                MeButton.primary(
                  label: 'Submit enquiry',
                  busy: _busy,
                  onPressed: _submit,
                ),
                const SizedBox(height: AppSpacing.xxxl),
              ],
            ),
    );
  }
}
