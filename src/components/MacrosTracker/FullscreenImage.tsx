import { Box, Image } from "@mantine/core";
import { useState } from "react";

interface FullscreenImageProps {
	src: string;
}

export function FullscreenImage({ src }: FullscreenImageProps) {
	const [isOpen, setIsOpen] = useState(false);

	if (!isOpen) {
		return (
			<Image
				src={src}
				alt="Food"
				style={{ cursor: "pointer", height: 75}}
				onClick={() => setIsOpen(true)}
			/>
		);
	}

	return (
		<Box
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.95)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
				cursor: "pointer",
			}}
			onClick={() => setIsOpen(false)}
		>
			<img
				src={src}
				alt="Fullscreen"
				style={{
					maxWidth: "100%",
					maxHeight: "100%",
					objectFit: "contain",
				}}
			/>
		</Box>
	);
}
