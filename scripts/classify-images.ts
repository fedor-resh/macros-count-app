import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const OPEN_ROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!OPEN_ROUTER_KEY) {
	console.error("Missing OPENROUTER_API_KEY in .env");
	process.exit(1);
}

const INPUT_FILE = path.resolve(process.cwd(), "scripts", "output", "dataset.csv");
const OUTPUT_FILE = path.resolve(process.cwd(), "scripts", "output", "dataset-classified.csv");

const CONCURRENCY = 10;
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

type ImageClass = "nutrition_label" | "label" | "product" | "non_edible";

const VALID_CLASSES: ImageClass[] = ["nutrition_label", "label", "product", "non_edible"];

const CLASSIFICATION_PROMPT = `Look at this image and classify it into exactly one of these categories:
- nutrition_label: a photo of a food product label that clearly shows nutritional/calorie information (nutrition facts table)
- label: a photo of a product label or packaging WITHOUT visible nutritional information
- product: a photo of the food product itself (not a label)
- non_edible: a photo that does not contain food or food packaging at all (e.g. person, place, object, screenshot, etc.)

Respond with ONLY the category name, nothing else. Must be one of: nutrition_label, label, product, non_edible`;

interface CsvRow {
	id: string;
	imageUrl: string;
	kcalories: string;
	class?: string;
}

function parseCsv(content: string): CsvRow[] {
	const lines = content.trim().split("\n");
	if (lines.length < 2) return [];

	const rows: CsvRow[] = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Parse: id,"imageUrl",kcalories[,class]
		const match = line.match(/^(\d+),"((?:[^"]|"")*)",([^,]*),?(.*)$/);
		if (!match) {
			console.warn(`Skipping unparseable line ${i + 1}: ${line}`);
			continue;
		}
		rows.push({
			id: match[1],
			imageUrl: match[2].replace(/""/g, '"'),
			kcalories: match[3],
			class: match[4] || undefined,
		});
	}
	return rows;
}

function serializeCsv(rows: CsvRow[]): string {
	const header = "id,imageUrl,kcalories,class\n";
	const lines = rows.map((row) => {
		const imageUrl = `"${row.imageUrl.replace(/"/g, '""')}"`;
		return `${row.id},${imageUrl},${row.kcalories},${row.class ?? ""}`;
	});
	return header + lines.join("\n") + "\n";
}

async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function classifyImage(imageUrl: string): Promise<ImageClass | null> {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${OPEN_ROUTER_KEY}`,
				},
				body: JSON.stringify({
					model: "google/gemini-2.0-flash-001",
					messages: [
						{
							role: "user",
							content: [
								{ type: "text", text: CLASSIFICATION_PROMPT },
								{ type: "image_url", image_url: { url: imageUrl } },
							],
						},
					],
				}),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`HTTP ${response.status}: ${text}`);
			}

			const json = (await response.json()) as {
				choices: Array<{ message: { content: string } }>;
			};
			const raw = json.choices?.[0]?.message?.content?.trim().toLowerCase();

			if (raw && VALID_CLASSES.includes(raw as ImageClass)) {
				return raw as ImageClass;
			}

			// Try to extract if model returned extra text
			if (raw?.includes("nutrition_label")) return "nutrition_label";
			if (raw?.includes("non_edible")) return "non_edible";
			if (raw?.includes("label")) return "label";
			if (raw?.includes("product")) return "product";

			console.warn(`  [id unknown] Unexpected model response: "${raw}", retrying...`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (attempt < MAX_RETRIES) {
				await delay(RETRY_DELAY_MS * attempt);
			} else {
				// Only log on final failure to avoid noise
				console.error(`  FAILED after ${MAX_RETRIES} attempts: ${msg.slice(0, 120)}`);
			}
		}
	}
	return null;
}

async function main() {
	if (!fs.existsSync(INPUT_FILE)) {
		console.error(`Input file not found: ${INPUT_FILE}`);
		console.error("Run export-dataset.ts first.");
		process.exit(1);
	}

	const inputContent = fs.readFileSync(INPUT_FILE, "utf-8");
	const rows = parseCsv(inputContent);

	if (rows.length === 0) {
		console.log("No rows to classify.");
		return;
	}

	// Load already-classified rows to support resuming.
	// Only keep rows with a currently valid class — stale or error rows are re-classified.
	const alreadyClassified = new Map<string, string>();
	if (fs.existsSync(OUTPUT_FILE)) {
		const existingContent = fs.readFileSync(OUTPUT_FILE, "utf-8");
		const existingRows = parseCsv(existingContent);
		for (const row of existingRows) {
			if (row.class && VALID_CLASSES.includes(row.class as ImageClass)) {
				alreadyClassified.set(row.id, row.class);
			}
		}
		console.log(`Resuming: ${alreadyClassified.size} rows with valid class kept.`);
	}

	// Apply already-classified results
	for (const row of rows) {
		if (alreadyClassified.has(row.id)) {
			row.class = alreadyClassified.get(row.id);
		} else {
			row.class = undefined;
		}
	}

	const toClassify = rows.filter((r) => !r.class);
	console.log(`Total rows: ${rows.length}, to classify: ${toClassify.length}, concurrency: ${CONCURRENCY}\n`);

	let done = 0;
	let classified = 0;
	let failed = 0;
	const total = toClassify.length;

	// Run with a concurrency pool
	async function processRow(row: CsvRow): Promise<void> {
		const result = await classifyImage(row.imageUrl);
		row.class = result ?? "error";

		done++;
		if (result) {
			classified++;
			console.log(`[${done}/${total}] id=${row.id} → ${result}`);
		} else {
			failed++;
			console.log(`[${done}/${total}] id=${row.id} → FAILED`);
		}

		// Save progress after each completion (safe: Node.js is single-threaded)
		fs.writeFileSync(OUTPUT_FILE, serializeCsv(rows), "utf-8");
	}

	// Process in chunks of CONCURRENCY
	for (let i = 0; i < toClassify.length; i += CONCURRENCY) {
		const batch = toClassify.slice(i, i + CONCURRENCY);
		await Promise.all(batch.map(processRow));
	}

	console.log(`\nDone. Classified: ${classified}, failed: ${failed}`);
	console.log(`Output: ${OUTPUT_FILE}`);
}

main();
