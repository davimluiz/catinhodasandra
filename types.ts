export enum PaymentMethod {
  PIX = 'PIX',
  CASH = 'Dinheiro',
  CARD = 'Cartão',
}

export enum OrderStatus {
  PENDING = 'Pendente',
  COMPLETED = 'Concluído',
  CANCELLED = 'Cancelado',
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  name: string;
  address: string;
  reference: string;
  phone: string;
  paymentMethod: PaymentMethod;
}

export interface Order {
  id: string;
  customer: Customer;
  items: CartItem[];
  total: number;
  date: string; // ISO string
  status: OrderStatus;
}

export type ScreenName = 'HOME' | 'CUSTOMER_FORM' | 'MENU' | 'SUMMARY' | 'ORDER_HISTORY';