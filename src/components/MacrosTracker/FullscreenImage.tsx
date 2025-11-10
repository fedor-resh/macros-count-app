import { Box, Image } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useId, useRef, useState } from "react";
import { startTransition } from "../../utils/viewTransition";

const IMAGE_TRANSITION_NAME = "food-image";
const FULLSCREEN_HINT_KEY = "fullscreen-image-hint-shown";

interface FullscreenImageProps {
	src: string;
	style?: React.CSSProperties;
}

export function FullscreenImage({ src, style }: FullscreenImageProps) {
	const [isOpen, setIsOpen] = useState(false);
	const id = useId();
	const ref = useRef<HTMLImageElement>(null);

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

	const handleToggle = () => {
		if (ref.current) {
			ref.current.style.zIndex = "10000";
		}
		startTransition(() => {
			setIsOpen((prev) => !prev);
		});
	};

	if (!isOpen) {
		return (
			<Image
				src={src}
				ref={ref}
				alt="Food"
				style={{ 
					position: "relative",
					borderTopRightRadius: "10px",
					borderBottomRightRadius: "10px",
					cursor: "pointer", 
					viewTransitionName: `${IMAGE_TRANSITION_NAME}-${id}`,
					...style 
				}}
				onClick={handleToggle}
			/>
		);
	}

	return (
		<Box
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 100,
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			onClick={handleToggle}
		>
			<img
				src={src}
				alt="Fullscreen"
				style={{
					maxWidth: "100%",
					maxHeight: "100%",
					objectFit: "contain",
					viewTransitionName: `${IMAGE_TRANSITION_NAME}-${id}`,
				}}
			/>
		</Box>
	);
}
