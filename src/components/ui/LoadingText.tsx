import { Text } from "@mantine/core";
import "./LoadingText.css";

export interface LoadingTextProps {
	text: string;
}

export function LoadingText({ text }: LoadingTextProps) {
	return (
		<Text fw={550} span>
			{text}
			<span className="loading-dot-1">.</span>
			<span className="loading-dot-2">.</span>
			<span className="loading-dot-3">.</span>
		</Text>
	);
}
