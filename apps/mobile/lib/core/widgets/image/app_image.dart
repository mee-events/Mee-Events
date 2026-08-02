import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class AppImage extends StatelessWidget {
  final String imageUrl;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Widget? fallbackWidget;
  final Alignment alignment;
  final Color? color;
  final BlendMode? colorBlendMode;
  final PlaceholderWidgetBuilder? placeholder;
  final LoadingErrorWidgetBuilder? errorWidget;

  const AppImage({
    Key? key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.fallbackWidget,
    this.alignment = Alignment.center,
    this.color,
    this.colorBlendMode,
    this.placeholder,
    this.errorWidget,
  }) : super(key: key);

  bool _isValidUrl(String url) {
    if (url.isEmpty) return false;
    if (url.startsWith('http://') || url.startsWith('https://')) return true;
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final effectiveFallback = fallbackWidget ??
        Container(
          width: width,
          height: height,
          color: Colors.grey[200],
          child: const Center(
            child: Icon(
              Icons.image_not_supported_outlined,
              color: Colors.grey,
              size: 24,
            ),
          ),
        );

    // DEVELOPMENT MODE: Serve directly from assets
    if (imageUrl.startsWith('assets/')) {
      return Image.asset(
        imageUrl,
        fit: fit,
        width: width,
        height: height,
        alignment: alignment,
        color: color,
        colorBlendMode: colorBlendMode,
        errorBuilder: (context, error, stackTrace) {
          debugPrint('AppImage Asset Error loading $imageUrl: $error');
          return effectiveFallback;
        },
      );
    }

    if (!_isValidUrl(imageUrl)) {
      return effectiveFallback;
    }

    // PRODUCTION MODE: Serve with caching
    return CachedNetworkImage(
      imageUrl: imageUrl,
      fit: fit,
      width: width,
      height: height,
      alignment: alignment,
      color: color,
      colorBlendMode: colorBlendMode,
      memCacheWidth: width != null ? (width! * 2).toInt() : null, // Good for memory
      placeholder: placeholder ?? (context, url) => Container(
        width: width,
        height: height,
        color: Colors.grey[100],
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      ),
      errorWidget: errorWidget ?? (context, url, error) {
        debugPrint('AppImage Network Error loading $url: $error');
        return effectiveFallback;
      },
    );
  }
}

