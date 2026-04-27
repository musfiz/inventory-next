import { useState, useEffect, useCallback } from 'react';
import { SelectOption } from '@/components/ui/custom-select';
import { productVariationService, commonService } from '@/services';
import { Product } from '@/types/api.types';
import { ERROR_MESSAGES } from '../constants';

/**
 * Custom hook for managing product and variation selections
 */
export function useProductSelection(initialProductId?: string | null) {
  const [selectedProduct, setSelectedProduct] = useState<SelectOption | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<SelectOption | null>(null);
  const [variationOptions, setVariationOptions] = useState<SelectOption[]>([]);
  const [defaultProductOptions, setDefaultProductOptions] = useState<SelectOption[]>([]);

  /**
   * Load product options for dropdown
   */
  const loadProductOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      try {
        // Return cached options if no search input
        if (!inputValue && defaultProductOptions.length > 0) {
          return defaultProductOptions;
        }

        const params: { search?: string } = {};
        if (inputValue?.trim()) {
          params.search = inputValue.trim();
        }

        const productsData = await commonService.getProductsForDropdown(params);

        const options = productsData.map((product: Product) => ({
          value: product.id,
          label: product.name,
        }));

        // Cache default options for initial load
        if (!inputValue && defaultProductOptions.length === 0) {
          setDefaultProductOptions(options);
        }

        return options;
      } catch (error) {
        console.error(ERROR_MESSAGES.LOAD_PRODUCTS_FAILED, error);
        return [];
      }
    },
    [defaultProductOptions]
  );

  /**
   * Fetch variations for a specific product
   */
  const fetchVariations = useCallback(async (productId: string) => {
    try {
      const response: any = await productVariationService.getVariations({
        per_page: 50,
        product_id: productId,
      });

      const list = response?.data || response || [];
      const items = Array.isArray(list) ? list : list.data || [];

      const options = items.map((variation: any) => ({
        value: variation.id || variation.uuid,
        label: variation.name || variation.sku || variation.id,
      }));

      setVariationOptions(options);
    } catch (error) {
      console.error('Failed to load variations:', error);
      setVariationOptions([]);
    }
  }, []);

  /**
   * Handle product selection change
   */
  const handleProductChange = useCallback(
    (option: SelectOption | null) => {
      setSelectedProduct(option);
      setSelectedVariation(null);
      setVariationOptions([]);

      if (option?.value) {
        fetchVariations(option.value);
      }
    },
    [fetchVariations]
  );

  /**
   * Handle variation selection change
   */
  const handleVariationChange = useCallback((option: SelectOption | null) => {
    setSelectedVariation(option);
  }, []);

  /**
   * Reset all selections
   */
  const resetSelections = useCallback(() => {
    setSelectedProduct(null);
    setSelectedVariation(null);
    setVariationOptions([]);
  }, []);

  // Load variations when initial product ID is provided
  useEffect(() => {
    if (initialProductId) {
      fetchVariations(initialProductId);
    }
  }, [initialProductId, fetchVariations]);

  return {
    selectedProduct,
    selectedVariation,
    variationOptions,
    loadProductOptions,
    handleProductChange,
    handleVariationChange,
    resetSelections,
  };
}
