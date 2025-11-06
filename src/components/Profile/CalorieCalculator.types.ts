export type CalculatorParams = {
	weight: number | null;
	height: number | null;
	age: number | null;
	gender: string | null;
	activityLevel: string | null;
	goal: string | null;
};

export interface CalculatedResults {
	caloriesGoal: number;
	proteinGoal: number;
	bmr: number;
	tdee: number;
}

export interface CalorieCalculatorProps {
	userId: string;
	isLoading?: boolean;
	onSave: (caloriesGoal: number, proteinGoal: number) => void;
	isSaving?: boolean;
	initialParams?: CalculatorParams;
}
