export interface FileInfo {
	file: File;
	buffer: ArrayBuffer;
	dataUrl: string;
	fullPath: string;
}

export interface ParsedFormData {
	file: File;
	date?: string;
}

export async function parseFormData(req: Request): Promise<ParsedFormData> {
	const formData = await req.formData();
	const file = formData.get("photo") as File;
	const dateValue = formData.get("date");

	if (!file) {
		throw new Error("No photo provided");
	}

	return {
		file,
		date: typeof dateValue === "string" ? dateValue : undefined,
	};
}

export function generateFilePath(userId: string, file: File): string {
	const fileExt = file.name.split(".").pop() || "jpg";
	const fileName = `photo-${Date.now()}.${fileExt}`;
	return `${userId}/${fileName}`;
}

export async function convertFileToDataUrl(file: File): Promise<string> {
	const fileBuffer = await file.arrayBuffer();
	const base64Image = btoa(
		new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
	);
	const mimeType = file.type || "image/jpeg";
	return `data:${mimeType};base64,${base64Image}`;
}

export async function processFile(userId: string, file: File): Promise<FileInfo> {
	const buffer = await file.arrayBuffer();
	const dataUrl = await convertFileToDataUrl(file);
	const fullPath = generateFilePath(userId, file);

	return {
		file,
		buffer,
		dataUrl,
		fullPath,
	};
}
