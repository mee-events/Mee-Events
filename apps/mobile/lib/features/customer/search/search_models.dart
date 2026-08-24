class SearchHit {
  const SearchHit({
    required this.id,
    required this.code,
    required this.type,
    required this.name,
    this.subtitle,
    this.imageUrl,
    required this.score,
    this.parentOccasionCode,
    this.parentOccasionName,
  });

  final String id;
  final String code;
  final String type;
  final String name;
  final String? subtitle;
  final String? imageUrl;
  final double score;
  final String? parentOccasionCode;
  final String? parentOccasionName;

  factory SearchHit.fromJson(Map<String, dynamic> json) {
    return SearchHit(
      id: json['id'] as String,
      code: json['code'] as String,
      type: json['type'] as String,
      name: json['name'] as String,
      subtitle: json['subtitle'] as String?,
      imageUrl: json['imageUrl'] as String?,
      score: (json['score'] as num).toDouble(),
      parentOccasionCode: json['parentOccasionCode'] as String?,
      parentOccasionName: json['parentOccasionName'] as String?,
    );
  }

  String get identity => '$type:$code';

  bool get hasStructuredParentOccasion {
    final code = parentOccasionCode?.trim() ?? '';
    final name = parentOccasionName?.trim() ?? '';
    return code.isNotEmpty && name.isNotEmpty;
  }

  bool get isOccasion => type == 'occasion';
  bool get isCategory => type == 'category';
  bool get isServiceLike =>
      type == 'service' ||
      type == 'venue' ||
      type == 'other' ||
      type == 'package';
  bool get isProduct => type == 'product';
}

class SearchResponse {
  const SearchResponse({
    required this.query,
    required this.results,
    this.nextCursor,
  });

  final String query;
  final List<SearchHit> results;
  final String? nextCursor;

  factory SearchResponse.fromJson(Map<String, dynamic> json) {
    final items = json['results'] as List<dynamic>? ?? const [];
    return SearchResponse(
      query: json['query'] as String? ?? '',
      results: items
          .map((item) => SearchHit.fromJson(item as Map<String, dynamic>))
          .toList(),
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

enum SearchResultGroup {
  occasions,
  functions,
  services,
  offerings,
  venuesRentals,
  serviceAreas,
}

class SearchResultSection {
  const SearchResultSection({required this.group, required this.hits});

  final SearchResultGroup group;
  final List<SearchHit> hits;
}

bool isCustomerVisibleSearchHit(SearchHit hit) {
  switch (hit.type) {
    case 'occasion':
    case 'service':
    case 'venue':
    case 'other':
    case 'product':
    case 'category':
      return true;
    case 'stage':
      return hit.hasStructuredParentOccasion;
    default:
      return false;
  }
}

SearchResultGroup? searchGroupForType(String type) {
  switch (type) {
    case 'occasion':
      return SearchResultGroup.occasions;
    case 'stage':
      return SearchResultGroup.functions;
    case 'service':
      return SearchResultGroup.services;
    case 'product':
      return SearchResultGroup.offerings;
    case 'venue':
    case 'other':
      return SearchResultGroup.venuesRentals;
    case 'category':
      return SearchResultGroup.serviceAreas;
    default:
      return null;
  }
}

String searchGroupHeading(SearchResultGroup group) {
  switch (group) {
    case SearchResultGroup.occasions:
      return 'Occasions';
    case SearchResultGroup.functions:
      return 'Functions & ceremonies';
    case SearchResultGroup.services:
      return 'Services';
    case SearchResultGroup.offerings:
      return 'Offerings';
    case SearchResultGroup.venuesRentals:
      return 'Venues & rentals';
    case SearchResultGroup.serviceAreas:
      return 'Service areas';
  }
}

String searchHitKindLabel(SearchHit hit) {
  switch (hit.type) {
    case 'occasion':
      return 'Occasion';
    case 'stage':
      return 'Function or ceremony';
    case 'service':
      return 'Service';
    case 'product':
      return 'Offering';
    case 'venue':
      return 'Venue';
    case 'other':
      return 'Rental';
    case 'category':
      return 'Service area';
    default:
      return 'Result';
  }
}

String searchHitSemanticLabel(SearchHit hit) {
  return '${hit.name}, ${searchHitKindLabel(hit).toLowerCase()}';
}

List<SearchHit> customerSearchHits(List<SearchHit> ranked) {
  return [
    for (final hit in ranked)
      if (isCustomerVisibleSearchHit(hit)) hit,
  ];
}

List<SearchResultSection> groupSearchHits(List<SearchHit> ranked) {
  final buckets = <SearchResultGroup, List<SearchHit>>{};
  for (final hit in customerSearchHits(ranked)) {
    final group = searchGroupForType(hit.type);
    if (group == null) continue;
    buckets.putIfAbsent(group, () => []).add(hit);
  }
  return [
    for (final group in SearchResultGroup.values)
      if ((buckets[group] ?? const []).isNotEmpty)
        SearchResultSection(group: group, hits: buckets[group]!),
  ];
}

List<SearchHit> mergeSearchHits(
  List<SearchHit> existing,
  List<SearchHit> incoming,
) {
  final seen = {for (final hit in existing) hit.identity};
  final next = [...existing];
  for (final hit in incoming) {
    if (seen.add(hit.identity)) {
      next.add(hit);
    }
  }
  return next;
}

String searchResultSummary({
  required String query,
  required int loadedCount,
  required bool hasMore,
}) {
  final quoted = '“$query”';
  final countLabel = loadedCount == 1
      ? '1 result for $quoted'
      : '$loadedCount results for $quoted';
  if (!hasMore) return countLabel;
  return '$countLabel. More results are available.';
}
