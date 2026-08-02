enum PaymentMethod { gpay, phonepe, paytm, upiId, card, netBanking }

enum DepositOption { full, advance25 }

class PaymentSummary {
  final String title;
  final String providerOrLocation;
  final int baseAmount;
  final int gstAmount;
  final int convenienceFee;
  final DepositOption selectedDeposit;
  final PaymentMethod selectedMethod;

  const PaymentSummary({
    required this.title,
    required this.providerOrLocation,
    required this.baseAmount,
    required this.gstAmount,
    required this.convenienceFee,
    this.selectedDeposit = DepositOption.advance25,
    this.selectedMethod = PaymentMethod.gpay,
  });

  int get totalAmount => baseAmount + gstAmount + convenienceFee;

  int get payableAmount =>
      selectedDeposit == DepositOption.advance25 ? (totalAmount * 0.25).round() : totalAmount;

  String formatCurrency(int amount) {
    final String priceStr = amount.toString();
    if (priceStr.length <= 3) return '₹$priceStr';
    
    String result = priceStr.substring(priceStr.length - 3);
    String remaining = priceStr.substring(0, priceStr.length - 3);
    while (remaining.length > 2) {
      result = '${remaining.substring(remaining.length - 2)},$result';
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.isNotEmpty) {
      result = '$remaining,$result';
    }
    return '₹$result';
  }
}
