import type { Database } from "./database.types";

export type EatenProductTable = Database["public"]["Tables"]["eaten_product"];

export type EatenProduct = EatenProductTable["Row"];

export type InsertEatenProduct = EatenProductTable["Insert"];
