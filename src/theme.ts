import { createTheme } from "@mantine/core";

export const theme = createTheme({
	primaryColor: "orange",

	fontFamily: "PT Sans, sans-serif",

	headings: {
		fontFamily: "PT Sans, sans-serif",
	},
	defaultRadius: "md",
	components: {
		ActionIcon: {
			defaultProps: {
				variant: "default",
			},
		},
		Paper: {
			defaultProps: {
				bg: "var(--mantine-color-dark-8)",
			},
		},
	}
});
