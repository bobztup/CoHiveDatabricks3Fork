/**
 * Brand-Category Mapping Configuration
 * 
 * Defines which brands belong to which categories.
 * This is used to determine file visibility:
 * - General files: visible to ALL brands
 * - Category files: visible to ALL brands in that category
 * - Brand files: visible only to that specific brand
 */

export interface CategoryConfig {
  categoryName: string;
  brands: string[];
}

export const categoryBrandMapping: CategoryConfig[] = [
  {
    categoryName: 'Running Shoes',
    brands: ['Nike', 'Adidas', 'Puma', 'New Balance', 'Under Armour', 'Brooks', 'Asics', 'Saucony', 'Hoka']
  },
  {
    categoryName: 'Basketball',
    brands: ['Nike', 'Adidas', 'Under Armour', 'Puma', 'New Balance']
  },
  {
    categoryName: 'Athletic Apparel',
    brands: ['Nike', 'Adidas', 'Under Armour', 'Puma', 'Lululemon', 'Reebok']
  },
  {
    categoryName: 'Lifestyle Footwear',
    brands: ['Nike', 'Adidas', 'Puma', 'New Balance', 'Vans', 'Converse', 'Reebok']
  },
  {
    categoryName: 'Training & Gym',
    brands: ['Nike', 'Adidas', 'Under Armour', 'Reebok', 'Lululemon']
  },
  {
    categoryName: 'Soccer/Football',
    brands: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'New Balance']
  },
  {
    categoryName: 'Tennis',
    brands: ['Nike', 'Adidas', 'New Balance', 'Asics']
  },
  {
    categoryName: 'Golf',
    brands: ['Nike', 'Adidas', 'Under Armour', 'Puma', 'FootJoy', 'Callaway']
  },
  {
    categoryName: 'Outdoor & Hiking',
    brands: ['Nike', 'Adidas', 'New Balance', 'Merrell', 'Columbia', 'Salomon']
  },
  {
    categoryName: 'Kids & Youth',
    brands: ['Nike', 'Adidas', 'Puma', 'New Balance', 'Under Armour', 'Reebok']
  }
];

/**
 * Get all brands for a given category
 */
export function getBrandsInCategory(categoryName: string): string[] {
  const category = categoryBrandMapping.find(
    c => c.categoryName.toLowerCase() === categoryName.toLowerCase()
  );
  return category ? category.brands : [];
}

/**
 * Get all categories that contain a given brand
 */
export function getCategoriesForBrand(brandName: string): string[] {
  return categoryBrandMapping
    .filter(category => 
      category.brands.some(b => b.toLowerCase() === brandName.toLowerCase())
    )
    .map(category => category.categoryName);
}

/**
 * Check if a brand belongs to a specific category
 */
export function isBrandInCategory(brandName: string, categoryName: string): boolean {
  const brands = getBrandsInCategory(categoryName);
  return brands.some(b => b.toLowerCase() === brandName.toLowerCase());
}

/**
 * Get all unique brands across all categories
 */
export function getAllBrands(): string[] {
  const allBrands = new Set<string>();
  categoryBrandMapping.forEach(category => {
    category.brands.forEach(brand => allBrands.add(brand));
  });
  return Array.from(allBrands).sort();
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return categoryBrandMapping.map(c => c.categoryName).sort();
}
