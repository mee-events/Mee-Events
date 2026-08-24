class InventoryDashboardSnapshot {
  final int totalItems;
  final int availableItems;
  final int reservedItems;
  final int onSiteItems;
  final int openAllocations;
  final List<InventoryAllocationItem> allocations;
  final List<InventoryMovementItem> recentMovements;

  const InventoryDashboardSnapshot({
    required this.totalItems,
    required this.availableItems,
    required this.reservedItems,
    required this.onSiteItems,
    required this.openAllocations,
    required this.allocations,
    required this.recentMovements,
  });

  factory InventoryDashboardSnapshot.fromJson(Map<String, dynamic> json) {
    return InventoryDashboardSnapshot(
      totalItems: json['totalItems'] as int? ?? 0,
      availableItems: json['availableItems'] as int? ?? 0,
      reservedItems: json['reservedItems'] as int? ?? 0,
      onSiteItems: json['onSiteItems'] as int? ?? 0,
      openAllocations: json['openAllocations'] as int? ?? 0,
      allocations: ((json['allocations'] as List<dynamic>?) ?? [])
          .map(
            (item) =>
                InventoryAllocationItem.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      recentMovements: ((json['recentMovements'] as List<dynamic>?) ?? [])
          .map(
            (item) =>
                InventoryMovementItem.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}

class InventoryAllocationItem {
  final String id;
  final String eventRecordId;
  final String itemId;
  final String status;
  final int quantity;
  final String? eventNumber;
  final String? eventName;
  final String? itemName;
  final String? inventoryCode;

  const InventoryAllocationItem({
    required this.id,
    required this.eventRecordId,
    required this.itemId,
    required this.status,
    required this.quantity,
    this.eventNumber,
    this.eventName,
    this.itemName,
    this.inventoryCode,
  });

  factory InventoryAllocationItem.fromJson(Map<String, dynamic> json) {
    return InventoryAllocationItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      itemId: json['itemId'] as String,
      status: json['status'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 1,
      eventNumber: json['eventNumber'] as String?,
      eventName: json['eventName'] as String?,
      itemName: json['itemName'] as String?,
      inventoryCode: json['inventoryCode'] as String?,
    );
  }
}

class InventoryAllocationDetail extends InventoryAllocationItem {
  final List<InventoryTimelineItem> movements;
  final List<InventoryTimelineItem> timeline;

  const InventoryAllocationDetail({
    required super.id,
    required super.eventRecordId,
    required super.itemId,
    required super.status,
    required super.quantity,
    super.eventNumber,
    super.eventName,
    super.itemName,
    super.inventoryCode,
    required this.movements,
    required this.timeline,
  });

  factory InventoryAllocationDetail.fromJson(Map<String, dynamic> json) {
    final base = InventoryAllocationItem.fromJson(json);
    return InventoryAllocationDetail(
      id: base.id,
      eventRecordId: base.eventRecordId,
      itemId: base.itemId,
      status: base.status,
      quantity: base.quantity,
      eventNumber: base.eventNumber,
      eventName: base.eventName,
      itemName: base.itemName,
      inventoryCode: base.inventoryCode,
      movements: ((json['movements'] as List<dynamic>?) ?? [])
          .map(
            (item) => InventoryTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['movementType'] as String? ?? '',
              content: '${item['fromPlace'] ?? ''} → ${item['toPlace'] ?? ''}',
            ),
          )
          .toList(),
      timeline: ((json['timeline'] as List<dynamic>?) ?? [])
          .map(
            (item) => InventoryTimelineItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              title: item['title'] as String? ?? '',
              content: item['content'] as String? ?? '',
            ),
          )
          .toList(),
    );
  }
}

class InventoryMovementItem {
  final String id;
  final String itemId;
  final String movementType;
  final String? itemName;
  final String? fromPlace;
  final String? toPlace;
  final String occurredAt;

  const InventoryMovementItem({
    required this.id,
    required this.itemId,
    required this.movementType,
    required this.occurredAt,
    this.itemName,
    this.fromPlace,
    this.toPlace,
  });

  factory InventoryMovementItem.fromJson(Map<String, dynamic> json) {
    return InventoryMovementItem(
      id: json['id'] as String,
      itemId: json['itemId'] as String,
      movementType: json['movementType'] as String? ?? '',
      occurredAt: json['occurredAt'] as String? ?? '',
      itemName: json['itemName'] as String?,
      fromPlace: json['fromPlace'] as String?,
      toPlace: json['toPlace'] as String?,
    );
  }
}

class InventoryTimelineItem {
  final String id;
  final String title;
  final String content;

  const InventoryTimelineItem({
    required this.id,
    required this.title,
    required this.content,
  });
}
