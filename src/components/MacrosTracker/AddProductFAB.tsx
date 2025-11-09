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
					padding: "12px 16px",
					zIndex: 3,
				}}
			>
				<TextInput
					readOnly
					placeholder="Поиск продуктов..."
					onClick={navigateToSearch}
					onFocus={navigateToSearch}
					leftSection={<IconSearch size={18} />}
					style={{ flex: 1 }}
					styles={{
						input: {
							backgroundColor: "#2a2a2a",
							color: "#d9d9d9",
							borderColor: "#3a3a3a",
							cursor: "pointer",
							viewTransitionName: "search-input",
						},
					}}
				/>

				<ActionIcon
					size={48}
					radius="lg"
					aria-label="Сделать фото"
					onClick={handlePhotoClick}
					disabled={uploadPhotoMutation.isPending}
					style={{
						backgroundColor: "#ff7428",
						color: "#1a1a1a",
					}}
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
