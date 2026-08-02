import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/service_package.dart';
import '../repositories/service_repository.dart';

final serviceRepositoryProvider = Provider<ServiceRepository>((ref) {
  return ServiceRepository();
});

final packagesByCategoryProvider = FutureProvider.family<List<ServicePackage>, String>((ref, category) async {
  final repository = ref.watch(serviceRepositoryProvider);
  return repository.fetchPackagesByCategory(category);
});
