import { Box, Button, Group, Text } from "@mantine/core";
// @ts-expect-error - ViewTransition is experimental in React 19 canaries
import { startTransition, useState, ViewTransition } from "react";
import { create } from "zustand";

const foods = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

interface SandboxStore {
	f: string[];
	setF: (f: string[]) => void;
}

const useSandboxStore = create<SandboxStore>((set) => ({
	f: foods,
	setF: (f: string[]) => {
		document.startViewTransition(() => {
				set({ f });
		});
	},
}));

export function SandboxPage() {
    const f = useSandboxStore((state) => state.f);
    const setF = useSandboxStore((state) => state.setF);

	return (
		<Box
			p="xl"
			bg="dark.8"
			style={{
				minHeight: "70vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				border: "1px dashed var(--mantine-color-gray-6)",
			}}
		>
			<Group align="center" gap="lg" style={{ flexDirection: "column" }}>
				<Text c="dimmed" size="sm">
					Click shuffle to see browser View Transition animations.
				</Text>
				
				<Group gap="md">
					{f.map(food=> (
						<Box
							key={food}
							p="md"
							bg="dark.7"
							style={{ 
								borderRadius: "var(--mantine-radius-md)",
                                viewTransitionName: food,
							}}
						>
							<Text fz={24} fw={600}>{food}</Text>
						</Box>
                        
					))}
                    
				</Group>

				<Button variant="light" onClick={() => startTransition(() => setF(f.toSorted(()=>Math.random() - 0.5)))} mt="md">
					Shuffle
				</Button>
                <Button variant="light" onClick={() => setF(f.slice(1)) } mt="md">
                    Prev
                </Button>
                <Button variant="light" onClick={() => setF([foods[f.length], ...f]) } mt="md">
                    Next
                </Button>
			</Group>
		</Box>
	);
}

