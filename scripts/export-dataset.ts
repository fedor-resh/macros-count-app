import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// The service role key bypasses RLS and can read all rows.
// Get it from: Supabase Dashboard → Project Settings → API → service_role
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL in .env");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY in .env\n" +
      "Get it from: Supabase Dashboard → Project Settings → API → service_role key"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const OUTPUT_DIR = path.resolve(process.cwd(), "scripts", "output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "dataset.csv");

async function main() {
  console.log("Fetching eaten_products from Supabase...");

  const { data, error } = await supabase
    .from("eaten_products")
    .select("id, imageUrl, kcalories")
    .not("imageUrl", "is", null);

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No rows found with imageUrl.");
    return;
  }

  console.log(`Found ${data.length} rows with images.`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const header = "id,imageUrl,kcalories\n";
  const rows = data
    .map((row) => {
      const imageUrl = `"${(row.imageUrl ?? "").replace(/"/g, '""')}"`;
      return `${row.id},${imageUrl},${row.kcalories ?? ""}`;
    })
    .join("\n");

  fs.writeFileSync(OUTPUT_FILE, header + rows + "\n", "utf-8");
  console.log(`Dataset written to: ${OUTPUT_FILE}`);
}

main();
