import { Box, Image } from "@mantine/core";
import { notifications } from "@mantine/notifications";
// @ts-expect-error - ViewTransition is experimental in React 19
import { startTransition, useEffect, useState, ViewTransition, useId } from "react";

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

	const id = useId();

	if (!isOpen) {
		return (
			<ViewTransition name={IMAGE_TRANSITION_NAME+id}>
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
				inset: 0,
				transition: "all 0.5s ease-in-out",
				zIndex: 100,
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			onClick={() => startTransition(() => setIsOpen(false))}
		>
			<ViewTransition name={IMAGE_TRANSITION_NAME+id}>
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
