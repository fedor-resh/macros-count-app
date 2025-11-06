import type { Database } from "./database.types";

export type EatenProductTable = Database["public"]["Tables"]["eaten_product"];

export type EatenProduct = EatenProductTable["Row"];

export type InsertEatenProduct = EatenProductTable["Insert"];

export type UserTable = Database["public"]["Tables"]["users"];

export type User = UserTable["Row"];

export type Gender = "male" | "female";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "veryHigh";

export type Goal = "loss" | "maintain" | "gain";
