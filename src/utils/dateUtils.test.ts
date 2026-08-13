import { describe, expect, it } from "vitest";
import { getFormattedDate } from "./dateUtils";

describe("getFormattedDate", () => {
	it("TC-16: форматирует дату в YYYY-MM-DD (sv-SE локаль)", () => {
		const date = new Date(2026, 0, 15); // 15 января 2026 (локальная дата)
		expect(getFormattedDate(date)).toBe("2026-01-15");
	});

	it("TC-17: добавляет ведущие нули для одноразрядного дня и месяца", () => {
		const date = new Date(2026, 2, 5); // 5 марта 2026
		expect(getFormattedDate(date)).toBe("2026-03-05");
	});

	it("TC-18: корректно форматирует последний день года", () => {
		const date = new Date(2026, 11, 31); // 31 декабря 2026
		expect(getFormattedDate(date)).toBe("2026-12-31");
	});

	it("TC-19: без аргумента использует текущую дату (smoke)", () => {
		const result = getFormattedDate();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
