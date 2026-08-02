const fs = require("fs");
const files = [
  "apps/mobile/lib/features/customer/screens/event_detail_screen.dart",
  "apps/mobile/lib/features/customer/screens/explore_tab.dart",
  "apps/mobile/lib/features/customer/screens/plan_tab.dart",
  "apps/mobile/lib/features/customer/screens/ticket_screen.dart",
  "apps/mobile/lib/features/customer/screens/category_detail_screen.dart",
  "apps/mobile/lib/features/customer/widgets/home/trending_services.dart",
  "apps/mobile/lib/features/customer/widgets/home/recommended_vendors.dart",
];

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(
    /import 'package:cached_network_image\/cached_network_image\.dart';/g,
    "import 'package:mee_events/core/widgets/image/safe_network_image.dart';",
  );
  content = content.replace(/CachedNetworkImage\(/g, "SafeNetworkImage(");
  fs.writeFileSync(file, content, "utf8");
}
console.log("Replacements done.");
