import type { Gender } from "@/types/types";

export interface BmrInput {
	weight: number;
	height: number;
	age: number;
	gender: Gender;
}

export interface BmrStrategy {
	readonly name: string;
	compute(input: BmrInput): number;
}

export class MifflinStJeorStrategy implements BmrStrategy {
	readonly name = "mifflin-st-jeor";

	compute({ weight, height, age, gender }: BmrInput): number {
		const base = 10 * weight + 6.25 * height - 5 * age;
		return base + (gender === "male" ? 5 : -161);
	}
}

export class HarrisBenedictStrategy implements BmrStrategy {
	readonly name = "harris-benedict";

	compute({ weight, height, age, gender }: BmrInput): number {
		if (gender === "male") {
			return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
		}
		return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
	}
}

export const bmrStrategies = {
	"mifflin-st-jeor": new MifflinStJeorStrategy(),
	"harris-benedict": new HarrisBenedictStrategy(),
} as const satisfies Record<string, BmrStrategy>;

export type BmrStrategyName = keyof typeof bmrStrategies;

export const defaultBmrStrategy: BmrStrategy = bmrStrategies["mifflin-st-jeor"];
