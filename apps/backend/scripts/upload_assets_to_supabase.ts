import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

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
const ASSETS_DIR = path.resolve(
  __dirname,
  "../../../apps/mobile/assets/images",
);

async function uploadDirectory(directoryPath: string, parentPath: string = "") {
  const files = fs.readdirSync(directoryPath);

  for (const file of files) {
    const fullPath = path.join(directoryPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await uploadDirectory(fullPath, path.join(parentPath, file));
    } else if (stat.isFile() && !file.startsWith(".")) {
      // It's a valid file, let's upload
      const destination = `event-images/${parentPath}/${file}`.replace(
        /\/+/g,
        "/",
      );
      console.log(
        `Uploading ${fullPath} to Supabase bucket ${BUCKET_NAME}/${destination}`,
      );

      try {
        const fileBuffer = fs.readFileSync(fullPath);

        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(destination, fileBuffer, {
            upsert: true, // Overwrite if exists
            cacheControl: "31536000",
          });

        if (error) {
          console.error(`Failed to upload ${file}:`, error.message);
        } else {
          console.log(`Successfully uploaded ${file}`);
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  }
}

async function runMigration() {
  console.log("Starting Asset Upload to Supabase Storage...");
  console.log(`Scanning local assets directory: ${ASSETS_DIR}`);

  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(
      "Assets directory not found. Please run the local scaffold script first.",
    );
    process.exit(1);
  }

  try {
    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
      console.log(`Creating bucket ${BUCKET_NAME}...`);
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }

    await uploadDirectory(ASSETS_DIR);
    console.log("Upload process complete!");
    console.log(
      "NOTE: Your application is currently running in Development Mode (using local assets).",
    );
    console.log(
      "To switch to Production Mode, update your data seeds to point to the Supabase Storage URLs.",
    );
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

runMigration().catch(console.error);
