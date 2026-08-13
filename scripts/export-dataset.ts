import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const OUTPUT_DIR = path.resolve(process.cwd(), "scripts", "output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "dataset.csv");

const SQL = `COPY (
  SELECT id, "imageUrl", kcalories
  FROM eaten_products
  WHERE "imageUrl" IS NOT NULL
) TO STDOUT WITH CSV HEADER`;

function dumpCsv(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      return execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-c", SQL], {
        encoding: "utf-8",
      });
    } catch {
      // psql may be missing locally — fall through to compose.
    }
  }
  return execFileSync(
    "docker",
    ["compose", "exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", SQL],
    { encoding: "utf-8" },
  );
}

function main() {
  console.log("Fetching eaten_products from Postgres...");
  const csv = dumpCsv();
  const lines = csv.trimEnd();
  if (!lines || lines.split("\n").length <= 1) {
    console.log("No rows found with imageUrl.");
    return;
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${lines}\n`, "utf-8");
  console.log(`Dataset written to: ${OUTPUT_FILE}`);
}

main();
