import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { FoodAnalysis, EatenProductInsert } from "./types.ts";

export function prepareEatenProductData(
	analysis: FoodAnalysis,
	userId: string,
	publicUrl: string,
	date?: string,
): EatenProductInsert {
	const today = new Date().toLocaleDateString("sv-SE");
	const normalizedDate =
		typeof date === "string" && date.trim().length > 0 ? date.trim() : today;

	const data: EatenProductInsert = {
		name: analysis.food_name || "Продукт",
		unit: "г",
		date: normalizedDate,
		userId: userId,
		imageUrl: publicUrl,
	};

	if (analysis.calories) {
		data.kcalories = Math.round(analysis.calories);
	}
	if (analysis.protein) {
		data.protein = Math.round(analysis.protein);
	}
	if (analysis.weight) {
		data.value = Math.round(analysis.weight);
	}

	return data;
}

export async function insertEatenProduct(
	supabaseClient: SupabaseClient,
	data: EatenProductInsert,
): Promise<{ id?: number }> {
	const { data: insertedData, error } = await supabaseClient
		.from("eaten_product")
		.insert(data)
		.select();

	if (error) {
		console.error("Database insert error:", error);
		throw new Error(`Failed to insert data: ${error.message}`);
	}

	console.log("Inserted data", insertedData);

	return { id: insertedData?.[0]?.id };
}
