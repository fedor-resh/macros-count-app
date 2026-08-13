import { describe, expect, it } from "vitest";
import {
	calculateBMR,
	calculateCaloriesGoal,
	calculateGoals,
	calculateProteinGoal,
	calculateTDEE,
} from "./calorieCalculator";
import { bmrStrategies, HarrisBenedictStrategy, MifflinStJeorStrategy } from "./bmrStrategy";

describe("calorieCalculator (BMR via Mifflin-St Jeor by default)", () => {
	it("TC-01: вычисляет BMR для мужчины по Mifflin-St Jeor", () => {
		// 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
		expect(calculateBMR(80, 180, 30, "male")).toBe(1780);
	});

	it("TC-02: вычисляет BMR для женщины по Mifflin-St Jeor", () => {
		// 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
		expect(calculateBMR(60, 165, 25, "female")).toBeCloseTo(1345.25, 2);
	});

	it("TC-03: вычисляет BMR через стратегию Harris-Benedict (male)", () => {
		const strategy = new HarrisBenedictStrategy();
		// 88.362 + 13.397*80 + 4.799*180 - 5.677*30
		const expected = 88.362 + 13.397 * 80 + 4.799 * 180 - 5.677 * 30;
		expect(calculateBMR(80, 180, 30, "male", strategy)).toBeCloseTo(expected, 2);
	});

	it("TC-04: вычисляет BMR через стратегию Harris-Benedict (female)", () => {
		const strategy = new HarrisBenedictStrategy();
		const expected = 447.593 + 9.247 * 60 + 3.098 * 165 - 4.33 * 25;
		expect(calculateBMR(60, 165, 25, "female", strategy)).toBeCloseTo(expected, 2);
	});

	it("TC-05: стратегии Mifflin и Harris-Benedict дают разные значения", () => {
		const input = { weight: 80, height: 180, age: 30, gender: "male" as const };
		const mifflin = new MifflinStJeorStrategy().compute(input);
		const hb = new HarrisBenedictStrategy().compute(input);
		expect(mifflin).not.toBe(hb);
	});

	it("TC-06: реестр стратегий содержит обе формулы", () => {
		expect(Object.keys(bmrStrategies)).toEqual(
			expect.arrayContaining(["mifflin-st-jeor", "harris-benedict"]),
		);
	});
});

describe("calculateTDEE", () => {
	it("TC-07: умножает BMR на коэффициент активности (sedentary 1.2)", () => {
		expect(calculateTDEE(2000, "sedentary")).toBe(2400);
	});

	it("TC-08: для очень высокой активности коэффициент 1.9", () => {
		expect(calculateTDEE(2000, "veryHigh")).toBe(3800);
	});
});

describe("calculateCaloriesGoal", () => {
	it("TC-09: цель loss даёт дефицит 500 ккал", () => {
		expect(calculateCaloriesGoal(2400, "loss")).toBe(1900);
	});

	it("TC-10: цель maintain не меняет TDEE", () => {
		expect(calculateCaloriesGoal(2400, "maintain")).toBe(2400);
	});

	it("TC-11: цель gain даёт профицит 400 ккал", () => {
		expect(calculateCaloriesGoal(2400, "gain")).toBe(2800);
	});
});

describe("calculateProteinGoal", () => {
	it("TC-12: для sedentary 0.8 г/кг", () => {
		expect(calculateProteinGoal(80, "sedentary")).toBe(64);
	});

	it("TC-13: для high 1.8 г/кг", () => {
		expect(calculateProteinGoal(80, "high")).toBe(144);
	});
});

describe("calculateGoals (интеграция)", () => {
	it("TC-14: рассчитывает полный набор целей для male, loss", () => {
		const result = calculateGoals({
			weight: 80,
			height: 180,
			age: 30,
			gender: "male",
			activityLevel: "moderate",
			goal: "loss",
		});
		// BMR (Mifflin) = 1780, TDEE = 1780*1.55 = 2759, caloriesGoal = 2759-500 = 2259
		expect(result.bmr).toBe(1780);
		expect(result.tdee).toBe(2759);
		expect(result.caloriesGoal).toBe(2259);
		// protein = 80 * 1.6 = 128
		expect(result.proteinGoal).toBe(128);
	});

	it("TC-15: использует Harris-Benedict при явной передаче стратегии", () => {
		const mifflinResult = calculateGoals({
			weight: 80,
			height: 180,
			age: 30,
			gender: "male",
			activityLevel: "moderate",
			goal: "maintain",
		});
		const hbResult = calculateGoals(
			{
				weight: 80,
				height: 180,
				age: 30,
				gender: "male",
				activityLevel: "moderate",
				goal: "maintain",
			},
			new HarrisBenedictStrategy(),
		);
		expect(hbResult.bmr).not.toBe(mifflinResult.bmr);
	});
});
