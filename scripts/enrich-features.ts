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
const OUTPUT_FILE = path.resolve(process.cwd(), "scripts", "output", "dataset-enriched.csv");

const CONCURRENCY = 10;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

type SourceClass = "nutrition_label" | "label" | "product" | "non_edible" | "error";
type Confidence = "low" | "medium" | "high";
type CalorieBasis = "nutrition_table" | "package_text" | "visual_estimate" | "mixed";
type TextReadability = "none" | "low" | "medium" | "high";
type Difficulty = "low" | "medium" | "high";

type CsvRow = {
	id: string;
	imageUrl: string;
	kcalories: string;
	class: string;
	llm_food_name: string;
	llm_image_class: string;
	llm_calories: string;
	llm_protein: string;
	llm_fat: string;
	llm_carbs: string;
	llm_weight: string;
	llm_confidence: string;
	llm_calorie_basis: string;
	llm_text_readability: string;
	llm_portion_difficulty: string;
	llm_error_risk: string;
	llm_is_single_item: string;
	llm_is_mixed_dish: string;
	llm_error: string;
};

type EnrichmentResult = {
	food_name: string;
	image_class: Exclude<SourceClass, "error">;
	calories: number | null;
	protein: number | null;
	fat: number | null;
	carbs: number | null;
	weight: number | null;
	confidence: Confidence;
	calorie_basis: CalorieBasis;
	text_readability: TextReadability;
	portion_estimation_difficulty: Difficulty;
	error_risk: Difficulty;
	is_single_item: boolean;
	is_mixed_dish: boolean;
};

const HEADERS: Array<keyof CsvRow> = [
	"id",
	"imageUrl",
	"kcalories",
	"class",
	"llm_food_name",
	"llm_image_class",
	"llm_calories",
	"llm_protein",
	"llm_fat",
	"llm_carbs",
	"llm_weight",
	"llm_confidence",
	"llm_calorie_basis",
	"llm_text_readability",
	"llm_portion_difficulty",
	"llm_error_risk",
	"llm_is_single_item",
	"llm_is_mixed_dish",
	"llm_error",
];

const SOURCE_CLASS_VALUES: SourceClass[] = [
	"nutrition_label",
	"label",
	"product",
	"non_edible",
	"error",
];

const IMAGE_CLASS_VALUES: Array<Exclude<SourceClass, "error">> = [
	"nutrition_label",
	"label",
	"product",
	"non_edible",
];

const CONFIDENCE_VALUES: Confidence[] = ["low", "medium", "high"];
const CALORIE_BASIS_VALUES: CalorieBasis[] = [
	"nutrition_table",
	"package_text",
	"visual_estimate",
	"mixed",
];
const TEXT_READABILITY_VALUES: TextReadability[] = ["none", "low", "medium", "high"];
const DIFFICULTY_VALUES: Difficulty[] = ["low", "medium", "high"];

const ENRICH_PROMPT = `You will analyze a food-related image. The image has already been pre-classified
as: {class} (one of: nutrition_label, label, product, non_edible).

Return ONLY valid JSON matching this schema (no prose, no markdown):

{
  "food_name": "short food name in Russian",
  "image_class": "nutrition_label | label | product | non_edible",
  "calories": number | null,
  "protein": number | null,
  "fat": number | null,
  "carbs": number | null,
  "weight": number | null,
  "confidence": "low" | "medium" | "high",
  "calorie_basis": "nutrition_table" | "package_text" | "visual_estimate" | "mixed",
  "text_readability": "none" | "low" | "medium" | "high",
  "portion_estimation_difficulty": "low" | "medium" | "high",
  "error_risk": "low" | "medium" | "high",
  "is_single_item": boolean,
  "is_mixed_dish": boolean
}

Rules:
- If image_class = nutrition_label, prefer reading calories/macros directly from the table.
- Use null (not 0) when a numeric value cannot be inferred.
- For non_edible: return only food_name="не еда", image_class="non_edible",
  confidence="low", error_risk="high", all other fields null/false.`;

function emptyLlmFields(row: Pick<CsvRow, "id" | "imageUrl" | "kcalories" | "class">): CsvRow {
	return {
		...row,
		llm_food_name: "",
		llm_image_class: "",
		llm_calories: "",
		llm_protein: "",
		llm_fat: "",
		llm_carbs: "",
		llm_weight: "",
		llm_confidence: "",
		llm_calorie_basis: "",
		llm_text_readability: "",
		llm_portion_difficulty: "",
		llm_error_risk: "",
		llm_is_single_item: "",
		llm_is_mixed_dish: "",
		llm_error: "",
	};
}

function parseCsv(content: string): Array<Record<string, string>> {
	const rows: Array<Record<string, string>> = [];
	let currentField = "";
	let currentRow: string[] = [];
	let inQuotes = false;

	const pushField = () => {
		currentRow.push(currentField);
		currentField = "";
	};

	const pushRow = () => {
		if (currentRow.length === 1 && currentRow[0] === "") {
			currentRow = [];
			return;
		}
		rows.push(
			headers.reduce<Record<string, string>>((acc, header, index) => {
				acc[header] = currentRow[index] ?? "";
				return acc;
			}, {}),
		);
		currentRow = [];
	};

	const normalized = content.replace(/\r\n/g, "\n");
	const newlineSentinel = `${normalized}\n`;
	let headers: string[] = [];

	for (let index = 0; index < newlineSentinel.length; index++) {
		const char = newlineSentinel[index];
		const next = newlineSentinel[index + 1];

		if (inQuotes) {
			if (char === '"' && next === '"') {
				currentField += '"';
				index++;
				continue;
			}
			if (char === '"') {
				inQuotes = false;
				continue;
			}
			currentField += char;
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			continue;
		}

		if (char === ",") {
			pushField();
			continue;
		}

		if (char === "\n") {
			pushField();
			if (headers.length === 0) {
				headers = currentRow;
				currentRow = [];
			} else {
				pushRow();
			}
			continue;
		}

		currentField += char;
	}

	return rows;
}

function serializeCsv(rows: CsvRow[]): string {
	const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
	const lines = rows.map((row) => HEADERS.map((header) => escapeCell(row[header] ?? "")).join(","));
	return `${HEADERS.join(",")}\n${lines.join("\n")}\n`;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isEnumValue<T extends string>(value: unknown, allowed: readonly T[]): value is T {
	return typeof value === "string" && allowed.includes(value as T);
}

function parseNullableNumber(value: unknown): number | null {
	if (value === null) return null;
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return value;
}

function parseBoolean(value: unknown): boolean | null {
	return typeof value === "boolean" ? value : null;
}

function validateEnrichmentResult(value: unknown): EnrichmentResult | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const candidate = value as Record<string, unknown>;
	if (typeof candidate.food_name !== "string" || candidate.food_name.trim() === "") {
		return null;
	}
	if (!isEnumValue(candidate.image_class, IMAGE_CLASS_VALUES)) {
		return null;
	}
	if (!isEnumValue(candidate.confidence, CONFIDENCE_VALUES)) {
		return null;
	}
	if (!isEnumValue(candidate.calorie_basis, CALORIE_BASIS_VALUES)) {
		return null;
	}
	if (!isEnumValue(candidate.text_readability, TEXT_READABILITY_VALUES)) {
		return null;
	}
	if (!isEnumValue(candidate.portion_estimation_difficulty, DIFFICULTY_VALUES)) {
		return null;
	}
	if (!isEnumValue(candidate.error_risk, DIFFICULTY_VALUES)) {
		return null;
	}

	const isSingleItem = parseBoolean(candidate.is_single_item);
	const isMixedDish = parseBoolean(candidate.is_mixed_dish);
	if (isSingleItem === null || isMixedDish === null) {
		return null;
	}

	const calories = parseNullableNumber(candidate.calories);
	const protein = parseNullableNumber(candidate.protein);
	const fat = parseNullableNumber(candidate.fat);
	const carbs = parseNullableNumber(candidate.carbs);
	const weight = parseNullableNumber(candidate.weight);

	if (candidate.calories !== null && calories === null) return null;
	if (candidate.protein !== null && protein === null) return null;
	if (candidate.fat !== null && fat === null) return null;
	if (candidate.carbs !== null && carbs === null) return null;
	if (candidate.weight !== null && weight === null) return null;

	return {
		food_name: candidate.food_name.trim(),
		image_class: candidate.image_class,
		calories,
		protein,
		fat,
		carbs,
		weight,
		confidence: candidate.confidence,
		calorie_basis: candidate.calorie_basis,
		text_readability: candidate.text_readability,
		portion_estimation_difficulty: candidate.portion_estimation_difficulty,
		error_risk: candidate.error_risk,
		is_single_item: isSingleItem,
		is_mixed_dish: isMixedDish,
	};
}

function toCell(value: string | number | boolean | null): string {
	if (value === null) return "";
	if (typeof value === "boolean") return value ? "true" : "false";
	return String(value);
}

function applyResult(row: CsvRow, result: EnrichmentResult): void {
	row.llm_food_name = result.food_name;
	row.llm_image_class = result.image_class;
	row.llm_calories = toCell(result.calories);
	row.llm_protein = toCell(result.protein);
	row.llm_fat = toCell(result.fat);
	row.llm_carbs = toCell(result.carbs);
	row.llm_weight = toCell(result.weight);
	row.llm_confidence = result.confidence;
	row.llm_calorie_basis = result.calorie_basis;
	row.llm_text_readability = result.text_readability;
	row.llm_portion_difficulty = result.portion_estimation_difficulty;
	row.llm_error_risk = result.error_risk;
	row.llm_is_single_item = toCell(result.is_single_item);
	row.llm_is_mixed_dish = toCell(result.is_mixed_dish);
	row.llm_error = "";
}

function isProcessed(row: CsvRow): boolean {
	if (row.class === "non_edible" || row.class === "error") {
		return true;
	}

	if (row.llm_error !== "") {
		return false;
	}

	const candidate = validateEnrichmentResult({
		food_name: row.llm_food_name,
		image_class: row.llm_image_class,
		calories: row.llm_calories === "" ? null : Number(row.llm_calories),
		protein: row.llm_protein === "" ? null : Number(row.llm_protein),
		fat: row.llm_fat === "" ? null : Number(row.llm_fat),
		carbs: row.llm_carbs === "" ? null : Number(row.llm_carbs),
		weight: row.llm_weight === "" ? null : Number(row.llm_weight),
		confidence: row.llm_confidence,
		calorie_basis: row.llm_calorie_basis,
		text_readability: row.llm_text_readability,
		portion_estimation_difficulty: row.llm_portion_difficulty,
		error_risk: row.llm_error_risk,
		is_single_item: row.llm_is_single_item === "" ? null : row.llm_is_single_item === "true",
		is_mixed_dish: row.llm_is_mixed_dish === "" ? null : row.llm_is_mixed_dish === "true",
	});

	return candidate !== null;
}

function normalizeSourceRow(raw: Record<string, string>): CsvRow | null {
	const sourceClass = raw.class?.trim() ?? "";
	if (
		typeof raw.id !== "string" ||
		typeof raw.imageUrl !== "string" ||
		typeof raw.kcalories !== "string" ||
		!isEnumValue(sourceClass, SOURCE_CLASS_VALUES)
	) {
		return null;
	}

	return emptyLlmFields({
		id: raw.id,
		imageUrl: raw.imageUrl,
		kcalories: raw.kcalories,
		class: sourceClass,
	});
}

function mergeExistingRows(
	baseRows: CsvRow[],
	existingRows: Array<Record<string, string>>,
): number {
	const existingById = new Map<string, CsvRow>();
	for (const raw of existingRows) {
		const merged = {
			id: raw.id ?? "",
			imageUrl: raw.imageUrl ?? "",
			kcalories: raw.kcalories ?? "",
			class: raw.class ?? "",
			llm_food_name: raw.llm_food_name ?? "",
			llm_image_class: raw.llm_image_class ?? "",
			llm_calories: raw.llm_calories ?? "",
			llm_protein: raw.llm_protein ?? "",
			llm_fat: raw.llm_fat ?? "",
			llm_carbs: raw.llm_carbs ?? "",
			llm_weight: raw.llm_weight ?? "",
			llm_confidence: raw.llm_confidence ?? "",
			llm_calorie_basis: raw.llm_calorie_basis ?? "",
			llm_text_readability: raw.llm_text_readability ?? "",
			llm_portion_difficulty: raw.llm_portion_difficulty ?? "",
			llm_error_risk: raw.llm_error_risk ?? "",
			llm_is_single_item: raw.llm_is_single_item ?? "",
			llm_is_mixed_dish: raw.llm_is_mixed_dish ?? "",
			llm_error: raw.llm_error ?? "",
		} satisfies CsvRow;
		existingById.set(merged.id, merged);
	}

	let kept = 0;
	for (const row of baseRows) {
		const existing = existingById.get(row.id);
		if (!existing) continue;
		if (!isProcessed(existing)) continue;
		Object.assign(row, existing);
		kept++;
	}
	return kept;
}

function extractMessageContent(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}
	if (Array.isArray(content)) {
		return content
			.map((item) => {
				if (typeof item === "string") return item;
				if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
					return item.text;
				}
				return "";
			})
			.join("");
	}
	return "";
}

async function enrichImage(
	imageUrl: string,
	sourceClass: string,
): Promise<{ result?: EnrichmentResult; error?: "parse_error" | "http_error" }> {
	const prompt = ENRICH_PROMPT.replace("{class}", sourceClass);

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${OPEN_ROUTER_KEY}`,
				},
				body: JSON.stringify({
					model: "google/gemini-2.5-flash",
					response_format: { type: "json_object" },
					messages: [
						{
							role: "user",
							content: [
								{ type: "text", text: prompt },
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
				choices?: Array<{ message?: { content?: unknown } }>;
			};
			const rawContent = extractMessageContent(json.choices?.[0]?.message?.content).trim();
			if (!rawContent) {
				throw new Error("Empty model response");
			}

			let parsed: unknown;
			try {
				parsed = JSON.parse(rawContent);
			} catch {
				if (attempt < MAX_RETRIES) {
					await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
					continue;
				}
				return { error: "parse_error" };
			}

			const validated = validateEnrichmentResult(parsed);
			if (validated) {
				return { result: validated };
			}

			if (attempt < MAX_RETRIES) {
				await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
				continue;
			}

			return { error: "parse_error" };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (attempt < MAX_RETRIES) {
				console.warn(`  retry ${attempt}/${MAX_RETRIES} after error: ${message.slice(0, 120)}`);
				await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
				continue;
			}
			return { error: "http_error" };
		}
	}

	return { error: "http_error" };
}

async function main() {
	if (!fs.existsSync(INPUT_FILE)) {
		console.error(`Input file not found: ${INPUT_FILE}`);
		console.error("Run classify-images.ts first.");
		process.exit(1);
	}

	const inputRows = parseCsv(fs.readFileSync(INPUT_FILE, "utf-8"))
		.map(normalizeSourceRow)
		.filter((row): row is CsvRow => row !== null);

	if (inputRows.length === 0) {
		console.log("No rows found.");
		return;
	}

	let resumed = 0;
	if (fs.existsSync(OUTPUT_FILE)) {
		resumed = mergeExistingRows(inputRows, parseCsv(fs.readFileSync(OUTPUT_FILE, "utf-8")));
		console.log(`Resuming: ${resumed} rows already enriched.`);
	}

	for (const row of inputRows) {
		if ((row.class === "non_edible" || row.class === "error") && !isProcessed(row)) {
			Object.assign(row, emptyLlmFields(row));
		}
	}

	const toProcess = inputRows.filter((row) => !isProcessed(row));
	console.log(
		`Total rows: ${inputRows.length}, to enrich: ${toProcess.length}, concurrency: ${CONCURRENCY}\n`,
	);

	let done = 0;
	let succeeded = 0;
	let parseFailed = 0;
	let httpFailed = 0;
	const total = toProcess.length;

	async function processRow(row: CsvRow): Promise<void> {
		const outcome = await enrichImage(row.imageUrl, row.class);

		if (outcome.result) {
			applyResult(row, outcome.result);
			succeeded++;
			console.log(
				`[${done + 1}/${total}] id=${row.id} class=${row.class} -> ${row.llm_image_class} kcal=${row.llm_calories || "null"}`,
			);
		} else {
			Object.assign(row, emptyLlmFields(row));
			row.llm_error = outcome.error ?? "http_error";
			if (row.llm_error === "parse_error") {
				parseFailed++;
			} else {
				httpFailed++;
			}
			console.log(`[${done + 1}/${total}] id=${row.id} -> ${row.llm_error}`);
		}

		done++;
		fs.writeFileSync(OUTPUT_FILE, serializeCsv(inputRows), "utf-8");
	}

	for (let index = 0; index < toProcess.length; index += CONCURRENCY) {
		const batch = toProcess.slice(index, index + CONCURRENCY);
		await Promise.all(batch.map((row) => processRow(row)));
	}

	console.log(
		`\nDone. Success: ${succeeded}, parse_failed: ${parseFailed}, http_failed: ${httpFailed}`,
	);
	console.log(`Output: ${OUTPUT_FILE}`);
}

main();
