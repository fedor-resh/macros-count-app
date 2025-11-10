import { ActionIcon, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCamera, IconSearch } from "@tabler/icons-react";
import type { ChangeEvent } from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUploadPhotoMutation } from "../../api/photoQueries";
import { startTransition } from "../../utils/viewTransition";
import { useDateStore } from "../../stores/dateStore";
import { getFormattedDate } from "../../utils/dateUtils";

export function AddProductFAB() {
	const navigate = useNavigate();
	const uploadPhotoMutation = useUploadPhotoMutation();
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const selectedDate = useDateStore((state) => state.selectedDate);

	const navigateToSearch = () => {
		startTransition(() => {
			navigate("/add-product/search");
		});
	};

	const handlePhotoClick = () => {
		cameraInputRef.current?.click();
	};

	const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		uploadPhotoMutation.mutate(
			{
				file,
				date: selectedDate,
			},
			{
			onSuccess: (result) => {
				notifications.show({
					title: "Успешно",
					message: `Фото проанализировано: ${result.analysis.food_name}`,
					color: "green",
				});
			},
			onError: (error) => {
				const message = error instanceof Error ? error.message : "Не удалось загрузить фото";
				notifications.show({ title: "Ошибка", message, color: "red" });
			},
			onSettled: () => {
				if (cameraInputRef.current) {
					cameraInputRef.current.value = "";
				}
			},
			},
		);
	};

	return (
		<>
			<div
				style={{
					position: "fixed",
					left: "50%",
					bottom: 16,
					transform: "translateX(-50%)",
					width: "min(500px, calc(100% - 32px))",
					display: "flex",
					alignItems: "center",
					gap: 12,
					zIndex: 3,
				}}
			>
				<TextInput
					readOnly
					placeholder="Поиск продуктов..."
					onClick={navigateToSearch}
					onFocus={navigateToSearch}
					leftSection={<IconSearch size={20} />}
					size="lg"
					style={{ flex: 1, viewTransitionName: "search-input" }}
					styles={{
						input: {
							backgroundColor: "var(--mantine-color-dark-6)",
							boxShadow: "var(--mantine-shadow-lg)",
							border: "1px solid var(--mantine-color-dark-3)",
						},
					}}
				/>

				<ActionIcon
					size={48}
					aria-label="Сделать фото"
					onClick={handlePhotoClick}
				>
					<IconCamera size={24} stroke={2} />
				</ActionIcon>
			</div>

			<input
				ref={cameraInputRef}
				type="file"
				accept="image/*"
				capture="environment"
				onChange={handleFileSelect}
				style={{ display: "none" }}
			/>
		</>
	);
}
