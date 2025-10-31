export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'veryHigh';
export type Goal = 'loss' | 'maintain' | 'gain';

// Коэффициенты активности
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  veryHigh: 1.9,
};

// Дефицит/профицит калорий в зависимости от цели
const CALORIE_ADJUSTMENTS: Record<Goal, number> = {
  loss: -500,
  maintain: 0,
  gain: 400, // среднее значение между 300-500
};

// Коэффициенты белка (г на кг веса) в зависимости от цели
const PROTEIN_MULTIPLIERS: Record<Goal, { min: number; max: number }> = {
  loss: { min: 2.2, max: 2.5 },
  maintain: { min: 1.6, max: 2.2 },
  gain: { min: 2.2, max: 2.5 },
};

/**
 * Рассчитывает базовый метаболизм (BMR) по формуле Mifflin-St Jeor
 * @param weight - вес в кг
 * @param height - рост в см
 * @param age - возраст в годах
 * @param gender - пол
 * @returns BMR в ккал
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number {
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;
  const genderAdjustment = gender === 'male' ? 5 : -161;
  return baseBMR + genderAdjustment;
}

/**
 * Рассчитывает общий расход энергии (TDEE)
 * @param bmr - базовый метаболизм
 * @param activityLevel - уровень активности
 * @returns TDEE в ккал
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Рассчитывает цель по калориям на основе TDEE и цели пользователя
 * @param tdee - общий расход энергии
 * @param goal - цель (похудение/поддержание/набор)
 * @returns Цель по калориям в ккал
 */
export function calculateCaloriesGoal(tdee: number, goal: Goal): number {
  return Math.round(tdee + CALORIE_ADJUSTMENTS[goal]);
}

/**
 * Рассчитывает цель по белку
 * @param weight - вес в кг
 * @param goal - цель (похудение/поддержание/набор)
 * @returns Цель по белку в граммах
 */
export function calculateProteinGoal(weight: number, goal: Goal): number {
  const multiplier = PROTEIN_MULTIPLIERS[goal];
  // Используем среднее значение между min и max
  const avgMultiplier = (multiplier.min + multiplier.max) / 2;
  return Math.round(weight * avgMultiplier);
}

/**
 * Рассчитывает все цели на основе параметров пользователя
 * @param params - параметры пользователя
 * @returns Рассчитанные цели
 */
export function calculateGoals(params: {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
}) {
  const bmr = calculateBMR(params.weight, params.height, params.age, params.gender);
  const tdee = calculateTDEE(bmr, params.activityLevel);
  const caloriesGoal = calculateCaloriesGoal(tdee, params.goal);
  const proteinGoal = calculateProteinGoal(params.weight, params.goal);

  return {
    bmr: Math.round(bmr),
    tdee,
    caloriesGoal,
    proteinGoal,
  };
}

