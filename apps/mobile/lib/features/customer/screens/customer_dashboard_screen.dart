import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/shared/role_bottom_bar.dart';
import 'package:mee_events/features/customer/screens/home_tab.dart';
import 'package:mee_events/features/customer/screens/explore_tab.dart';
import 'package:mee_events/features/customer/screens/plan_tab.dart';
import 'package:mee_events/features/customer/screens/enquiries_tab.dart';
import 'package:mee_events/features/customer/screens/account_tab.dart';

class CustomerDashboardScreen extends StatefulWidget {
  const CustomerDashboardScreen({super.key});

  @override
  State<CustomerDashboardScreen> createState() => _CustomerDashboardScreenState();
}

class _CustomerDashboardScreenState extends State<CustomerDashboardScreen> {
  int _activeTab = 0;

  final List<Widget> _tabs = const [
    CustomerHomeTab(), // Home
    ExploreTab(),      // Category
    EnquiriesTab(),    // Enquiry
    PlanTab(),         // ME Plan
    AccountTab(),      // More
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: IndexedStack(
        index: _activeTab,
        children: _tabs,
      ),
      bottomNavigationBar: RoleBottomBar(
        currentIndex: _activeTab,
        onTap: (index) {
          setState(() {
            _activeTab = index;
          });
        },
      ),
    );
  }
}
