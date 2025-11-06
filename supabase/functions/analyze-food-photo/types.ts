export interface FoodAnalysis {
	food_name: string;
	calories?: number;
	protein?: number;
	weight?: number;
	confidence: "low" | "medium" | "high";
	raw_response?: string;
}

export interface EatenProductInsert {
	name: string;
	unit: string;
	date: string;
	userId: string;
	imageUrl: string;
	kcalories?: number;
	protein?: number;
	value?: number;
}

export interface AnalysisResponse {
	success: boolean;
	publicUrl: string;
	filePath: string;
	analysis: FoodAnalysis;
	insertedId?: number;
}

export interface ErrorResponse {
	error: string;
	publicUrl?: string;
	analysis?: FoodAnalysis;
}
