import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/customer/catalog/customer_catalog_copy.dart';

void main() {
  test('customerFacingDepartmentLabel formats codes for customers', () {
    expect(
      customerFacingDepartmentLabel('photography_department'),
      'Photography',
    );
    expect(
      customerFacingDepartmentLabel('event_decoration'),
      'Event Decoration',
    );
    expect(
      customerFacingDepartmentLabel('PHOTOGRAPHY_DEPARTMENT'),
      'Photography',
    );
    expect(customerFacingDepartmentLabel('  '), '');
    expect(customerFacingDepartmentLabel('food'), 'Food');
  });

  test('customerFacingOccasionTitle treats blank input as absent', () {
    expect(customerFacingOccasionTitle(null), isNull);
    expect(customerFacingOccasionTitle(''), isNull);
    expect(customerFacingOccasionTitle('   '), isNull);
    expect(customerFacingOccasionTitle('Wedding'), 'Wedding');
  });

  test(
    'productEnquiryContextNotes include live names and optional occasion',
    () {
      expect(
        productEnquiryContextNotes(
          productName: 'Candid Album',
          serviceName: 'Photography & Videography',
          occasionTitle: 'Wedding',
        ),
        'Interested in Candid Album from Photography & Videography for Wedding',
      );
      expect(
        productEnquiryContextNotes(
          productName: 'Candid Album',
          occasionTitle: 'Wedding',
        ),
        'Interested in Candid Album for Wedding',
      );
      expect(
        productEnquiryContextNotes(productName: 'Candid Album'),
        'Interested in Candid Album',
      );
    },
  );
}
