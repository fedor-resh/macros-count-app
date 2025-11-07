import { flushSync } from "react-dom";

type ViewTransitionCallback = () => void | Promise<void>;

export function startTransition(callback: ViewTransitionCallback) {
	const doc = document as Document & {
		startViewTransition?: (cb: ViewTransitionCallback) => { finished: Promise<void> };
	};

	if (typeof doc.startViewTransition === "function") {
		doc.startViewTransition(() => {
			flushSync(callback);
		});
	} else {
		callback();
	}
}

