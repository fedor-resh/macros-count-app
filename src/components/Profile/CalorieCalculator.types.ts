import { type ActivityLevel, type Gender, type Goal } from '../../utils/calorieCalculator';

export interface CalculatorParams {
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
}

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

