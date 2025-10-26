export interface EatenProduct {
  id?: number;
  created_at?: string;
  protein: number;
  kcalories: number;
  unit: string;
  value: number;
  date?: string;
  user_id?: string;
}

export interface Database {
  public: {
    Tables: {
      eaten_product: {
        Row: EatenProduct;
        Insert: Omit<EatenProduct, 'id' | 'created_at'>;
        Update: Partial<Omit<EatenProduct, 'id' | 'created_at'>>;
      };
    };
  };
}
