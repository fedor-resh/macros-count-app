import { Button } from "@mantine/core";
import { IconCalculator } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export function CalorieGoalReminder() {
	const navigate = useNavigate();

	const handleClick = () => {
		navigate("/profile");
		// Wait for navigation to complete, then scroll to calculator
		setTimeout(() => {
			const calculatorElement = document.getElementById("calorie-calculator");
			if (calculatorElement) {
				calculatorElement.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		}, 100);
	};

	return (
		<Button
			onClick={handleClick}
			size="md"
			variant="light"
			leftSection={<IconCalculator size={16} />}
		>
			Настроить цели
		</Button>
	);
}
