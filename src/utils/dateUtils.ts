export function getFormattedDate(date: Date = new Date()): string {
	return date.toLocaleDateString("sv-SE");
}

