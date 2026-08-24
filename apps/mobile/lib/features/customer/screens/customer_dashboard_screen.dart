import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/role_switcher/mobile_roles.dart';
import 'package:mee_events/features/auth/role_switcher/show_role_switcher.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/screens/account_tab.dart';
import 'package:mee_events/features/customer/screens/enquiries_tab.dart';
import 'package:mee_events/features/customer/screens/explore_tab.dart';
import 'package:mee_events/features/customer/screens/favorites_screen.dart';
import 'package:mee_events/features/customer/screens/home_tab.dart';
import 'package:mee_events/features/customer/screens/plan_tab.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/theme/app_colors.dart';

class CustomerDashboardScreen extends ConsumerStatefulWidget {
  const CustomerDashboardScreen({
    super.key,
    this.branchCode = '',
    this.branchName = '',
  });

  final String branchCode;
  final String branchName;

  @override
  ConsumerState<CustomerDashboardScreen> createState() =>
      _CustomerDashboardScreenState();
}

class _CustomerDashboardScreenState
    extends ConsumerState<CustomerDashboardScreen> {
  CustomerTab _activeTab = CustomerTab.home;
  late final List<Widget> _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = [for (final tab in CustomerTab.values) _pageFor(tab)];
  }

  Widget _pageFor(CustomerTab tab) {
    return switch (tab) {
      CustomerTab.home => CustomerHomeTab(onNavigate: _selectTab),
      CustomerTab.explore => ExploreTab(onNavigate: _selectTab),
      CustomerTab.plan => PlanTab(onNavigate: _selectTab),
      CustomerTab.enquiries => const EnquiriesTab(),
      CustomerTab.account => const AccountTab(),
    };
  }

  void _selectTab(CustomerTab tab) {
    if (tab == _activeTab) return;
    setState(() => _activeTab = tab);
  }

  void _openSearch() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CustomerSearchScreen(onNavigateTab: _selectTab),
      ),
    );
  }

  void _openFavorites() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => FavoritesScreen(onNavigateTab: _selectTab),
      ),
    );
  }

  List<MeBottomNavItem> _navItems(String? planBadge, int? planCount) {
    return [
      for (final tab in CustomerTab.values)
        MeBottomNavItem(
          icon: tab.outlinedIcon,
          selectedIcon: tab.selectedIcon,
          label: tab.navLabel,
          badgeLabel: tab == CustomerTab.plan ? planBadge : null,
          semanticLabel: tab == CustomerTab.plan
              ? customerPlanSemanticLabel(planCount)
              : tab.navLabel,
        ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final plan = ref.watch(eventPlanProvider);
    final planCount = plan.asData?.value.length;
    final planBadge = customerPlanBadgeLabel(planCount);
    final roleLabel = mobileRoleLabel(
      ref.watch(sessionProvider)?.lastActiveRole ?? 'customer',
    );

    return PopScope(
      canPop: _activeTab == CustomerTab.home,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _selectTab(CustomerTab.home);
      },
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: PreferredSize(
          preferredSize: Size.fromHeight(
            MediaQuery.paddingOf(context).top + AppHeader.barHeightFor(context),
          ),
          child: Material(
            color: AppColors.canvas,
            child: SafeArea(
              bottom: false,
              child: AppHeader(
                roleLabel: roleLabel,
                onSwitchRole: () =>
                    showRoleSwitcher(context: context, ref: ref),
                onSearch: _openSearch,
                onFavourite: _openFavorites,
              ),
            ),
          ),
        ),
        body: IndexedStack(
          index: _activeTab.tabIndex,
          children: [
            for (var i = 0; i < CustomerTab.values.length; i++)
              TickerMode(enabled: _activeTab.tabIndex == i, child: _tabs[i]),
          ],
        ),
        bottomNavigationBar: MeBottomNav(
          items: _navItems(planBadge, planCount),
          currentIndex: _activeTab.tabIndex,
          onTap: (index) => _selectTab(CustomerTab.fromIndex(index)),
        ),
      ),
    );
  }
}
