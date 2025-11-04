import { ActionIcon, Transition } from "@mantine/core";
import { useClickOutside } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconBarcode, IconCamera, IconPhoto, IconPlus, IconSearch } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useUploadPhotoMutation } from "../../api/photoQueries";

interface AddProductFABProps {
	onAddProduct: () => void;
}

export function AddProductFAB({ onAddProduct }: AddProductFABProps) {
	const [fabExpanded, setFabExpanded] = useState(false);
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);
	const uploadPhotoMutation = useUploadPhotoMutation();

	const fabRef = useClickOutside(() => setFabExpanded(false));

	const handleActionClick = () => {
		setFabExpanded(false);
		onAddProduct();
	};

	const handleCameraClick = () => {
		setFabExpanded(false);
		cameraInputRef.current?.click();
	};

	const handleGalleryClick = () => {
		setFabExpanded(false);
		galleryInputRef.current?.click();
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		uploadPhotoMutation.mutate(file, {
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
				// Reset inputs
				if (cameraInputRef.current) {
					cameraInputRef.current.value = "";
				}
				if (galleryInputRef.current) {
					galleryInputRef.current.value = "";
				}
			},
		});
	};

	return (
		<div
			ref={fabRef}
			style={{
				position: "fixed",
				bottom: 32,
				right: 32,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 16,
				zIndex: 3,
			}}
		>
			{/* Circular Action Buttons */}
			<Transition mounted={fabExpanded} transition="pop" duration={200} timingFunction="ease">
				{(styles) => (
					<div
						style={{
							...styles,
							display: "flex",
							flexDirection: "column",
							gap: 12,
							alignItems: "center",
						}}
					>
						<ActionIcon
							size={50}
							radius="xl"
							onClick={handleActionClick}
							aria-label="Search product"
							disabled={uploadPhotoMutation.isPending}
						>
							<IconSearch size={24} stroke={2} color="#2a2a2a" />
						</ActionIcon>
						<ActionIcon
							size={50}
							radius="xl"
							onClick={handleActionClick}
							aria-label="Scan barcode"
							disabled={uploadPhotoMutation.isPending}
						>
							<IconBarcode size={24} stroke={2} color="#2a2a2a" />
						</ActionIcon>
						<ActionIcon
							size={50}
							radius="xl"
							onClick={handleActionClick}
							aria-label="Add manually"
							disabled={uploadPhotoMutation.isPending}
						>
							<IconPlus size={24} stroke={2} color="#2a2a2a" />
						</ActionIcon>
						<ActionIcon
							size={50}
							radius="xl"
							onClick={handleGalleryClick}
							aria-label="Choose from gallery"
							disabled={uploadPhotoMutation.isPending}
						>
							<IconPhoto size={24} stroke={2} color="#2a2a2a" />
						</ActionIcon>
						<ActionIcon
							size={50}
							radius="xl"
							onClick={handleCameraClick}
							aria-label="Take photo"
							disabled={uploadPhotoMutation.isPending}
						>
							<IconCamera size={24} stroke={2} color="#2a2a2a" />
						</ActionIcon>
					</div>
				)}
			</Transition>

			{/* Main FAB Button */}
			<ActionIcon
				size={60}
				radius="md"
				style={{
					transform: fabExpanded ? "rotate(45deg)" : "rotate(0deg)",
					transition: "transform 0.2s ease",
				}}
				aria-label={fabExpanded ? "Close menu" : "Add food item"}
				onClick={() => setFabExpanded(!fabExpanded)}
				loading={uploadPhotoMutation.isPending}
			>
				<IconPlus size={32} stroke={2} color="#2a2a2a" />
			</ActionIcon>

			{/* Hidden file inputs */}
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
		</div>
	);
}
