#!/bin/bash

BASE_DIR="apps/mobile/assets/images"

# Create directories
mkdir -p "$BASE_DIR/home/banners"
mkdir -p "$BASE_DIR/categories"
mkdir -p "$BASE_DIR/vendors"

# Helper function to download image
download_image() {
    local category=$1
    local subcategory=$2
    local filename=$3
    local url=$4
    
    local dir="$BASE_DIR"
    if [ "$category" != "NONE" ]; then
        if [ "$subcategory" != "NONE" ]; then
            dir="$BASE_DIR/subcategory/$category/$subcategory"
        else
            dir="$BASE_DIR/categories/$category"
        fi
    fi
    
    mkdir -p "$dir"
    
    local filepath="$dir/$filename"
    echo "Downloading to $filepath..."
    curl -sL "https://images.unsplash.com/photo-$url?w=800&fm=jpg&fit=crop" -o "$filepath"
}

# 1. Banners
download_image "NONE" "NONE" "home/banners/wedding_package.jpg" "1519225421980-715cb0215aed"
download_image "NONE" "NONE" "home/banners/corporate_gala.jpg" "1505373877841-8d25f7d46678"
download_image "NONE" "NONE" "home/banners/concert.jpg" "1475721025566-55cbcb692850"

# 2. Categories
download_image "NONE" "NONE" "categories/engagement.jpg" "1515934751635-c81c6bc9a2d8"
download_image "NONE" "NONE" "categories/pre_wedding.jpg" "1522771739844-6a9f6d5f14af"
download_image "NONE" "NONE" "categories/mehndi.jpg" "1605330368307-e4be68bc2973"
download_image "NONE" "NONE" "categories/sangeet.jpg" "1541532713592-79a0317b6b27"
download_image "NONE" "NONE" "categories/wedding.jpg" "1519225421980-715cb0215aed"
download_image "NONE" "NONE" "categories/corporate.jpg" "1505373877841-8d25f7d46678"

# 3. Subcategories (using a set of premium URLs for common services)

declare -A URLs=(
    ["house_decoration"]="1464366400600-7168b8af9bc3"
    ["wedding_gifts"]="1549465220-1a8b9238cd48"
    ["flower_garlands"]="1610471242371-1d37446e6b52"
    ["mehndi_makeup"]="1588722955050-058df5e80d46"
    ["grand_entry"]="1528605248644-14dd04022da1"
    ["special_effects"]="1511578314322-379afb476865"
    ["entertainment"]="1470229722913-7c090be5bc65"
    ["dj_lighting"]="1475721025566-55cbcb692850"
    ["catering"]="1555244162-803834f70033"
    ["stage_decoration"]="1501281668745-f7f57925c3b4"
    ["photography"]="1511285560929-80b456fea0bc"
    ["haldi"]="1583089892943-e02e52ea11a5"
    ["mangalasnanam"]="1604928123281-9b6910793b5a"
    ["backdrops"]="1514362545857-3bc16c4c7d1b"
    ["puja_items"]="1519689680058-324335c77eba"
    ["bachelor_party"]="1530103862676-de8892bf309c"
    ["band_bharat"]="1530047629864-77e8a939da58"
    ["tent_house"]="1520854221256-17451cc331bf"
    ["wedding_concepts"]="1581091226825-a6a2a5aee158"
    ["mandapam"]="1627914436573-c6b653762dd3"
)

# Engagement
for sub in house_decoration wedding_gifts flower_garlands mehndi_makeup grand_entry special_effects entertainment dj_lighting catering stage_decoration photography; do
    download_image "engagement" "$sub" "${sub}.jpg" "${URLs[$sub]}"
done

# Pre-Wedding
for sub in house_decoration haldi mangalasnanam backdrops wedding_gifts puja_items flower_garlands mehndi_makeup photography bachelor_party; do
    download_image "pre_wedding" "$sub" "${sub}.jpg" "${URLs[$sub]}"
done

# Mehndi
for sub in mehndi_makeup backdrops special_effects entertainment dj_lighting catering photography tent_house; do
    download_image "mehndi" "$sub" "${sub}.jpg" "${URLs[$sub]}"
done

# Sangeet
for sub in grand_entry special_effects entertainment dj_lighting band_bharat stage_decoration catering photography mehndi_makeup flower_garlands tent_house; do
    download_image "sangeet" "$sub" "${sub}.jpg" "${URLs[$sub]}"
done

# Wedding
for sub in grand_entry special_effects entertainment wedding_concepts dj_lighting band_bharat catering mandapam photography wedding_gifts mehndi_makeup flower_garlands puja_items; do
    download_image "wedding" "$sub" "${sub}.jpg" "${URLs[$sub]}"
done

# 4. Vendors (fallback images)
download_image "NONE" "NONE" "vendors/royal_decorators.jpg" "1520854221256-17451cc331bf"
download_image "NONE" "NONE" "vendors/elite_catering.jpg" "1555244162-803834f70033"
download_image "NONE" "NONE" "vendors/capture_moments.jpg" "1511285560929-80b456fea0bc"

# 5. Trending Services
download_image "NONE" "NONE" "home/trending/premium_mandap.jpg" "1627914436573-c6b653762dd3"
download_image "NONE" "NONE" "home/trending/corporate_stage.jpg" "1511578314322-379afb476865"

echo "Done scaffolding image library!"
