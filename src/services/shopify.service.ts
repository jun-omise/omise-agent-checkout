/**
 * Shopify E-commerce Platform Integration
 * Implements product management, inventory, and order handling for Shopify stores
 */

import {
  EcommercePlatform,
  Product,
  CreateProductParams,
  UpdateProductParams,
  Order,
  PlatformConfig,
  PlatformError,
  ProductVariant
} from './ecommerce-platform.interface.js';

interface ShopifyConfig extends PlatformConfig {
  shopDomain: string; // e.g., 'mystore.myshopify.com'
  accessToken: string; // Admin API access token
  apiVersion?: string; // e.g., '2024-01'
}

export class ShopifyService implements EcommercePlatform {
  readonly platformName = 'shopify';
  private config?: ShopifyConfig;
  private baseUrl?: string;

  async initialize(config: PlatformConfig): Promise<void> {
    const shopifyConfig = config as ShopifyConfig;

    if (!shopifyConfig.shopDomain || !shopifyConfig.accessToken) {
      throw new PlatformError(
        'Shopify requires shopDomain and accessToken',
        'INVALID_CONFIG',
        this.platformName
      );
    }

    this.config = {
      ...shopifyConfig,
      apiVersion: shopifyConfig.apiVersion || '2024-01'
    };

    this.baseUrl = `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}`;

    // Test connection
    await this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.makeRequest('/shop.json', 'GET');
    } catch (error) {
      throw new PlatformError(
        'Failed to connect to Shopify',
        'CONNECTION_ERROR',
        this.platformName,
        error
      );
    }
  }

  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    if (!this.config || !this.baseUrl) {
      throw new PlatformError(
        'Shopify not initialized',
        'NOT_INITIALIZED',
        this.platformName
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'X-Shopify-Access-Token': this.config.accessToken,
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
          `Shopify API error: ${response.statusText}`,
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

  private mapShopifyProduct(shopifyProduct: any): Product {
    return {
      id: shopifyProduct.id.toString(),
      sku: shopifyProduct.variants?.[0]?.sku || '',
      name: shopifyProduct.title,
      description: shopifyProduct.body_html || '',
      price: Math.round(parseFloat(shopifyProduct.variants?.[0]?.price || '0') * 100),
      currency: 'THB', // You can get this from shop settings
      stock: shopifyProduct.variants?.[0]?.inventory_quantity || 0,
      images: shopifyProduct.images?.map((img: any) => img.src) || [],
      category: shopifyProduct.product_type || undefined,
      variants: shopifyProduct.variants?.map((v: any) => ({
        id: v.id.toString(),
        sku: v.sku || '',
        name: v.title,
        price: Math.round(parseFloat(v.price) * 100),
        stock: v.inventory_quantity || 0,
        attributes: {
          ...(v.option1 && { option1: v.option1 }),
          ...(v.option2 && { option2: v.option2 }),
          ...(v.option3 && { option3: v.option3 })
        }
      })),
      metadata: {
        vendor: shopifyProduct.vendor,
        tags: shopifyProduct.tags,
        handle: shopifyProduct.handle
      }
    };
  }

  async createProduct(params: CreateProductParams): Promise<Product> {
    const shopifyProduct = {
      product: {
        title: params.name,
        body_html: params.description,
        vendor: params.metadata?.vendor || 'Default',
        product_type: params.category || '',
        tags: params.metadata?.tags || [],
        variants: [
          {
            sku: params.sku,
            price: (params.price / 100).toFixed(2),
            inventory_quantity: params.stock,
            inventory_management: 'shopify'
          }
        ],
        images: params.images?.map(src => ({ src })) || []
      }
    };

    const response = await this.makeRequest('/products.json', 'POST', shopifyProduct);
    return this.mapShopifyProduct(response.product);
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await this.makeRequest(`/products/${productId}.json`, 'GET');
    return this.mapShopifyProduct(response.product);
  }

  async updateProduct(productId: string, params: UpdateProductParams): Promise<Product> {
    const updateData: any = {
      product: {
        id: productId
      }
    };

    if (params.name) updateData.product.title = params.name;
    if (params.description) updateData.product.body_html = params.description;
    if (params.category) updateData.product.product_type = params.category;
    if (params.images) updateData.product.images = params.images.map(src => ({ src }));

    // For SKU, price, and stock updates, we need to update the variant
    if (params.sku || params.price !== undefined || params.stock !== undefined) {
      const product = await this.getProduct(productId);
      const variantId = product.variants?.[0]?.id;

      if (variantId) {
        const variantData: any = { variant: { id: variantId } };
        if (params.sku) variantData.variant.sku = params.sku;
        if (params.price !== undefined) variantData.variant.price = (params.price / 100).toFixed(2);
        if (params.stock !== undefined) variantData.variant.inventory_quantity = params.stock;

        await this.makeRequest(`/variants/${variantId}.json`, 'PUT', variantData);
      }
    }

    const response = await this.makeRequest(`/products/${productId}.json`, 'PUT', updateData);
    return this.mapShopifyProduct(response.product);
  }

  async deleteProduct(productId: string): Promise<boolean> {
    await this.makeRequest(`/products/${productId}.json`, 'DELETE');
    return true;
  }

  async listProducts(params?: { limit?: number; offset?: number; search?: string }): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('title', params.search);

    const endpoint = `/products.json${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.makeRequest(endpoint, 'GET');

    return response.products.map((p: any) => this.mapShopifyProduct(p));
  }

  async searchProductBySku(sku: string): Promise<Product | null> {
    const products = await this.listProducts({ limit: 250 });
    const found = products.find(p => p.sku === sku || p.variants?.some(v => v.sku === sku));
    return found || null;
  }

  async updateStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.getProduct(productId);
    const variantId = product.variants?.[0]?.id;

    if (!variantId) {
      throw new PlatformError(
        'No variant found for product',
        'NO_VARIANT',
        this.platformName
      );
    }

    await this.makeRequest(`/variants/${variantId}.json`, 'PUT', {
      variant: {
        id: variantId,
        inventory_quantity: quantity
      }
    });

    return true;
  }

  async getStock(productId: string): Promise<number> {
    const product = await this.getProduct(productId);
    return product.stock;
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    const shopifyOrder = {
      order: {
        line_items: order.items?.map(item => ({
          variant_id: item.productId,
          quantity: item.quantity,
          price: (item.price / 100).toFixed(2)
        })),
        customer: order.customerId ? { id: order.customerId } : undefined,
        shipping_address: order.shippingAddress,
        billing_address: order.billingAddress,
        financial_status: order.paymentStatus === 'paid' ? 'paid' : 'pending',
        fulfillment_status: null
      }
    };

    const response = await this.makeRequest('/orders.json', 'POST', shopifyOrder);
    return this.mapShopifyOrder(response.order);
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await this.makeRequest(`/orders/${orderId}.json`, 'GET');
    return this.mapShopifyOrder(response.order);
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    const fulfillmentStatus = status === 'completed' ? 'fulfilled' :
                             status === 'cancelled' ? 'cancelled' : null;

    const response = await this.makeRequest(`/orders/${orderId}.json`, 'PUT', {
      order: {
        id: orderId,
        fulfillment_status: fulfillmentStatus
      }
    });

    return this.mapShopifyOrder(response.order);
  }

  async listOrders(params?: { limit?: number; offset?: number; status?: Order['status'] }): Promise<Order[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) {
      const fulfillmentStatus = params.status === 'completed' ? 'fulfilled' :
                               params.status === 'cancelled' ? 'cancelled' : 'any';
      queryParams.append('fulfillment_status', fulfillmentStatus);
    }

    const endpoint = `/orders.json${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.makeRequest(endpoint, 'GET');

    return response.orders.map((o: any) => this.mapShopifyOrder(o));
  }

  private mapShopifyOrder(shopifyOrder: any): Order {
    return {
      id: shopifyOrder.id.toString(),
      orderNumber: shopifyOrder.order_number.toString(),
      customerId: shopifyOrder.customer?.id?.toString(),
      items: shopifyOrder.line_items.map((item: any) => ({
        productId: item.variant_id?.toString() || item.product_id?.toString(),
        sku: item.sku || '',
        name: item.name,
        quantity: item.quantity,
        price: Math.round(parseFloat(item.price) * 100),
        total: Math.round(parseFloat(item.price) * item.quantity * 100)
      })),
      subtotal: Math.round(parseFloat(shopifyOrder.subtotal_price) * 100),
      tax: Math.round(parseFloat(shopifyOrder.total_tax) * 100),
      shipping: Math.round(parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || '0') * 100),
      total: Math.round(parseFloat(shopifyOrder.total_price) * 100),
      currency: shopifyOrder.currency,
      status: this.mapShopifyOrderStatus(shopifyOrder.fulfillment_status),
      shippingAddress: shopifyOrder.shipping_address,
      billingAddress: shopifyOrder.billing_address,
      paymentStatus: shopifyOrder.financial_status === 'paid' ? 'paid' :
                     shopifyOrder.financial_status === 'refunded' ? 'refunded' :
                     shopifyOrder.financial_status === 'voided' ? 'failed' : 'pending',
      createdAt: new Date(shopifyOrder.created_at),
      updatedAt: new Date(shopifyOrder.updated_at)
    };
  }

  private mapShopifyOrderStatus(fulfillmentStatus: string | null): Order['status'] {
    switch (fulfillmentStatus) {
      case 'fulfilled': return 'completed';
      case 'partial': return 'processing';
      case 'cancelled': return 'cancelled';
      case 'restocked': return 'cancelled';
      default: return 'pending';
    }
  }

  async syncProducts(): Promise<{ synced: number; failed: number }> {
    // This would sync products from Shopify to local database
    // For now, just return a count
    const products = await this.listProducts({ limit: 250 });
    return { synced: products.length, failed: 0 };
  }

  async syncOrders(): Promise<{ synced: number; failed: number }> {
    // This would sync orders from Shopify to local database
    const orders = await this.listOrders({ limit: 250 });
    return { synced: orders.length, failed: 0 };
  }

  validateWebhook(payload: any, signature: string): boolean {
    // Implement HMAC validation for Shopify webhooks
    if (!this.config) return false;

    // This would use the API secret to validate the webhook signature
    // For now, return true (implement proper validation in production)
    return true;
  }

  async handleWebhook(event: string, payload: any): Promise<void> {
    // Handle different webhook events
    switch (event) {
      case 'products/create':
      case 'products/update':
        console.log(`Product ${event} webhook received:`, payload);
        break;
      case 'orders/create':
      case 'orders/updated':
        console.log(`Order ${event} webhook received:`, payload);
        break;
      default:
        console.log(`Unknown webhook event: ${event}`);
    }
  }
}
