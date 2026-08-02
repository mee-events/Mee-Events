import 'package:flutter/material.dart';
import 'package:mee_events/features/customer/screens/quotation_detail_screen.dart';

/// Compatibility wrapper — opens the live quotation detail screen.
class QuoteViewOverlay {
  const QuoteViewOverlay._();

  static void show(BuildContext context, {required String quotationId}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => QuotationDetailScreen(quotationId: quotationId),
      ),
    );
  }
}
