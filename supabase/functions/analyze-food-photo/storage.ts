import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_FILE_SIZE = 200 * 1024; // 200KB in bytes
const INITIAL_QUALITY = 85;
const MIN_QUALITY = 20;
const QUALITY_STEP = 5;

/**
 * Compresses an image buffer to be under the target file size
 */
async function compressImage(
	imageBuffer: ArrayBuffer,
	contentType: string,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
	try {
		// Decode the image
		const image = await Image.decode(new Uint8Array(imageBuffer));

		let quality = INITIAL_QUALITY;
		let compressedBuffer = await image.encodeJPEG(quality);

		// Try different quality levels until we get under the size limit
		while (quality >= MIN_QUALITY) {
			// Check if size is acceptable
			if (compressedBuffer.byteLength <= MAX_FILE_SIZE) {
				console.log(
					`Compressed image to ${compressedBuffer.byteLength} bytes with quality ${quality}`,
				);
				return {
					buffer: compressedBuffer as unknown as ArrayBuffer,
					contentType: "image/jpeg",
				};
			}

			// Reduce quality and try again
			quality -= QUALITY_STEP;
			if (quality >= MIN_QUALITY) {
				compressedBuffer = await image.encodeJPEG(quality);
			}
		}

		// If still too large, resize the image
		console.log("Image still too large, resizing...");
		const scale = Math.sqrt(MAX_FILE_SIZE / compressedBuffer.byteLength);
		const newWidth = Math.floor(image.width * scale);
		const newHeight = Math.floor(image.height * scale);

		const resizedImage = image.resize(newWidth, newHeight);
		compressedBuffer = await resizedImage.encodeJPEG(INITIAL_QUALITY);

		// Try reducing quality on resized image if still too large
		quality = INITIAL_QUALITY;
		while (quality >= MIN_QUALITY && compressedBuffer.byteLength > MAX_FILE_SIZE) {
			compressedBuffer = await resizedImage.encodeJPEG(quality);
			quality -= QUALITY_STEP;
		}

		console.log(
			`Final compressed image size: ${compressedBuffer.byteLength} bytes (${newWidth}x${newHeight})`,
		);

		return {
			buffer: compressedBuffer as unknown as ArrayBuffer,
			contentType: "image/jpeg",
		};
	} catch (error) {
		console.error("Image compression failed:", error);
		// If compression fails, return original buffer
		return { buffer: imageBuffer, contentType };
	}
}

export async function uploadImage(
	supabaseClient: SupabaseClient,
	fullPath: string,
	fileBuffer: ArrayBuffer,
	contentType: string,
): Promise<{ error: Error | null }> {
	// Compress image before uploading
	const { buffer: compressedBuffer, contentType: finalContentType } = await compressImage(
		fileBuffer,
		contentType,
	);

	const uploadResult = await supabaseClient.storage
		.from("images")
		.upload(fullPath, compressedBuffer, {
			contentType: finalContentType,
			cacheControl: "3600",
			upsert: false,
		});

	if (uploadResult.error) {
		return { error: new Error(`Failed to upload: ${uploadResult.error.message}`) };
	}

	return { error: null };
}

export function getPublicUrl(supabaseClient: SupabaseClient, fullPath: string): string {
	const {
		data: { publicUrl },
	} = supabaseClient.storage.from("images").getPublicUrl(fullPath);
	return publicUrl;
}
