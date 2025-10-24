/**
 * E-commerce Platform Integration Interface
 * Base interface for integrating with various e-commerce platforms
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number; // in smallest currency unit (e.g., cents)
  currency: string;
  stock: number;
  images?: string[];
  category?: string;
  variants?: ProductVariant[];
  metadata?: Record<string, any>;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>; // e.g., { color: 'red', size: 'M' }
}

export interface CreateProductParams {
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  images?: string[];
  category?: string;
  variants?: Omit<ProductVariant, 'id'>[];
  metadata?: Record<string, any>;
}

export interface UpdateProductParams {
  sku?: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  images?: string[];
  category?: string;
  metadata?: Record<string, any>;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  shippingAddress?: Address;
  billingAddress?: Address;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface PlatformConfig {
  apiKey?: string;
  apiSecret?: string;
  shopDomain?: string;
  storeUrl?: string;
  consumerKey?: string;
  consumerSecret?: string;
  accessToken?: string;
}

/**
 * Base interface that all e-commerce platform integrations must implement
 */
export interface EcommercePlatform {
  /**
   * Platform name (e.g., 'shopify', 'woocommerce', 'magento')
   */
  readonly platformName: string;

  /**
   * Initialize the platform connection
   */
  initialize(config: PlatformConfig): Promise<void>;

  /**
   * Product Management
   */
  createProduct(params: CreateProductParams): Promise<Product>;
  getProduct(productId: string): Promise<Product>;
  updateProduct(productId: string, params: UpdateProductParams): Promise<Product>;
  deleteProduct(productId: string): Promise<boolean>;
  listProducts(params?: { limit?: number; offset?: number; search?: string }): Promise<Product[]>;
  searchProductBySku(sku: string): Promise<Product | null>;

  /**
   * Inventory Management
   */
  updateStock(productId: string, quantity: number): Promise<boolean>;
  getStock(productId: string): Promise<number>;

  /**
   * Order Management
   */
  createOrder(order: Partial<Order>): Promise<Order>;
  getOrder(orderId: string): Promise<Order>;
  updateOrderStatus(orderId: string, status: Order['status']): Promise<Order>;
  listOrders(params?: { limit?: number; offset?: number; status?: Order['status'] }): Promise<Order[]>;

  /**
   * Sync operations
   */
  syncProducts(): Promise<{ synced: number; failed: number }>;
  syncOrders(): Promise<{ synced: number; failed: number }>;

  /**
   * Webhook support
   */
  validateWebhook?(payload: any, signature: string): boolean;
  handleWebhook?(event: string, payload: any): Promise<void>;
}

export class PlatformError extends Error {
  constructor(
    message: string,
    public code: string,
    public platform: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}
