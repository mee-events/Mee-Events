import 'package:flutter/material.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';

/// Ordered, deduplicated product media: cover first, then API gallery.
List<String> productGalleryUrls(CatalogProduct product) {
  final seen = <String>{};
  final urls = <String>[];
  void add(String? raw) {
    final url = CatalogImageResolver.resolvedServiceImage(coverImageUrl: raw);
    if (url == null) return;
    if (seen.add(url)) urls.add(url);
  }

  add(product.coverImageUrl);
  for (final item in product.gallery) {
    add(item);
  }
  return urls;
}

class ProductGallery extends StatefulWidget {
  const ProductGallery({
    super.key,
    required this.urls,
    required this.productName,
  });

  final List<String> urls;
  final String productName;

  @override
  State<ProductGallery> createState() => _ProductGalleryState();
}

class _ProductGalleryState extends State<ProductGallery> {
  late final PageController _controller;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController();
  }

  @override
  void didUpdateWidget(covariant ProductGallery oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.urls.length != oldWidget.urls.length && widget.urls.isNotEmpty) {
      final last = widget.urls.length - 1;
      if (_index > last) {
        _index = last;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted || !_controller.hasClients) return;
          _controller.jumpToPage(_index);
        });
      }
    }
    if (widget.urls.isEmpty) {
      _index = 0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final urls = widget.urls;
    final visual = urls.isEmpty
        ? HomeCatalogVisual(
            label: widget.productName,
            borderRadius: BorderRadius.zero,
          )
        : urls.length == 1
        ? HomeCatalogVisual(
            imageUrl: urls.first,
            label: widget.productName,
            borderRadius: BorderRadius.zero,
          )
        : PageView.builder(
            controller: _controller,
            itemCount: urls.length,
            onPageChanged: (value) {
              if (!mounted) return;
              setState(() => _index = value);
            },
            itemBuilder: (context, index) {
              return HomeCatalogVisual(
                imageUrl: urls[index],
                label: widget.productName,
                borderRadius: BorderRadius.zero,
              );
            },
          );

    final count = urls.isEmpty ? 1 : urls.length;
    final page = urls.isEmpty ? 1 : _index + 1;

    return Semantics(
      label: 'Image $page of $count',
      image: true,
      excludeSemantics: true,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(color: AppColors.goldSoft, child: visual),
            if (urls.length > 1)
              Positioned(
                bottom: AppSpacing.sm,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < urls.length; i++)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: i == _index
                                ? AppColors.primary
                                : AppColors.surfaceCard.withValues(alpha: 0.7),
                          ),
                          child: const SizedBox(width: 6, height: 6),
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
