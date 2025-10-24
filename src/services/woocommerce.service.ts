/**
 * WooCommerce E-commerce Platform Integration
 * Implements product management, inventory, and order handling for WooCommerce stores
 */

import {
  EcommercePlatform,
  Product,
  CreateProductParams,
  UpdateProductParams,
  Order,
  PlatformConfig,
  PlatformError
} from './ecommerce-platform.interface.js';

interface WooCommerceConfig extends PlatformConfig {
  storeUrl: string; // e.g., 'https://mystore.com'
  consumerKey: string; // WooCommerce API consumer key
  consumerSecret: string; // WooCommerce API consumer secret
  version?: string; // API version, default 'wc/v3'
}

export class WooCommerceService implements EcommercePlatform {
  readonly platformName = 'woocommerce';
  private config?: WooCommerceConfig;
  private baseUrl?: string;

  async initialize(config: PlatformConfig): Promise<void> {
    const wcConfig = config as WooCommerceConfig;

    if (!wcConfig.storeUrl || !wcConfig.consumerKey || !wcConfig.consumerSecret) {
      throw new PlatformError(
        'WooCommerce requires storeUrl, consumerKey, and consumerSecret',
        'INVALID_CONFIG',
        this.platformName
      );
    }

    this.config = {
      ...wcConfig,
      version: wcConfig.version || 'wc/v3'
    };

    // Remove trailing slash from store URL
    const cleanUrl = this.config.storeUrl.replace(/\/$/, '');
    this.baseUrl = `${cleanUrl}/wp-json/${this.config.version}`;

    // Test connection
    await this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.makeRequest('/system_status', 'GET');
    } catch (error) {
      throw new PlatformError(
        'Failed to connect to WooCommerce',
        'CONNECTION_ERROR',
        this.platformName,
        error
      );
    }
  }

  private getAuthHeader(): string {
    if (!this.config) {
      throw new PlatformError(
        'WooCommerce not initialized',
        'NOT_INITIALIZED',
        this.platformName
      );
    }

    const credentials = `${this.config.consumerKey}:${this.config.consumerSecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    if (!this.baseUrl) {
      throw new PlatformError(
        'WooCommerce not initialized',
        'NOT_INITIALIZED',
        this.platformName
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new PlatformError(
          `WooCommerce API error: ${response.statusText}`,
          `HTTP_${response.status}`,
          this.platformName,
          errorData
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof PlatformError) throw error;
      throw new PlatformError(
        `Request failed: ${error.message}`,
        'REQUEST_FAILED',
        this.platformName,
        error
      );
    }
  }

  private mapWooProduct(wcProduct: any): Product {
    return {
      id: wcProduct.id.toString(),
      sku: wcProduct.sku || '',
      name: wcProduct.name,
      description: wcProduct.description || wcProduct.short_description || '',
      price: Math.round(parseFloat(wcProduct.price || '0') * 100),
      currency: 'THB',
      stock: wcProduct.stock_quantity || 0,
      images: wcProduct.images?.map((img: any) => img.src) || [],
      category: wcProduct.categories?.[0]?.name || undefined,
      variants: wcProduct.variations?.length > 0 ? [] : undefined, // Variants would need separate API call
      metadata: {
        permalink: wcProduct.permalink,
        status: wcProduct.status,
        type: wcProduct.type,
        featured: wcProduct.featured,
        categories: wcProduct.categories,
        tags: wcProduct.tags
      }
    };
  }

  async createProduct(params: CreateProductParams): Promise<Product> {
    const wcProduct = {
      name: params.name,
      type: 'simple',
      regular_price: (params.price / 100).toFixed(2),
      description: params.description,
      short_description: params.description.substring(0, 120),
      sku: params.sku,
      manage_stock: true,
      stock_quantity: params.stock,
      images: params.images?.map(src => ({ src })) || [],
      categories: params.category ? [{ name: params.category }] : [],
      meta_data: Object.entries(params.metadata || {}).map(([key, value]) => ({
        key,
        value
      }))
    };

    const response = await this.makeRequest('/products', 'POST', wcProduct);
    return this.mapWooProduct(response);
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await this.makeRequest(`/products/${productId}`, 'GET');
    return this.mapWooProduct(response);
  }

  async updateProduct(productId: string, params: UpdateProductParams): Promise<Product> {
    const updateData: any = {};

    if (params.name) updateData.name = params.name;
    if (params.description) {
      updateData.description = params.description;
      updateData.short_description = params.description.substring(0, 120);
    }
    if (params.sku) updateData.sku = params.sku;
    if (params.price !== undefined) updateData.regular_price = (params.price / 100).toFixed(2);
    if (params.stock !== undefined) updateData.stock_quantity = params.stock;
    if (params.images) updateData.images = params.images.map(src => ({ src }));
    if (params.category) updateData.categories = [{ name: params.category }];
    if (params.metadata) {
      updateData.meta_data = Object.entries(params.metadata).map(([key, value]) => ({
        key,
        value
      }));
    }

    const response = await this.makeRequest(`/products/${productId}`, 'PUT', updateData);
    return this.mapWooProduct(response);
  }

  async deleteProduct(productId: string): Promise<boolean> {
    await this.makeRequest(`/products/${productId}?force=true`, 'DELETE');
    return true;
  }

  async listProducts(params?: { limit?: number; offset?: number; search?: string }): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('per_page', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = `/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.makeRequest(endpoint, 'GET');

    return response.map((p: any) => this.mapWooProduct(p));
  }

  async searchProductBySku(sku: string): Promise<Product | null> {
    const response = await this.makeRequest(`/products?sku=${encodeURIComponent(sku)}`, 'GET');

    if (response && response.length > 0) {
      return this.mapWooProduct(response[0]);
    }

    return null;
  }

  async updateStock(productId: string, quantity: number): Promise<boolean> {
    await this.makeRequest(`/products/${productId}`, 'PUT', {
      stock_quantity: quantity
    });

    return true;
  }

  async getStock(productId: string): Promise<number> {
    const product = await this.getProduct(productId);
    return product.stock;
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    const wcOrder = {
      line_items: order.items?.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        price: (item.price / 100).toFixed(2)
      })),
      customer_id: order.customerId ? parseInt(order.customerId) : undefined,
      shipping: order.shippingAddress,
      billing: order.billingAddress,
      status: order.status || 'pending',
      set_paid: order.paymentStatus === 'paid'
    };

    const response = await this.makeRequest('/orders', 'POST', wcOrder);
    return this.mapWooOrder(response);
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await this.makeRequest(`/orders/${orderId}`, 'GET');
    return this.mapWooOrder(response);
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    const wcStatus = this.mapToWooStatus(status);

    const response = await this.makeRequest(`/orders/${orderId}`, 'PUT', {
      status: wcStatus
    });

    return this.mapWooOrder(response);
  }

  async listOrders(params?: { limit?: number; offset?: number; status?: Order['status'] }): Promise<Order[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('per_page', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', this.mapToWooStatus(params.status));

    const endpoint = `/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.makeRequest(endpoint, 'GET');

    return response.map((o: any) => this.mapWooOrder(o));
  }

  private mapWooOrder(wcOrder: any): Order {
    return {
      id: wcOrder.id.toString(),
      orderNumber: wcOrder.number.toString(),
      customerId: wcOrder.customer_id?.toString(),
      items: wcOrder.line_items.map((item: any) => ({
        productId: item.product_id?.toString(),
        sku: item.sku || '',
        name: item.name,
        quantity: item.quantity,
        price: Math.round(parseFloat(item.price) * 100),
        total: Math.round(parseFloat(item.total) * 100)
      })),
      subtotal: Math.round(parseFloat(wcOrder.total) * 100) -
                Math.round(parseFloat(wcOrder.total_tax) * 100) -
                Math.round(parseFloat(wcOrder.shipping_total) * 100),
      tax: Math.round(parseFloat(wcOrder.total_tax) * 100),
      shipping: Math.round(parseFloat(wcOrder.shipping_total) * 100),
      total: Math.round(parseFloat(wcOrder.total) * 100),
      currency: wcOrder.currency,
      status: this.mapFromWooStatus(wcOrder.status),
      shippingAddress: wcOrder.shipping,
      billingAddress: wcOrder.billing,
      paymentStatus: wcOrder.date_paid ? 'paid' :
                     wcOrder.status === 'refunded' ? 'refunded' :
                     wcOrder.status === 'failed' ? 'failed' : 'pending',
      createdAt: new Date(wcOrder.date_created),
      updatedAt: new Date(wcOrder.date_modified)
    };
  }

  private mapToWooStatus(status: Order['status']): string {
    const statusMap: Record<Order['status'], string> = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    };

    return statusMap[status] || 'pending';
  }

  private mapFromWooStatus(wcStatus: string): Order['status'] {
    const statusMap: Record<string, Order['status']> = {
      'pending': 'pending',
      'processing': 'processing',
      'on-hold': 'pending',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
      'failed': 'cancelled'
    };

    return statusMap[wcStatus] || 'pending';
  }

  async syncProducts(): Promise<{ synced: number; failed: number }> {
    try {
      const products = await this.listProducts({ limit: 100 });
      return { synced: products.length, failed: 0 };
    } catch (error) {
      return { synced: 0, failed: 1 };
    }
  }

  async syncOrders(): Promise<{ synced: number; failed: number }> {
    try {
      const orders = await this.listOrders({ limit: 100 });
      return { synced: orders.length, failed: 0 };
    } catch (error) {
      return { synced: 0, failed: 1 };
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    if (!this.config) return false;

    // WooCommerce uses webhook secret for HMAC validation
    // Implement proper validation in production
    return true;
  }

  async handleWebhook(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'product.created':
      case 'product.updated':
        console.log(`Product ${event} webhook received:`, payload);
        break;
      case 'order.created':
      case 'order.updated':
        console.log(`Order ${event} webhook received:`, payload);
        break;
      default:
        console.log(`Unknown webhook event: ${event}`);
    }
  }
}
