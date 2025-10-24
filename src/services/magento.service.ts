/**
 * Magento E-commerce Platform Integration
 * Implements product management, inventory, and order handling for Magento stores
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

interface MagentoConfig extends PlatformConfig {
  storeUrl: string; // e.g., 'https://mystore.com'
  accessToken: string; // Integration access token
  storeCode?: string; // Store view code (default: 'default')
}

export class MagentoService implements EcommercePlatform {
  readonly platformName = 'magento';
  private config?: MagentoConfig;
  private baseUrl?: string;

  async initialize(config: PlatformConfig): Promise<void> {
    const magentoConfig = config as MagentoConfig;

    if (!magentoConfig.storeUrl || !magentoConfig.accessToken) {
      throw new PlatformError(
        'Magento requires storeUrl and accessToken',
        'INVALID_CONFIG',
        this.platformName
      );
    }

    this.config = {
      ...magentoConfig,
      storeCode: magentoConfig.storeCode || 'default'
    };

    // Remove trailing slash from store URL
    const cleanUrl = this.config.storeUrl.replace(/\/$/, '');
    this.baseUrl = `${cleanUrl}/rest/${this.config.storeCode}/V1`;

    // Test connection
    await this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.makeRequest('/store/storeConfigs', 'GET');
    } catch (error) {
      throw new PlatformError(
        'Failed to connect to Magento',
        'CONNECTION_ERROR',
        this.platformName,
        error
      );
    }
  }

  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    if (!this.config || !this.baseUrl) {
      throw new PlatformError(
        'Magento not initialized',
        'NOT_INITIALIZED',
        this.platformName
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.accessToken}`,
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
          `Magento API error: ${response.statusText}`,
          `HTTP_${response.status}`,
          this.platformName,
          errorData
        );
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
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

  private mapMagentoProduct(mgProduct: any): Product {
    const customAttrs = mgProduct.custom_attributes || [];
    const description = customAttrs.find((a: any) => a.attribute_code === 'description')?.value || '';
    const category = customAttrs.find((a: any) => a.attribute_code === 'category_ids')?.value?.[0] || undefined;

    return {
      id: mgProduct.id.toString(),
      sku: mgProduct.sku,
      name: mgProduct.name,
      description,
      price: Math.round(mgProduct.price * 100),
      currency: 'THB',
      stock: this.getStockFromExtension(mgProduct),
      images: this.getImagesFromExtension(mgProduct),
      category,
      variants: mgProduct.type_id === 'configurable' ? [] : undefined,
      metadata: {
        type: mgProduct.type_id,
        attribute_set_id: mgProduct.attribute_set_id,
        status: mgProduct.status,
        visibility: mgProduct.visibility,
        weight: mgProduct.weight
      }
    };
  }

  private getStockFromExtension(product: any): number {
    const stockItem = product.extension_attributes?.stock_item;
    return stockItem?.qty || 0;
  }

  private getImagesFromExtension(product: any): string[] {
    const mediaGallery = product.media_gallery_entries || [];
    return mediaGallery
      .filter((entry: any) => entry.media_type === 'image')
      .map((entry: any) => entry.file);
  }

  async createProduct(params: CreateProductParams): Promise<Product> {
    const magentoProduct = {
      product: {
        sku: params.sku,
        name: params.name,
        price: params.price / 100,
        status: 1, // Enabled
        visibility: 4, // Catalog, Search
        type_id: 'simple',
        weight: 1,
        attribute_set_id: 4, // Default attribute set
        extension_attributes: {
          stock_item: {
            qty: params.stock,
            is_in_stock: params.stock > 0
          }
        },
        custom_attributes: [
          {
            attribute_code: 'description',
            value: params.description
          },
          {
            attribute_code: 'short_description',
            value: params.description.substring(0, 120)
          }
        ]
      }
    };

    if (params.category) {
      magentoProduct.product.custom_attributes.push({
        attribute_code: 'category_ids',
        value: [params.category] as any
      });
    }

    const response = await this.makeRequest('/products', 'POST', magentoProduct);
    return this.mapMagentoProduct(response);
  }

  async getProduct(productId: string): Promise<Product> {
    // Magento uses SKU as identifier in most APIs
    const response = await this.makeRequest(`/products/${encodeURIComponent(productId)}`, 'GET');
    return this.mapMagentoProduct(response);
  }

  async updateProduct(productId: string, params: UpdateProductParams): Promise<Product> {
    // First, get the current product to maintain required fields
    const currentProduct = await this.getProduct(productId);

    const updateData: any = {
      product: {
        sku: params.sku || productId,
        name: params.name,
        price: params.price !== undefined ? params.price / 100 : undefined,
        custom_attributes: []
      }
    };

    if (params.description) {
      updateData.product.custom_attributes.push({
        attribute_code: 'description',
        value: params.description
      });
    }

    if (params.stock !== undefined) {
      updateData.product.extension_attributes = {
        stock_item: {
          qty: params.stock,
          is_in_stock: params.stock > 0
        }
      };
    }

    if (params.category) {
      updateData.product.custom_attributes.push({
        attribute_code: 'category_ids',
        value: [params.category]
      });
    }

    // Remove undefined values
    Object.keys(updateData.product).forEach(key => {
      if (updateData.product[key] === undefined) {
        delete updateData.product[key];
      }
    });

    const response = await this.makeRequest(`/products/${encodeURIComponent(productId)}`, 'PUT', updateData);
    return this.mapMagentoProduct(response);
  }

  async deleteProduct(productId: string): Promise<boolean> {
    await this.makeRequest(`/products/${encodeURIComponent(productId)}`, 'DELETE');
    return true;
  }

  async listProducts(params?: { limit?: number; offset?: number; search?: string }): Promise<Product[]> {
    const searchCriteria: any = {
      searchCriteria: {
        pageSize: params?.limit || 20,
        currentPage: params?.offset ? Math.floor(params.offset / (params.limit || 20)) + 1 : 1
      }
    };

    if (params?.search) {
      searchCriteria.searchCriteria.filterGroups = [
        {
          filters: [
            {
              field: 'name',
              value: `%${params.search}%`,
              condition_type: 'like'
            }
          ]
        }
      ];
    }

    const queryString = this.buildSearchCriteria(searchCriteria.searchCriteria);
    const response = await this.makeRequest(`/products?${queryString}`, 'GET');

    return response.items.map((p: any) => this.mapMagentoProduct(p));
  }

  private buildSearchCriteria(criteria: any): string {
    const params = new URLSearchParams();

    if (criteria.pageSize) {
      params.append('searchCriteria[pageSize]', criteria.pageSize.toString());
    }

    if (criteria.currentPage) {
      params.append('searchCriteria[currentPage]', criteria.currentPage.toString());
    }

    if (criteria.filterGroups) {
      criteria.filterGroups.forEach((group: any, groupIndex: number) => {
        group.filters.forEach((filter: any, filterIndex: number) => {
          params.append(`searchCriteria[filterGroups][${groupIndex}][filters][${filterIndex}][field]`, filter.field);
          params.append(`searchCriteria[filterGroups][${groupIndex}][filters][${filterIndex}][value]`, filter.value);
          params.append(`searchCriteria[filterGroups][${groupIndex}][filters][${filterIndex}][conditionType]`, filter.condition_type);
        });
      });
    }

    return params.toString();
  }

  async searchProductBySku(sku: string): Promise<Product | null> {
    try {
      const product = await this.getProduct(sku);
      return product;
    } catch (error) {
      return null;
    }
  }

  async updateStock(productId: string, quantity: number): Promise<boolean> {
    const stockItem = {
      stockItem: {
        qty: quantity,
        is_in_stock: quantity > 0
      }
    };

    await this.makeRequest(`/products/${encodeURIComponent(productId)}/stockItems/1`, 'PUT', stockItem);
    return true;
  }

  async getStock(productId: string): Promise<number> {
    const response = await this.makeRequest(`/stockStatuses/${encodeURIComponent(productId)}`, 'GET');
    return response.qty || 0;
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    // Magento order creation is complex and typically done through cart/quote system
    // This is a simplified version
    const magentoOrder = {
      entity: {
        base_currency_code: order.currency || 'THB',
        customer_id: order.customerId ? parseInt(order.customerId) : null,
        items: order.items?.map(item => ({
          sku: item.sku,
          qty: item.quantity,
          price: item.price / 100
        })),
        billing_address: order.billingAddress,
        payment: {
          method: 'omise'
        }
      }
    };

    const response = await this.makeRequest('/orders', 'POST', magentoOrder);
    return this.mapMagentoOrder(response);
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await this.makeRequest(`/orders/${orderId}`, 'GET');
    return this.mapMagentoOrder(response);
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    const magentoStatus = this.mapToMagentoStatus(status);

    const response = await this.makeRequest(`/orders/${orderId}`, 'PUT', {
      entity: {
        entity_id: orderId,
        status: magentoStatus
      }
    });

    return this.mapMagentoOrder(response);
  }

  async listOrders(params?: { limit?: number; offset?: number; status?: Order['status'] }): Promise<Order[]> {
    const searchCriteria: any = {
      pageSize: params?.limit || 20,
      currentPage: params?.offset ? Math.floor(params.offset / (params.limit || 20)) + 1 : 1
    };

    if (params?.status) {
      searchCriteria.filterGroups = [
        {
          filters: [
            {
              field: 'status',
              value: this.mapToMagentoStatus(params.status),
              condition_type: 'eq'
            }
          ]
        }
      ];
    }

    const queryString = this.buildSearchCriteria(searchCriteria);
    const response = await this.makeRequest(`/orders?${queryString}`, 'GET');

    return response.items.map((o: any) => this.mapMagentoOrder(o));
  }

  private mapMagentoOrder(mgOrder: any): Order {
    return {
      id: mgOrder.entity_id.toString(),
      orderNumber: mgOrder.increment_id || mgOrder.entity_id.toString(),
      customerId: mgOrder.customer_id?.toString(),
      items: mgOrder.items?.map((item: any) => ({
        productId: item.product_id?.toString(),
        sku: item.sku || '',
        name: item.name,
        quantity: item.qty_ordered || item.qty,
        price: Math.round(parseFloat(item.price) * 100),
        total: Math.round(parseFloat(item.row_total) * 100)
      })) || [],
      subtotal: Math.round(parseFloat(mgOrder.subtotal || '0') * 100),
      tax: Math.round(parseFloat(mgOrder.tax_amount || '0') * 100),
      shipping: Math.round(parseFloat(mgOrder.shipping_amount || '0') * 100),
      total: Math.round(parseFloat(mgOrder.grand_total || '0') * 100),
      currency: mgOrder.order_currency_code || 'THB',
      status: this.mapFromMagentoStatus(mgOrder.status),
      shippingAddress: mgOrder.extension_attributes?.shipping_assignments?.[0]?.shipping?.address,
      billingAddress: mgOrder.billing_address,
      paymentStatus: mgOrder.state === 'complete' ? 'paid' :
                     mgOrder.state === 'closed' ? 'refunded' :
                     mgOrder.state === 'canceled' ? 'failed' : 'pending',
      createdAt: new Date(mgOrder.created_at),
      updatedAt: new Date(mgOrder.updated_at)
    };
  }

  private mapToMagentoStatus(status: Order['status']): string {
    const statusMap: Record<Order['status'], string> = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'complete',
      'cancelled': 'canceled',
      'refunded': 'closed'
    };

    return statusMap[status] || 'pending';
  }

  private mapFromMagentoStatus(mgStatus: string): Order['status'] {
    const statusMap: Record<string, Order['status']> = {
      'pending': 'pending',
      'processing': 'processing',
      'complete': 'completed',
      'canceled': 'cancelled',
      'closed': 'refunded',
      'holded': 'pending'
    };

    return statusMap[mgStatus] || 'pending';
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
    // Magento webhook validation would go here
    return true;
  }

  async handleWebhook(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'catalog_product_save_after':
        console.log(`Product saved webhook received:`, payload);
        break;
      case 'sales_order_save_after':
        console.log(`Order saved webhook received:`, payload);
        break;
      default:
        console.log(`Unknown webhook event: ${event}`);
    }
  }
}
