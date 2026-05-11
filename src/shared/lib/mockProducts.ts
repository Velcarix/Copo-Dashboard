// Mock products for local development and demo presentations — never imported in production
import { ProductCategory, ModifierInputType } from '@shared-types'
import type { ProductWithModifiers } from '@/shared/store/posStore'

export const MOCK_PRODUCTS: ProductWithModifiers[] = [
  // ─── HELADOS ───────────────────────────────────────────────────────────────
  {
    id: 'p-hel-01', name: 'Vainilla', category: ProductCategory.ICE_CREAM,
    basePrice: 3500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-hel-02', name: 'Chocolate', category: ProductCategory.ICE_CREAM,
    basePrice: 3500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-hel-03', name: 'Fresa', category: ProductCategory.ICE_CREAM,
    basePrice: 3500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-hel-04', name: 'Pistache', category: ProductCategory.ICE_CREAM,
    basePrice: 3800, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-hel-05', name: 'Mango con Chile', category: ProductCategory.ICE_CREAM,
    basePrice: 4000, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-hel-06', name: 'Mamey', category: ProductCategory.ICE_CREAM,
    basePrice: 4000, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-hel-07', name: 'Copa Especial', category: ProductCategory.ICE_CREAM,
    basePrice: 5500, imageUrl: null, active: true,
    modifierGroups: [
      {
        id: 'g-copa-tam', productId: 'p-hel-07', name: 'Tamaño', required: true,
        inputType: ModifierInputType.SIZE, multiple: false, sortOrder: 0,
        options: [
          { id: 'o-copa-tam-1', groupId: 'g-copa-tam', name: 'Chica',   priceDelta: 0,    sortOrder: 0, isDefault: true, description: '1 bola' },
          { id: 'o-copa-tam-2', groupId: 'g-copa-tam', name: 'Mediana', priceDelta: 2000, sortOrder: 1, description: '2 bolas' },
          { id: 'o-copa-tam-3', groupId: 'g-copa-tam', name: 'Grande',  priceDelta: 4000, sortOrder: 2, description: '3 bolas' },
        ],
      },
      {
        id: 'g-copa-sab', productId: 'p-hel-07', name: 'Sabor', required: true,
        inputType: ModifierInputType.SELECT, multiple: true, sortOrder: 1,
        options: [
          { id: 'o-copa-sab-1', groupId: 'g-copa-sab', name: 'Vainilla',         priceDelta: 0, sortOrder: 0, isDefault: true },
          { id: 'o-copa-sab-2', groupId: 'g-copa-sab', name: 'Chocolate',        priceDelta: 0, sortOrder: 1 },
          { id: 'o-copa-sab-3', groupId: 'g-copa-sab', name: 'Fresa',            priceDelta: 0, sortOrder: 2 },
          { id: 'o-copa-sab-4', groupId: 'g-copa-sab', name: 'Pistache',         priceDelta: 300, sortOrder: 3 },
          { id: 'o-copa-sab-5', groupId: 'g-copa-sab', name: 'Mango con Chile',  priceDelta: 300, sortOrder: 4 },
          { id: 'o-copa-sab-6', groupId: 'g-copa-sab', name: 'Mamey',            priceDelta: 300, sortOrder: 5 },
        ],
      },
    ],
  },
  {
    id: 'p-hel-08', name: 'Sundae', category: ProductCategory.ICE_CREAM,
    basePrice: 5500, imageUrl: null, active: true,
    modifierGroups: [
      {
        id: 'g-sun-sab', productId: 'p-hel-08', name: 'Sabor de Helado', required: true,
        inputType: ModifierInputType.SELECT, multiple: false, sortOrder: 0,
        options: [
          { id: 'o-sun-sab-1', groupId: 'g-sun-sab', name: 'Vainilla',  priceDelta: 0, sortOrder: 0, isDefault: true },
          { id: 'o-sun-sab-2', groupId: 'g-sun-sab', name: 'Chocolate', priceDelta: 0, sortOrder: 1 },
          { id: 'o-sun-sab-3', groupId: 'g-sun-sab', name: 'Fresa',     priceDelta: 0, sortOrder: 2 },
        ],
      },
      {
        id: 'g-sun-top', productId: 'p-hel-08', name: 'Topping', required: false,
        inputType: ModifierInputType.SELECT, multiple: true, sortOrder: 1,
        options: [
          { id: 'o-sun-top-1', groupId: 'g-sun-top', name: 'Caramelo',  priceDelta: 500, sortOrder: 0 },
          { id: 'o-sun-top-2', groupId: 'g-sun-top', name: 'Chocolate', priceDelta: 500, sortOrder: 1 },
          { id: 'o-sun-top-3', groupId: 'g-sun-top', name: 'Cajeta',    priceDelta: 500, sortOrder: 2 },
          { id: 'o-sun-top-4', groupId: 'g-sun-top', name: 'Nuez',      priceDelta: 500, sortOrder: 3 },
        ],
      },
    ],
  },
  {
    id: 'p-hel-09', name: 'Malteada', category: ProductCategory.ICE_CREAM,
    basePrice: 6500, imageUrl: null, active: true,
    modifierGroups: [
      {
        id: 'g-mal-sab', productId: 'p-hel-09', name: 'Sabor', required: true,
        inputType: ModifierInputType.SELECT, multiple: false, sortOrder: 0,
        options: [
          { id: 'o-mal-sab-1', groupId: 'g-mal-sab', name: 'Vainilla',  priceDelta: 0, sortOrder: 0, isDefault: true },
          { id: 'o-mal-sab-2', groupId: 'g-mal-sab', name: 'Chocolate', priceDelta: 0, sortOrder: 1 },
          { id: 'o-mal-sab-3', groupId: 'g-mal-sab', name: 'Fresa',     priceDelta: 0, sortOrder: 2 },
          { id: 'o-mal-sab-4', groupId: 'g-mal-sab', name: 'Oreo',      priceDelta: 500, sortOrder: 3 },
          { id: 'o-mal-sab-5', groupId: 'g-mal-sab', name: 'Mango',     priceDelta: 500, sortOrder: 4 },
        ],
      },
    ],
  },
  {
    id: 'p-hel-10', name: 'Wafle con Helado', category: ProductCategory.ICE_CREAM,
    basePrice: 7000, imageUrl: null, active: true,
    modifierGroups: [
      {
        id: 'g-waf-sab', productId: 'p-hel-10', name: 'Sabor de Helado', required: true,
        inputType: ModifierInputType.SELECT, multiple: false, sortOrder: 0,
        options: [
          { id: 'o-waf-sab-1', groupId: 'g-waf-sab', name: 'Vainilla',  priceDelta: 0, sortOrder: 0, isDefault: true },
          { id: 'o-waf-sab-2', groupId: 'g-waf-sab', name: 'Chocolate', priceDelta: 0, sortOrder: 1 },
          { id: 'o-waf-sab-3', groupId: 'g-waf-sab', name: 'Fresa',     priceDelta: 0, sortOrder: 2 },
          { id: 'o-waf-sab-4', groupId: 'g-waf-sab', name: 'Mamey',     priceDelta: 300, sortOrder: 3 },
        ],
      },
    ],
  },

  // ─── CAFÉ ──────────────────────────────────────────────────────────────────
  {
    id: 'p-caf-01', name: 'Café de Olla', category: ProductCategory.COFFEE,
    basePrice: 3500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-caf-02', name: 'Americano', category: ProductCategory.COFFEE,
    basePrice: 4000, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-caf-03', name: 'Cappuccino', category: ProductCategory.COFFEE,
    basePrice: 5000, imageUrl: null, active: true,
    modifierGroups: [
      {
        id: 'g-cap-tmp', productId: 'p-caf-03', name: 'Temperatura', required: true,
        inputType: ModifierInputType.SELECT, multiple: false, sortOrder: 0,
        options: [
          { id: 'o-cap-tmp-1', groupId: 'g-cap-tmp', name: 'Caliente', priceDelta: 0,   sortOrder: 0, isDefault: true },
          { id: 'o-cap-tmp-2', groupId: 'g-cap-tmp', name: 'Frío',     priceDelta: 500, sortOrder: 1 },
        ],
      },
    ],
  },
  {
    id: 'p-caf-04', name: 'Latte', category: ProductCategory.COFFEE,
    basePrice: 5500, imageUrl: null, active: true,
    modifierGroups: [
      {
        id: 'g-lat-tmp', productId: 'p-caf-04', name: 'Temperatura', required: true,
        inputType: ModifierInputType.SELECT, multiple: false, sortOrder: 0,
        options: [
          { id: 'o-lat-tmp-1', groupId: 'g-lat-tmp', name: 'Caliente', priceDelta: 0,   sortOrder: 0, isDefault: true },
          { id: 'o-lat-tmp-2', groupId: 'g-lat-tmp', name: 'Frío',     priceDelta: 500, sortOrder: 1 },
        ],
      },
      {
        id: 'g-lat-lec', productId: 'p-caf-04', name: 'Leche', required: false,
        inputType: ModifierInputType.SELECT, multiple: false, sortOrder: 1,
        options: [
          { id: 'o-lat-lec-1', groupId: 'g-lat-lec', name: 'Entera',        priceDelta: 0,    sortOrder: 0, isDefault: true },
          { id: 'o-lat-lec-2', groupId: 'g-lat-lec', name: 'Deslactosada',  priceDelta: 0,    sortOrder: 1 },
          { id: 'o-lat-lec-3', groupId: 'g-lat-lec', name: 'De Avena',      priceDelta: 1000, sortOrder: 2 },
          { id: 'o-lat-lec-4', groupId: 'g-lat-lec', name: 'De Almendra',   priceDelta: 1000, sortOrder: 3 },
        ],
      },
    ],
  },
  {
    id: 'p-caf-05', name: 'Frappé', category: ProductCategory.COFFEE,
    basePrice: 6000, imageUrl: null, active: true,
    modifierGroups: [
      {
        id: 'g-fra-sab', productId: 'p-caf-05', name: 'Sabor', required: true,
        inputType: ModifierInputType.SELECT, multiple: false, sortOrder: 0,
        options: [
          { id: 'o-fra-sab-1', groupId: 'g-fra-sab', name: 'Caramelo',  priceDelta: 0, sortOrder: 0, isDefault: true },
          { id: 'o-fra-sab-2', groupId: 'g-fra-sab', name: 'Moca',      priceDelta: 0, sortOrder: 1 },
          { id: 'o-fra-sab-3', groupId: 'g-fra-sab', name: 'Vainilla',  priceDelta: 0, sortOrder: 2 },
          { id: 'o-fra-sab-4', groupId: 'g-fra-sab', name: 'Oreo',      priceDelta: 500, sortOrder: 3 },
          { id: 'o-fra-sab-5', groupId: 'g-fra-sab', name: 'Matcha',    priceDelta: 500, sortOrder: 4 },
        ],
      },
    ],
  },
  {
    id: 'p-caf-06', name: 'Macchiato', category: ProductCategory.COFFEE,
    basePrice: 5500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-caf-07', name: 'Mocha', category: ProductCategory.COFFEE,
    basePrice: 6000, imageUrl: null, active: true, modifierGroups: [],
  },

  // ─── PASTELERÍA ────────────────────────────────────────────────────────────
  {
    id: 'p-pas-01', name: 'Croissant', category: ProductCategory.PASTRY,
    basePrice: 3000, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-pas-02', name: 'Pay de Queso', category: ProductCategory.PASTRY,
    basePrice: 4500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-pas-03', name: 'Brownie', category: ProductCategory.PASTRY,
    basePrice: 3500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-pas-04', name: 'Cheesecake de Fresa', category: ProductCategory.PASTRY,
    basePrice: 5000, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-pas-05', name: 'Pastel de Chocolate', category: ProductCategory.PASTRY,
    basePrice: 4500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-pas-06', name: 'Churros', category: ProductCategory.PASTRY,
    basePrice: 4000, imageUrl: null, active: true,
    modifierGroups: [
      {
        id: 'g-chu-dip', productId: 'p-pas-06', name: 'Dip', required: true,
        inputType: ModifierInputType.SELECT, multiple: false, sortOrder: 0,
        options: [
          { id: 'o-chu-dip-1', groupId: 'g-chu-dip', name: 'Chocolate', priceDelta: 0, sortOrder: 0, isDefault: true },
          { id: 'o-chu-dip-2', groupId: 'g-chu-dip', name: 'Cajeta',    priceDelta: 0, sortOrder: 1 },
          { id: 'o-chu-dip-3', groupId: 'g-chu-dip', name: 'Nata',      priceDelta: 0, sortOrder: 2 },
        ],
      },
    ],
  },

  // ─── COMBOS ────────────────────────────────────────────────────────────────
  {
    id: 'p-com-01', name: 'Combo Café + Helado', category: ProductCategory.COMBO,
    basePrice: 7500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-com-02', name: 'Combo Malteada + Brownie', category: ProductCategory.COMBO,
    basePrice: 8500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-com-03', name: 'Combo Familiar', category: ProductCategory.COMBO,
    basePrice: 12000, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-com-04', name: 'Desayuno Dulce', category: ProductCategory.COMBO,
    basePrice: 7000, imageUrl: null, active: true, modifierGroups: [],
  },

  // ─── BEBIDAS ───────────────────────────────────────────────────────────────
  {
    id: 'p-bev-01', name: 'Agua Natural', category: ProductCategory.BEVERAGE,
    basePrice: 2000, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-bev-02', name: 'Refresco', category: ProductCategory.BEVERAGE,
    basePrice: 2500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-bev-03', name: 'Agua de Jamaica', category: ProductCategory.BEVERAGE,
    basePrice: 3000, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-bev-04', name: 'Leche con Chocolate', category: ProductCategory.BEVERAGE,
    basePrice: 3500, imageUrl: null, active: true, modifierGroups: [],
  },

  // ─── SNACKS ────────────────────────────────────────────────────────────────
  {
    id: 'p-snk-01', name: 'Fruta con Chile', category: ProductCategory.SNACK,
    basePrice: 3500, imageUrl: null, active: true, modifierGroups: [],
  },
  {
    id: 'p-snk-02', name: 'Nachos con Queso', category: ProductCategory.SNACK,
    basePrice: 4500, imageUrl: null, active: true, modifierGroups: [],
  },
]
