import { Box, Image } from "@mantine/core";
import { notifications } from "@mantine/notifications";
// @ts-expect-error - ViewTransition is experimental in React 19
import { startTransition, useEffect, useState, ViewTransition } from "react";

const IMAGE_TRANSITION_NAME = "food-image";
const FULLSCREEN_HINT_KEY = "fullscreen-image-hint-shown";

interface FullscreenImageProps {
	src: string;
	style?: React.CSSProperties;
}

export function FullscreenImage({ src, style }: FullscreenImageProps) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (isOpen) {
			const hasSeenHint = localStorage.getItem(FULLSCREEN_HINT_KEY);
			if (!hasSeenHint) {
				notifications.show({
					message: "нажмите в любое место чтобы закрыть",
					color: "blue",
					autoClose: 4000,
				});
				localStorage.setItem(FULLSCREEN_HINT_KEY, "true");
			}
		}
	}, [isOpen]);

	if (!isOpen) {
		return (
			<ViewTransition name={IMAGE_TRANSITION_NAME}>
				<Image
					src={src}
					alt="Food"
					style={{ cursor: "pointer", ...style }}
					onClick={() => startTransition(() => setIsOpen(true))}
				/>
			</ViewTransition>
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
				zIndex: 1000,
				cursor: "pointer",
			}}
			onClick={() => startTransition(() => setIsOpen(false))}
		>
			<ViewTransition name={IMAGE_TRANSITION_NAME}>
				<img
					src={src}
					alt="Fullscreen"
					style={{
						maxWidth: "100%",
						maxHeight: "100%",
						objectFit: "contain",
					}}
				/>
			</ViewTransition>
		</Box>
	);
}
