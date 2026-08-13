import { AppShell, Avatar, Container, Group, UnstyledButton } from "@mantine/core";
import type { DateValue } from "@mantine/dates";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import faviconUrl from "../../favicon.svg?url";
import { useAuthStore } from "../../stores/authStore";
import { useDateStore } from "../../stores/dateStore";
import { getFormattedDate } from "../../utils/dateUtils";

export function AppLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const user = useAuthStore((state) => state.user);
	const { selectedDate, setSelectedDate } = useDateStore();

	const handleDateChange = (date: DateValue) => {
		if (date) {
			const dateObj = typeof date === "string" ? new Date(date) : date;
			const dateStr = getFormattedDate(dateObj);
			setSelectedDate(dateStr);
		} else {
			setSelectedDate(getFormattedDate(new Date()));
		}
	};

	const dateValue: DateValue | null = selectedDate ? new Date(selectedDate) : null;
	const isSearchPage = location.pathname === "/add-product/search";

	return (
		<AppShell header={isSearchPage ? undefined : { height: 60 }} padding="sm">
			{!isSearchPage ? (
				<AppShell.Header>
					<Group h="100%" px="md" align="center" justify="space-between">
						<UnstyledButton
							onClick={() => navigate("/")}
							style={{ display: "flex", alignItems: "center" }}
						>
							<img
								src={faviconUrl}
								alt="Home"
								style={{ width: 32, height: 32, cursor: "pointer" }}
							/>
						</UnstyledButton>
						<Group gap="xs">
							<DatePickerInput
								value={dateValue}
								onChange={handleDateChange}
								placeholder="Выберите дату"
								locale="ru"
								valueFormat="DD.MM.YYYY"
								leftSection={<IconCalendar size={18} stroke={1.5} />}
								styles={{
									root: {
										width: "min-content",
									},
									input: {
										border: "0",
									},
								}}
								classNames={{
									day: "day",
								  }}
							/>
							<UnstyledButton onClick={() => navigate("/profile")}>
								<Avatar
									alt={user?.email || "User"}
									name={user?.email || "User"}
									radius="xl"
									size="md"
									style={{ cursor: "pointer" }}
								/>
							</UnstyledButton>
						</Group>
					</Group>
				</AppShell.Header>
			) : null}

			<AppShell.Main>
				<Container size="500px" px="0" my="0">
					<Outlet />
				</Container>
			</AppShell.Main>
		</AppShell>
	);
}
