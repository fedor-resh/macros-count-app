import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface AboveKeyboardWrapperProps {
	/** Content to render inside the wrapper */
	children: ReactNode;
	/** Additional offset from the bottom in pixels (default: 16) */
	bottomOffset?: number;
	/** Whether to hide the wrapper while calculating position (default: true) */
	hideWhileCalculating?: boolean;
	/** Custom styles for the wrapper container */
	style?: CSSProperties;
	/** Custom className for the wrapper container */
	className?: string;
	/** Focus the first matching element inside the wrapper on mount */
	autoFocus?: boolean;
	/** CSS selector to find the element to autofocus (default: "input, textarea, select, [contenteditable=\"true\"]") */
	focusSelector?: string;
}

export function AboveKeyboardWrapper({
	children,
	bottomOffset = 16,
	hideWhileCalculating = true,
	style,
	className,
	autoFocus,
	focusSelector = "input, textarea, select, [contenteditable=\"true\"]",
}: AboveKeyboardWrapperProps) {
	const [top, setTop] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function resizeHandler() {
			if (!containerRef.current) return;

			// Get element height dynamically
			const elementHeight = containerRef.current.offsetHeight;

			// Get viewport height and offset
			const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
			const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;

			// Calculate top position: viewport offset + viewport height + scroll - element height - offset
			// viewport.offsetTop accounts for the keyboard pushing the viewport up
			const newTop = viewportOffsetTop + viewportHeight - elementHeight - bottomOffset;
			setTop(newTop);
		}

		// Run first time to initialize
		resizeHandler();

		// Subscribe to events which affect scroll or viewport position
		window.visualViewport?.addEventListener("resize", resizeHandler);
		window.visualViewport?.addEventListener("scroll", resizeHandler);

		// Unsubscribe
		return () => {
			window.visualViewport?.removeEventListener("resize", resizeHandler);
			window.visualViewport?.removeEventListener("scroll", resizeHandler);
		};
	}, [bottomOffset]);

	useEffect(() => {
		if (!autoFocus) {
			return;
		}

		const focusElement = () => {
			const target = containerRef.current?.querySelector<HTMLElement>(focusSelector);
			target?.focus({ preventScroll: true });
		};

		focusElement();
		const timer = window.setTimeout(focusElement, 0);

		return () => window.clearTimeout(timer);
	}, [autoFocus, focusSelector]);

	return (
		<div
			ref={containerRef}
			className={className}
			style={{
				position: "fixed",
				left: "50%",
				top,
				transform: "translateX(-50%)",
				width: "100%",
				zIndex: 100,
				visibility: hideWhileCalculating && top === 0 ? "hidden" : "visible",
				...style,
			}}
		>
			{children}
		</div>
	);
}

