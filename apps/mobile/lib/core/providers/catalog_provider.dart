import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_selection.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/models/occasion_stage.dart';

/// Session-scoped occasions list. Invalidate on pull-to-refresh.
final eventTypesProvider = FutureProvider<List<CatalogItem>>((ref) async {
  ref.keepAlive();
  final api = ref.watch(mobileApiProvider);
  return api.listEventTypes();
});

/// Session-scoped service departments. Invalidate on pull-to-refresh.
final serviceCategoriesProvider = FutureProvider<List<CatalogItem>>((
  ref,
) async {
  ref.keepAlive();
  final api = ref.watch(mobileApiProvider);
  return api.listServiceCategories();
});

/// Session-scoped granular catalog. Invalidate on pull-to-refresh.
final catalogServicesProvider =
    FutureProvider.family<List<CatalogService>, String?>((
      ref,
      department,
    ) async {
      ref.keepAlive();
      final api = ref.watch(mobileApiProvider);
      return api.listCatalogServices(department: department);
    });

/// Detail-scoped; disposed when leaving CategoryDetailScreen.
final occasionStagesProvider = FutureProvider.autoDispose
    .family<List<OccasionStage>, String>((ref, occasionCode) async {
      final api = ref.watch(mobileApiProvider);
      return api.getOccasionStages(occasionCode);
    });

/// Detail-scoped; disposed when leaving CategoryDetailScreen.
final occasionServicesProvider = FutureProvider.autoDispose
    .family<List<CatalogService>, String>((ref, occasionCode) async {
      final api = ref.watch(mobileApiProvider);
      return api.getServicesForOccasion(occasionCode);
    });

final eventSelectionsProvider = FutureProvider.autoDispose
    .family<List<CatalogSelection>, String>((ref, eventTypeCode) async {
      final api = ref.watch(mobileApiProvider);
      return api.getEventSelections(eventTypeCode);
    });

/// Detail-scoped live service record. Do not use list endpoints as a substitute.
final catalogServiceProvider = FutureProvider.autoDispose
    .family<CatalogService, String>((ref, code) async {
      final api = ref.watch(mobileApiProvider);
      return api.getCatalogService(code);
    });

final serviceSubcategoriesProvider = FutureProvider.autoDispose
    .family<List<CatalogSubcategory>, String>((ref, serviceCode) async {
      final api = ref.watch(mobileApiProvider);
      return api.getServiceSubcategories(serviceCode);
    });

final serviceProductsProvider = FutureProvider.autoDispose
    .family<List<CatalogProduct>, String>((ref, serviceCode) async {
      final api = ref.watch(mobileApiProvider);
      return api.getServiceProducts(serviceCode);
    });

final catalogProductProvider = FutureProvider.autoDispose
    .family<CatalogProduct, String>((ref, productCode) async {
      final api = ref.watch(mobileApiProvider);
      return api.getCatalogProduct(productCode);
    });
