import { Product } from './types';

export const MENU_ITEMS: Product[] = [
  // Hambúrgueres
  { id: '1', name: 'X-Burguer', price: 18.00, category: 'Hambúrgueres' },
  { id: '2', name: 'X-Salada', price: 22.00, category: 'Hambúrgueres' },
  { id: '3', name: 'X-Bacon', price: 25.00, category: 'Hambúrgueres' },
  
  // Bebidas
  { id: '4', name: 'Coca-Cola Lata', price: 6.00, category: 'Bebidas' },
  { id: '5', name: 'Guaraná Ant. Lata', price: 6.00, category: 'Bebidas' },
  { id: '6', name: 'Suco de Laranja', price: 10.00, category: 'Bebidas' },

  // Porções
  { id: '7', name: 'Batata Frita P', price: 15.00, category: 'Porções' },
  { id: '8', name: 'Batata Frita G', price: 28.00, category: 'Porções' },
];

export const CATEGORIES = [
  'Hambúrgueres',
  'Bebidas',
  'Porções',
];

export const APP_NAME = "Cantinho da Sandra";