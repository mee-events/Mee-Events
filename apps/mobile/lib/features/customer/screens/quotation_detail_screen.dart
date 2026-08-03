import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/workspace/event_workspace_screen.dart';
import 'package:mee_events/models/quotation.dart';
import 'package:mee_events/shared/detail_row.dart';
import 'package:mee_events/shared/section_header.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

String _money(String? raw) {
  final value = double.tryParse(raw ?? '') ?? 0;
  return _inr.format(value);
}

/// Live quotation detail connected to the backend.
class QuotationDetailScreen extends ConsumerStatefulWidget {
  const QuotationDetailScreen({super.key, required this.quotationId});

  final String quotationId;

  @override
  ConsumerState<QuotationDetailScreen> createState() =>
      _QuotationDetailScreenState();
}

class _QuotationDetailScreenState extends ConsumerState<QuotationDetailScreen> {
  QuotationDetail? _quote;
  String? _error;
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(mobileApiProvider);
      final detail = await api.getQuotation(widget.quotationId);
      if (!mounted) return;
      setState(() {
        _quote = detail;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _loading = false;
      });
    }
  }

  Future<void> _approve() async {
    setState(() => _busy = true);
    try {
      final api = ref.read(mobileApiProvider);
      final detail = await api.approveQuotation(widget.quotationId);
      ref.invalidate(quotationsProvider);
      if (!mounted) return;
      setState(() {
        _quote = detail;
        _busy = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Quotation approved. Submit advance payment next.')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Future<void> _reject() async {
    final reason = await _promptText(
      title: 'Reject quotation',
      hint: 'Reason for rejection',
    );
    if (reason == null || reason.isEmpty) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(mobileApiProvider);
      final detail = await api.rejectQuotation(widget.quotationId, reason);
      ref.invalidate(quotationsProvider);
      if (!mounted) return;
      setState(() {
        _quote = detail;
        _busy = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Future<void> _requestRevision() async {
    final message = await _promptText(
      title: 'Request revision',
      hint: 'What would you like changed?',
    );
    if (message == null || message.isEmpty) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(mobileApiProvider);
      final detail =
          await api.requestQuotationRevision(widget.quotationId, message);
      ref.invalidate(quotationsProvider);
      if (!mounted) return;
      setState(() {
        _quote = detail;
        _busy = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Future<void> _submitAdvance() async {
    final method = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('UPI'),
              onTap: () => Navigator.pop(context, 'upi'),
            ),
            ListTile(
              title: const Text('Cash'),
              onTap: () => Navigator.pop(context, 'cash'),
            ),
            ListTile(
              title: const Text('Bank transfer'),
              onTap: () => Navigator.pop(context, 'bank_transfer'),
            ),
          ],
        ),
      ),
    );
    if (method == null) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(mobileApiProvider);
      final payment = await api.submitAdvancePayment(
        quotationId: widget.quotationId,
        method: method,
      );
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Advance ${payment.referenceCode} submitted (${payment.status}). '
            'Our team will confirm shortly.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Future<void> _pdfPlaceholder() async {
    try {
      final api = ref.read(mobileApiProvider);
      final response = await api.quotationPdfPlaceholder(widget.quotationId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            response['message']?.toString() ??
                'PDF generation is not available yet.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Future<String?> _promptText({
    required String title,
    required String hint,
  }) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(hintText: hint),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.canvas,
        body: Center(child: MeCircularLoader()),
      );
    }
    if (_error != null || _quote == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Quotation'),
        body: MeErrorState(
          kind: MeErrorKind.network,
          message: _error ?? 'Quotation not found',
          onRetry: _load,
        ),
      );
    }

    final quote = _quote!;
    final revision = quote.revision;
    final canDecide = quote.status == 'sent';
    final canPay = quote.status == 'approved';

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: quote.referenceCode,
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_outlined),
            onPressed: _pdfPlaceholder,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          SectionHeader(
            eyebrow: quote.statusLabel.toUpperCase(),
            title: quote.enquiryReferenceCode ?? 'Your quotation',
          ),
          const SizedBox(height: AppSpacing.xl),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surfaceCard,
              border: Border.all(color: AppColors.hairlineSoft),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              children: [
                for (var i = 0; i < quote.items.length; i++) ...[
                  if (i > 0) const Divider(),
                  DetailRow(
                    label: quote.items[i].title,
                    value: _money(quote.items[i].lineTotal),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Container(
            decoration: BoxDecoration(
              color: AppColors.mutedSoft,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              children: [
                DetailRow(
                  label: 'Subtotal',
                  value: _money(revision?.subtotal),
                ),
                DetailRow(
                  label: 'Discount',
                  value: _money(revision?.discountAmount),
                ),
                DetailRow(
                  label: 'GST (${revision?.gstPercent ?? '18'}%)',
                  value: _money(revision?.gstAmount),
                ),
                const Divider(),
                Row(
                  children: [
                    Text('Total', style: AppTypography.displaySm),
                    const Spacer(),
                    Text(
                      _money(revision?.finalAmount ?? quote.finalAmount),
                      style: AppTypography.displaySm.copyWith(
                        color: AppColors.ink,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                DetailRow(
                  label: 'Advance (${revision?.advancePercent ?? '30'}%)',
                  value: _money(revision?.advanceAmount ?? quote.advanceAmount),
                ),
              ],
            ),
          ),
          if (revision?.terms != null) ...[
            const SizedBox(height: AppSpacing.lg),
            Text('Terms', style: AppTypography.titleMd),
            const SizedBox(height: AppSpacing.sm),
            Text(revision!.terms!, style: AppTypography.bodyMd),
          ],
          const SizedBox(height: AppSpacing.xl),
          Text('Timeline', style: AppTypography.titleMd),
          const SizedBox(height: AppSpacing.md),
          MeTimeline(
            steps: [
              for (var i = 0; i < quote.activities.length; i++)
                MeTimelineStep(
                  title: quote.activities[i].activityType,
                  subtitle: quote.activities[i].content,
                  done: i < quote.activities.length - 1,
                  active: i == 0,
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xxl),
          if (canDecide) ...[
            MeButton.primary(
              label: 'Approve quote',
              busy: _busy,
              onPressed: _busy ? null : _approve,
            ),
            const SizedBox(height: AppSpacing.md),
            MeButton.outline(
              label: 'Request revision',
              onPressed: _busy ? null : _requestRevision,
            ),
            const SizedBox(height: AppSpacing.md),
            MeButton.outline(
              label: 'Reject quote',
              onPressed: _busy ? null : _reject,
            ),
          ],
          if (canPay) ...[
            MeButton.primary(
              label: 'Submit advance payment',
              busy: _busy,
              onPressed: _busy ? null : _submitAdvance,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Payment stays pending until our team confirms. Booking is created after confirmation.',
              style: AppTypography.bodySm.copyWith(color: AppColors.muted),
            ),
          ],
          if (quote.bookingId != null)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const MeBadge(
                    label: 'Booking confirmed',
                    tone: MeStatusTone.success,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  MeButton.primary(
                    label: 'Open My Event',
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => EventWorkspaceScreen(
                            bookingId: quote.bookingId!,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
