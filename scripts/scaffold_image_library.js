const fs = require("fs");
const path = require("path");
const https = require("https");
const child_process = require("child_process");

const BASE_DIR = "apps/mobile/assets/images";

// Create directories
const dirs = [
  `${BASE_DIR}/home/banners`,
  `${BASE_DIR}/home/trending`,
  `${BASE_DIR}/categories`,
  `${BASE_DIR}/vendors`,
];

for (const dir of dirs) {
  fs.mkdirSync(dir, { recursive: true });
}

function downloadImage(category, subcategory, filename, urlId) {
  let dir = BASE_DIR;
  if (category !== "NONE") {
    if (subcategory !== "NONE") {
      dir = `${BASE_DIR}/subcategory/${category}/${subcategory}`;
    } else {
      dir = `${BASE_DIR}/categories/${category}`;
    }
  }

  fs.mkdirSync(dir, { recursive: true });
  const filepath = path.join(dir, filename);
  console.log(`Downloading to ${filepath}...`);
  const url = `https://images.unsplash.com/photo-${urlId}?w=800&fm=jpg&fit=crop`;
  child_process.execSync(`curl -sL "${url}" -o "${filepath}"`);
}

// 1. Banners
downloadImage(
  "NONE",
  "NONE",
  "home/banners/wedding_package.jpg",
  "1519225421980-715cb0215aed",
);
downloadImage(
  "NONE",
  "NONE",
  "home/banners/corporate_gala.jpg",
  "1505373877841-8d25f7d46678",
);
downloadImage(
  "NONE",
  "NONE",
  "home/banners/concert.jpg",
  "1475721025566-55cbcb692850",
);

// 2. Categories
downloadImage(
  "NONE",
  "NONE",
  "categories/engagement.jpg",
  "1515934751635-c81c6bc9a2d8",
);
downloadImage(
  "NONE",
  "NONE",
  "categories/pre_wedding.jpg",
  "1522771739844-6a9f6d5f14af",
);
downloadImage(
  "NONE",
  "NONE",
  "categories/mehndi.jpg",
  "1605330368307-e4be68bc2973",
);
downloadImage(
  "NONE",
  "NONE",
  "categories/sangeet.jpg",
  "1541532713592-79a0317b6b27",
);
downloadImage(
  "NONE",
  "NONE",
  "categories/wedding.jpg",
  "1519225421980-715cb0215aed",
);
downloadImage(
  "NONE",
  "NONE",
  "categories/corporate.jpg",
  "1505373877841-8d25f7d46678",
);

// 3. Subcategories
const URLs = {
  house_decoration: "1464366400600-7168b8af9bc3",
  wedding_gifts: "1549465220-1a8b9238cd48",
  flower_garlands: "1610471242371-1d37446e6b52",
  mehndi_makeup: "1588722955050-058df5e80d46",
  grand_entry: "1528605248644-14dd04022da1",
  special_effects: "1511578314322-379afb476865",
  entertainment: "1470229722913-7c090be5bc65",
  dj_lighting: "1475721025566-55cbcb692850",
  catering: "1555244162-803834f70033",
  stage_decoration: "1501281668745-f7f57925c3b4",
  photography: "1511285560929-80b456fea0bc",
  haldi: "1583089892943-e02e52ea11a5",
  mangalasnanam: "1604928123281-9b6910793b5a",
  backdrops: "1514362545857-3bc16c4c7d1b",
  puja_items: "1519689680058-324335c77eba",
  bachelor_party: "1530103862676-de8892bf309c",
  band_bharat: "1530047629864-77e8a939da58",
  tent_house: "1520854221256-17451cc331bf",
  wedding_concepts: "1581091226825-a6a2a5aee158",
  mandapam: "1627914436573-c6b653762dd3",
};

const map = {
  engagement: [
    "house_decoration",
    "wedding_gifts",
    "flower_garlands",
    "mehndi_makeup",
    "grand_entry",
    "special_effects",
    "entertainment",
    "dj_lighting",
    "catering",
    "stage_decoration",
    "photography",
  ],
  pre_wedding: [
    "house_decoration",
    "haldi",
    "mangalasnanam",
    "backdrops",
    "wedding_gifts",
    "puja_items",
    "flower_garlands",
    "mehndi_makeup",
    "photography",
    "bachelor_party",
  ],
  mehndi: [
    "mehndi_makeup",
    "backdrops",
    "special_effects",
    "entertainment",
    "dj_lighting",
    "catering",
    "photography",
    "tent_house",
  ],
  sangeet: [
    "grand_entry",
    "special_effects",
    "entertainment",
    "dj_lighting",
    "band_bharat",
    "stage_decoration",
    "catering",
    "photography",
    "mehndi_makeup",
    "flower_garlands",
    "tent_house",
  ],
  wedding: [
    "grand_entry",
    "special_effects",
    "entertainment",
    "wedding_concepts",
    "dj_lighting",
    "band_bharat",
    "catering",
    "mandapam",
    "photography",
    "wedding_gifts",
    "mehndi_makeup",
    "flower_garlands",
    "puja_items",
  ],
};

for (const [category, subs] of Object.entries(map)) {
  for (const sub of subs) {
    downloadImage(category, sub, `${sub}.jpg`, URLs[sub]);
  }
}

// 4. Vendors
downloadImage(
  "NONE",
  "NONE",
  "vendors/royal_decorators.jpg",
  "1520854221256-17451cc331bf",
);
downloadImage(
  "NONE",
  "NONE",
  "vendors/elite_catering.jpg",
  "1555244162-803834f70033",
);
downloadImage(
  "NONE",
  "NONE",
  "vendors/capture_moments.jpg",
  "1511285560929-80b456fea0bc",
);
downloadImage(
  "NONE",
  "NONE",
  "vendors/vendor_user_1.jpg",
  "1494790108377-be9c29b29330",
); // For reviews
downloadImage(
  "NONE",
  "NONE",
  "vendors/vendor_user_2.jpg",
  "1500648767791-00dcc994a43e",
); // For reviews

// 5. Trending
downloadImage(
  "NONE",
  "NONE",
  "home/trending/premium_mandap.jpg",
  "1627914436573-c6b653762dd3",
);
downloadImage(
  "NONE",
  "NONE",
  "home/trending/corporate_stage.jpg",
  "1511578314322-379afb476865",
);

console.log("Done scaffolding image library!");
