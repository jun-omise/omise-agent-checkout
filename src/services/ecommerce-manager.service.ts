/**
 * E-commerce Platform Manager
 * Central service to manage multiple e-commerce platform integrations
 */

import { EcommercePlatform, PlatformConfig, Product, Order } from './ecommerce-platform.interface.js';
import { ShopifyService } from './shopify.service.js';
import { WooCommerceService } from './woocommerce.service.js';
import { MagentoService } from './magento.service.js';

export type PlatformType = 'shopify' | 'woocommerce' | 'magento';

export class EcommercePlatformManager {
  private platforms: Map<string, EcommercePlatform> = new Map();
  private activePlatform?: string;

  /**
   * Register and initialize a platform
   */
  async registerPlatform(
    platformType: PlatformType,
    config: PlatformConfig,
    identifier?: string
  ): Promise<void> {
    let platform: EcommercePlatform;

    switch (platformType) {
      case 'shopify':
        platform = new ShopifyService();
        break;
      case 'woocommerce':
        platform = new WooCommerceService();
        break;
      case 'magento':
        platform = new MagentoService();
        break;
      default:
        throw new Error(`Unsupported platform type: ${platformType}`);
    }

    await platform.initialize(config);

    const platformId = identifier || platformType;
    this.platforms.set(platformId, platform);

    // Set as active if it's the first platform
    if (!this.activePlatform) {
      this.activePlatform = platformId;
    }
  }

  /**
   * Set the active platform
   */
  setActivePlatform(platformId: string): void {
    if (!this.platforms.has(platformId)) {
      throw new Error(`Platform ${platformId} not found`);
    }

    this.activePlatform = platformId;
  }

  /**
   * Get the active platform
   */
  getActivePlatform(): EcommercePlatform {
    if (!this.activePlatform) {
      throw new Error('No active platform set');
    }

    const platform = this.platforms.get(this.activePlatform);
    if (!platform) {
      throw new Error(`Active platform ${this.activePlatform} not found`);
    }

    return platform;
  }

  /**
   * Get a specific platform by ID
   */
  getPlatform(platformId: string): EcommercePlatform {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      throw new Error(`Platform ${platformId} not found`);
    }

    return platform;
  }

  /**
   * List all registered platforms
   */
  listPlatforms(): Array<{ id: string; name: string }> {
    return Array.from(this.platforms.entries()).map(([id, platform]) => ({
      id,
      name: platform.platformName
    }));
  }

  /**
   * Remove a platform
   */
  removePlatform(platformId: string): boolean {
    if (this.activePlatform === platformId) {
      this.activePlatform = undefined;
    }

    return this.platforms.delete(platformId);
  }

  // Convenience methods that use the active platform

  async createProduct(params: any): Promise<Product> {
    return this.getActivePlatform().createProduct(params);
  }

  async getProduct(productId: string): Promise<Product> {
    return this.getActivePlatform().getProduct(productId);
  }

  async updateProduct(productId: string, params: any): Promise<Product> {
    return this.getActivePlatform().updateProduct(productId, params);
  }

  async deleteProduct(productId: string): Promise<boolean> {
    return this.getActivePlatform().deleteProduct(productId);
  }

  async listProducts(params?: any): Promise<Product[]> {
    return this.getActivePlatform().listProducts(params);
  }

  async searchProductBySku(sku: string): Promise<Product | null> {
    return this.getActivePlatform().searchProductBySku(sku);
  }

  async updateStock(productId: string, quantity: number): Promise<boolean> {
    return this.getActivePlatform().updateStock(productId, quantity);
  }

  async getStock(productId: string): Promise<number> {
    return this.getActivePlatform().getStock(productId);
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    return this.getActivePlatform().createOrder(order);
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.getActivePlatform().getOrder(orderId);
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    return this.getActivePlatform().updateOrderStatus(orderId, status);
  }

  async listOrders(params?: any): Promise<Order[]> {
    return this.getActivePlatform().listOrders(params);
  }

  async syncProducts(): Promise<{ synced: number; failed: number }> {
    return this.getActivePlatform().syncProducts();
  }

  async syncOrders(): Promise<{ synced: number; failed: number }> {
    return this.getActivePlatform().syncOrders();
  }

  /**
   * Search products across all registered platforms
   */
  async searchAllPlatforms(sku: string): Promise<Array<{ platformId: string; product: Product }>> {
    const results: Array<{ platformId: string; product: Product }> = [];

    for (const [platformId, platform] of this.platforms.entries()) {
      try {
        const product = await platform.searchProductBySku(sku);
        if (product) {
          results.push({ platformId, product });
        }
      } catch (error) {
        console.error(`Error searching ${platformId}:`, error);
      }
    }

    return results;
  }

  /**
   * Sync products from all platforms
   */
  async syncAllPlatforms(): Promise<Record<string, { synced: number; failed: number }>> {
    const results: Record<string, { synced: number; failed: number }> = {};

    for (const [platformId, platform] of this.platforms.entries()) {
      try {
        results[platformId] = await platform.syncProducts();
      } catch (error) {
        console.error(`Error syncing ${platformId}:`, error);
        results[platformId] = { synced: 0, failed: 1 };
      }
    }

    return results;
  }
}
