export interface DayProgress {
	day: string;
	date: string;
	caloriesPercent: number;
	proteinPercent: number;
	caloriesOverflowPercent: number;
	proteinOverflowPercent: number;
	caloriesExceeded: boolean;
	proteinExceeded: boolean;
	isActive: boolean;
	onClick: () => void;
}
