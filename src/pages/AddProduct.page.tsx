import { Button, Divider, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
	IconArrowLeft,
	IconBarcode,
	IconCamera,
	IconPhoto,
	IconPlus,
	IconSearch,
} from "@tabler/icons-react";
import type { ChangeEvent } from "react";
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUploadPhotoMutation } from "../api/photoQueries";
import { ProductDrawer } from "../components/MacrosTracker/ProductDrawer";
import { useDateStore } from "../stores/dateStore";
import { useProductDrawerStore } from "../stores/productDrawerStore";
import { startTransition } from "../utils/viewTransition";

export function AddProductPage() {
	const navigate = useNavigate();
	const openForAdd = useProductDrawerStore((state) => state.openForAdd);
	const uploadPhotoMutation = useUploadPhotoMutation();
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);
	const selectedDate = useDateStore((state) => state.selectedDate);

	const navigateBack = () => {
		navigate("/");
	};

	const navigateToSearch = useCallback(() => {
		startTransition(() => {
			navigate("/add-product/search");
		});
	}, [navigate]);

	const handleFromGallery = () => {
		galleryInputRef.current?.click();
	};

	const handleFromCamera = () => {
		cameraInputRef.current?.click();
	};

	const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

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
				onError: (err) => {
					const msg = err instanceof Error ? err.message : "Не удалось загрузить фото";
					notifications.show({ title: "Ошибка", message: msg, color: "red" });
				},
				onSettled: () => {
					if (cameraInputRef.current) {
						cameraInputRef.current.value = "";
					}
					if (galleryInputRef.current) {
						galleryInputRef.current.value = "";
					}
				},
			},
		);
	};

	const commonButtonProps = {
		fullWidth: true,
		variant: "default" as const,
		size: "lg" as const,
		disabled: uploadPhotoMutation.isPending,
		style: {
			backgroundColor: "#2a2a2a",
			color: "#d9d9d9",
			borderColor: "#3a3a3a",
		},
	};

	return (
		<div style={{ minHeight: "100%", paddingBottom: 120 }}>
			<Stack gap="lg">
				<Stack gap="md">
					<Button
						leftSection={<IconArrowLeft size={20} />}
						onClick={navigateBack}
						variant="subtle"
						color="gray"
						style={{ alignSelf: "flex-start" }}
					>
						Назад
					</Button>

					<Stack gap="xs">
						<Text fw={600} fz="xl" c="#d9d9d9">
							Добавьте продукт
						</Text>
						<Text c="#9a9a9a">
							Выберите один из способов: поиск, штрих-код, ручной ввод или анализ фото.
						</Text>
					</Stack>

					<Button
						{...commonButtonProps}
						leftSection={<IconSearch size={20} />}
						onClick={navigateToSearch}
					>
						Найти продукт
					</Button>
					<Button
						{...commonButtonProps}
						leftSection={<IconBarcode size={20} />}
						onClick={navigateToSearch}
					>
						Сканировать штрих-код
					</Button>
					<Button
						{...commonButtonProps}
						leftSection={<IconPlus size={20} />}
						onClick={() => openForAdd()}
					>
						Добавить вручную
					</Button>

					<Divider label="Фото" labelPosition="center" color="#2a2a2a" />

					<Button
						{...commonButtonProps}
						leftSection={<IconPhoto size={20} />}
						onClick={handleFromGallery}
						loading={uploadPhotoMutation.isPending}
					>
						Выбрать из галереи
					</Button>
					<Button
						{...commonButtonProps}
						leftSection={<IconCamera size={20} />}
						onClick={handleFromCamera}
						loading={uploadPhotoMutation.isPending}
					>
						Сделать фото
					</Button>
				</Stack>

				<TextInput
					readOnly
					placeholder="Поиск продуктов..."
					onClick={navigateToSearch}
					onFocus={navigateToSearch}
					leftSection={<IconSearch size={18} />}
					style={{
						viewTransitionName: "search-input",
					}}
				/>
			</Stack>

			<input
				ref={cameraInputRef}
				type="file"
				accept="image/*"
				capture="environment"
				onChange={handleFileSelect}
				style={{ display: "none" }}
			/>
			<input
				ref={galleryInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileSelect}
				style={{ display: "none" }}
			/>

			<ProductDrawer />
		</div>
	);
}
