import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const OPEN_ROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!OPEN_ROUTER_KEY) {
	console.error("Missing OPENROUTER_API_KEY in .env");
	process.exit(1);
}

const INPUT_FILE = path.resolve(process.cwd(), "scripts", "output", "dataset-classified.csv");
const OUTPUT_FILE = path.resolve(process.cwd(), "scripts", "output", "dataset-predicted.csv");

const CONCURRENCY = 10;
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

const PREDICTION_PROMPT = `Look at this food image and estimate the calorie content per 100 grams of the visible food or product.

If this is a nutrition label photo — read the calories per 100g directly from the label if clearly visible.
If this is a product or packaging photo — estimate based on what the food appears to be.

Respond with ONLY a single integer number (calories per 100g). No units, no explanation, just the number.
If you cannot make any estimate, respond with -1.`;

interface CsvRow {
	id: string;
	imageUrl: string;
	kcalories: string;
	class: string;
	predicted_kcal?: string;
}

function parseCsv(content: string): CsvRow[] {
	const lines = content.trim().split("\n");
	if (lines.length < 2) return [];

	const rows: CsvRow[] = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// id,"imageUrl",kcalories,class[,predicted_kcal]
		const match = line.match(/^(\d+),"((?:[^"]|"")*)",([^,]*),([^,]*),?(.*)$/);
		if (!match) {
			console.warn(`Skipping unparseable line ${i + 1}: ${line}`);
			continue;
		}
		rows.push({
			id: match[1],
			imageUrl: match[2].replace(/""/g, '"'),
			kcalories: match[3],
			class: match[4],
			predicted_kcal: match[5] || undefined,
		});
	}
	return rows;
}

function serializeCsv(rows: CsvRow[]): string {
	const header = "id,imageUrl,kcalories,class,predicted_kcal\n";
	const lines = rows.map((row) => {
		const imageUrl = `"${row.imageUrl.replace(/"/g, '""')}"`;
		return `${row.id},${imageUrl},${row.kcalories},${row.class},${row.predicted_kcal ?? ""}`;
	});
	return header + lines.join("\n") + "\n";
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function predictCalories(imageUrl: string): Promise<number | null> {
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
								{ type: "text", text: PREDICTION_PROMPT },
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
			const raw = json.choices?.[0]?.message?.content?.trim();
			const num = Number.parseInt(raw ?? "", 10);

			if (!Number.isNaN(num)) return num;

			console.warn(`  Unexpected response: "${raw}"`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (attempt < MAX_RETRIES) {
				await sleep(RETRY_DELAY_MS * attempt);
			} else {
				console.error(`  FAILED after ${MAX_RETRIES} attempts: ${msg.slice(0, 120)}`);
			}
		}
	}
	return null;
}

async function main() {
	if (!fs.existsSync(INPUT_FILE)) {
		console.error(`Input file not found: ${INPUT_FILE}`);
		console.error("Run classify-images.ts first.");
		process.exit(1);
	}

	const inputContent = fs.readFileSync(INPUT_FILE, "utf-8");
	const rows = parseCsv(inputContent);

	if (rows.length === 0) {
		console.log("No rows found.");
		return;
	}

	// Resume: load already-predicted rows
	const alreadyPredicted = new Map<string, string>();
	if (fs.existsSync(OUTPUT_FILE)) {
		const existingContent = fs.readFileSync(OUTPUT_FILE, "utf-8");
		const existingRows = parseCsv(existingContent);
		for (const row of existingRows) {
			if (row.predicted_kcal && row.predicted_kcal !== "") {
				alreadyPredicted.set(row.id, row.predicted_kcal);
			}
		}
		console.log(`Resuming: ${alreadyPredicted.size} rows already predicted.`);
	}

	// Apply already-predicted values, reset the rest
	for (const row of rows) {
		if (alreadyPredicted.has(row.id)) {
			row.predicted_kcal = alreadyPredicted.get(row.id);
		} else {
			row.predicted_kcal = undefined;
		}
	}

	// Skip error rows (broken image URLs) and already predicted ones
	const toPredict = rows.filter((r) => !r.predicted_kcal && r.class !== "error");
	console.log(`Total rows: ${rows.length}, to predict: ${toPredict.length}, concurrency: ${CONCURRENCY}\n`);

	let done = 0;
	let succeeded = 0;
	let failed = 0;
	const total = toPredict.length;

	async function processRow(row: CsvRow): Promise<void> {
		const result = await predictCalories(row.imageUrl);
		row.predicted_kcal = result !== null ? String(result) : "error";

		done++;
		if (result !== null) {
			succeeded++;
			console.log(`[${done}/${total}] id=${row.id} class=${row.class} → ${result} kcal/100g`);
		} else {
			failed++;
			console.log(`[${done}/${total}] id=${row.id} → FAILED`);
		}

		fs.writeFileSync(OUTPUT_FILE, serializeCsv(rows), "utf-8");
	}

	for (let i = 0; i < toPredict.length; i += CONCURRENCY) {
		const batch = toPredict.slice(i, i + CONCURRENCY);
		await Promise.all(batch.map(processRow));
	}

	console.log(`\nDone. Predicted: ${succeeded}, failed: ${failed}`);
	console.log(`Output: ${OUTPUT_FILE}`);
}

main();
