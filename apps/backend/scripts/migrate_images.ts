import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = "mee-events-assets";

const isValidImageURL = async (url: string) => {
  if (!url || url.includes("pinterest.com")) return false;

  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.status !== 200) return false;

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) return false;

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) === 0) return false;

    return true;
  } catch (error) {
    console.error(`Error validating URL: ${url}`, error);
    return false;
  }
};

const getFallbackUnsplashURL = (category: string) => {
  const keyword = encodeURIComponent(category.toLowerCase());
  return `https://loremflickr.com/800/600/${keyword},event,wedding/all`;
};

const uploadImageToStorage = async (
  url: string,
  storagePath: string,
): Promise<string> => {
  try {
    console.log(`Downloading image from ${url}...`);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";

    console.log(`Uploading to Supabase Storage: ${storagePath}...`);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Failed to upload image to ${storagePath}:`, error);
    throw error;
  }
};

async function processSubcategories() {
  const { data: subcategories, error } = await supabase
    .from("subcategories")
    .select("*");

  if (error) {
    console.error("Error fetching subcategories:", error);
    return;
  }

  for (const subcategory of subcategories) {
    const currentImageUrl = subcategory.image || "";

    // Check if it's already a valid Supabase Storage URL
    if (currentImageUrl.includes("supabase.co/storage")) {
      console.log(
        `Skipping valid Supabase Storage image for subcategory: ${subcategory.id}`,
      );
      continue;
    }

    let urlToProcess = currentImageUrl;
    const isValid = await isValidImageURL(urlToProcess);

    if (!isValid) {
      console.log(
        `Invalid image found for ${subcategory.id}. Replacing with fallback...`,
      );
      urlToProcess = getFallbackUnsplashURL(subcategory.name);
    }

    try {
      const extension = urlToProcess.split("?")[0].split(".").pop() || "jpg";
      const storagePath = `event-images/${subcategory.id}.${extension}`;

      const newStorageUrl = await uploadImageToStorage(
        urlToProcess,
        storagePath,
      );

      console.log(
        `Updating subcategory ${subcategory.id} with new URL: ${newStorageUrl}`,
      );
      await supabase
        .from("subcategories")
        .update({ image: newStorageUrl })
        .eq("id", subcategory.id);
    } catch (e) {
      console.error(`Failed to process subcategory ${subcategory.id}:`, e);
    }
  }
}

async function runMigration() {
  console.log("Starting Supabase image migration script...");
  try {
    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
      console.log(`Creating bucket ${BUCKET_NAME}...`);
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }

    await processSubcategories();
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

runMigration().catch(console.error);
