import { create } from 'zustand';

export interface ProductData {
  name: string;
  weight: number;
  calories: number;
  protein: number;
}

interface AddProductDrawerState {
  opened: boolean;
  productData: ProductData | null;
  open: (data?: ProductData) => void;
  close: () => void;
  setProductData: (data: ProductData | null) => void;
  reset: () => void;
}

export const useAddProductDrawerStore = create<AddProductDrawerState>((set) => ({
  opened: false,
  productData: null,

  open: (data) => {
    set({
      opened: true,
      productData: data || null,
    });
  },

  close: () => {
    set({ opened: false });
  },

  setProductData: (data) => {
    set({ productData: data });
  },

  reset: () => {
    set({
      opened: false,
      productData: null,
    });
  },
}));

