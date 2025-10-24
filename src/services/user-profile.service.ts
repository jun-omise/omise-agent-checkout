/**
 * User Profile Service
 * Manages user profiles with saved addresses and payment methods for quick checkout
 */

import { Address } from './ecommerce-platform.interface.js';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'promptpay' | 'internet_banking' | 'mobile_banking';
  isDefault: boolean;
  // For cards
  cardToken?: string;
  cardBrand?: string;
  cardLastDigits?: string;
  cardExpiryMonth?: string;
  cardExpiryYear?: string;
  cardHolderName?: string;
  // For other methods
  bankCode?: string; // For internet banking
  phoneNumber?: string; // For PromptPay
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  // Addresses
  shippingAddresses: SavedAddress[];
  billingAddresses: SavedAddress[];
  // Payment methods
  paymentMethods: PaymentMethod[];
  // Preferences
  preferences: {
    defaultShippingAddressId?: string;
    defaultBillingAddressId?: string;
    defaultPaymentMethodId?: string;
    sameAsBilling?: boolean; // Use billing address as shipping
  };
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastCheckoutAt?: Date;
  totalOrders: number;
  totalSpent: number; // in smallest currency unit
}

export interface SavedAddress extends Address {
  id: string;
  label?: string; // e.g., 'Home', 'Office', 'My Address'
  isDefault: boolean;
}

export interface CreateProfileParams {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AddAddressParams extends Omit<SavedAddress, 'id' | 'isDefault'> {
  label?: string;
  isDefault?: boolean;
}

export interface AddPaymentMethodParams extends Omit<PaymentMethod, 'id' | 'createdAt' | 'isDefault'> {
  isDefault?: boolean;
}

export class UserProfileService {
  // In-memory storage (replace with database in production)
  private profiles: Map<string, UserProfile> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId

  /**
   * Create a new user profile
   */
  async createProfile(params: CreateProfileParams): Promise<UserProfile> {
    // Check if email already exists
    if (this.emailIndex.has(params.email)) {
      throw new Error(`Profile with email ${params.email} already exists`);
    }

    const profileId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const profile: UserProfile = {
      id: profileId,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      shippingAddresses: [],
      billingAddresses: [],
      paymentMethods: [],
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      totalOrders: 0,
      totalSpent: 0
    };

    this.profiles.set(profileId, profile);
    this.emailIndex.set(params.email, profileId);

    return profile;
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  /**
   * Get user profile by email
   */
  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    const userId = this.emailIndex.get(email);
    if (!userId) return null;

    return this.profiles.get(userId) || null;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'phone' | 'email'>>
  ): Promise<UserProfile> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    // If email is being updated, update the index
    if (updates.email && updates.email !== profile.email) {
      this.emailIndex.delete(profile.email);
      this.emailIndex.set(updates.email, userId);
    }

    Object.assign(profile, updates, { updatedAt: new Date() });
    this.profiles.set(userId, profile);

    return profile;
  }

  /**
   * Add a shipping address
   */
  async addShippingAddress(userId: string, address: AddAddressParams): Promise<SavedAddress> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    const addressId = `addr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const savedAddress: SavedAddress = {
      id: addressId,
      ...address,
      isDefault: address.isDefault ?? false
    };

    // If this is set as default, unset other defaults
    if (savedAddress.isDefault) {
      profile.shippingAddresses.forEach(addr => {
        addr.isDefault = false;
      });
      profile.preferences.defaultShippingAddressId = addressId;
    }

    profile.shippingAddresses.push(savedAddress);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return savedAddress;
  }

  /**
   * Add a billing address
   */
  async addBillingAddress(userId: string, address: AddAddressParams): Promise<SavedAddress> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    const addressId = `addr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const savedAddress: SavedAddress = {
      id: addressId,
      ...address,
      isDefault: address.isDefault ?? false
    };

    // If this is set as default, unset other defaults
    if (savedAddress.isDefault) {
      profile.billingAddresses.forEach(addr => {
        addr.isDefault = false;
      });
      profile.preferences.defaultBillingAddressId = addressId;
    }

    profile.billingAddresses.push(savedAddress);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return savedAddress;
  }

  /**
   * Update a saved address
   */
  async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<Omit<SavedAddress, 'id'>>,
    type: 'shipping' | 'billing'
  ): Promise<SavedAddress> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    const addresses = type === 'shipping' ? profile.shippingAddresses : profile.billingAddresses;
    const address = addresses.find(a => a.id === addressId);

    if (!address) {
      throw new Error(`Address ${addressId} not found`);
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      addresses.forEach(addr => {
        addr.isDefault = false;
      });

      if (type === 'shipping') {
        profile.preferences.defaultShippingAddressId = addressId;
      } else {
        profile.preferences.defaultBillingAddressId = addressId;
      }
    }

    Object.assign(address, updates);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return address;
  }

  /**
   * Delete a saved address
   */
  async deleteAddress(userId: string, addressId: string, type: 'shipping' | 'billing'): Promise<boolean> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    const addresses = type === 'shipping' ? profile.shippingAddresses : profile.billingAddresses;
    const index = addresses.findIndex(a => a.id === addressId);

    if (index === -1) {
      return false;
    }

    const wasDefault = addresses[index].isDefault;
    addresses.splice(index, 1);

    // If deleted address was default and there are other addresses, set first as default
    if (wasDefault && addresses.length > 0) {
      addresses[0].isDefault = true;
      if (type === 'shipping') {
        profile.preferences.defaultShippingAddressId = addresses[0].id;
      } else {
        profile.preferences.defaultBillingAddressId = addresses[0].id;
      }
    }

    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return true;
  }

  /**
   * Add a payment method
   */
  async addPaymentMethod(userId: string, paymentMethod: AddPaymentMethodParams): Promise<PaymentMethod> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    const methodId = `pm_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const savedMethod: PaymentMethod = {
      id: methodId,
      ...paymentMethod,
      isDefault: paymentMethod.isDefault ?? false,
      createdAt: new Date()
    };

    // If this is set as default, unset other defaults
    if (savedMethod.isDefault) {
      profile.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
      profile.preferences.defaultPaymentMethodId = methodId;
    }

    profile.paymentMethods.push(savedMethod);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return savedMethod;
  }

  /**
   * Update a payment method
   */
  async updatePaymentMethod(
    userId: string,
    methodId: string,
    updates: Partial<Omit<PaymentMethod, 'id' | 'createdAt'>>
  ): Promise<PaymentMethod> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    const method = profile.paymentMethods.find(m => m.id === methodId);
    if (!method) {
      throw new Error(`Payment method ${methodId} not found`);
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      profile.paymentMethods.forEach(m => {
        m.isDefault = false;
      });
      profile.preferences.defaultPaymentMethodId = methodId;
    }

    Object.assign(method, updates);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return method;
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(userId: string, methodId: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    const index = profile.paymentMethods.findIndex(m => m.id === methodId);
    if (index === -1) {
      return false;
    }

    const wasDefault = profile.paymentMethods[index].isDefault;
    profile.paymentMethods.splice(index, 1);

    // If deleted method was default and there are other methods, set first as default
    if (wasDefault && profile.paymentMethods.length > 0) {
      profile.paymentMethods[0].isDefault = true;
      profile.preferences.defaultPaymentMethodId = profile.paymentMethods[0].id;
    }

    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return true;
  }

  /**
   * Get default shipping address
   */
  async getDefaultShippingAddress(userId: string): Promise<SavedAddress | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    return profile.shippingAddresses.find(a => a.isDefault) ||
           profile.shippingAddresses[0] ||
           null;
  }

  /**
   * Get default billing address
   */
  async getDefaultBillingAddress(userId: string): Promise<SavedAddress | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    return profile.billingAddresses.find(a => a.isDefault) ||
           profile.billingAddresses[0] ||
           null;
  }

  /**
   * Get default payment method
   */
  async getDefaultPaymentMethod(userId: string): Promise<PaymentMethod | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    return profile.paymentMethods.find(m => m.isDefault) ||
           profile.paymentMethods[0] ||
           null;
  }

  /**
   * Update checkout statistics
   */
  async recordCheckout(userId: string, orderAmount: number): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile ${userId} not found`);
    }

    profile.lastCheckoutAt = new Date();
    profile.totalOrders += 1;
    profile.totalSpent += orderAmount;
    profile.updatedAt = new Date();

    this.profiles.set(userId, profile);
  }

  /**
   * List all profiles (admin function)
   */
  async listProfiles(params?: { limit?: number; offset?: number }): Promise<UserProfile[]> {
    const allProfiles = Array.from(this.profiles.values());
    const offset = params?.offset || 0;
    const limit = params?.limit || 100;

    return allProfiles.slice(offset, offset + limit);
  }

  /**
   * Delete a user profile
   */
  async deleteProfile(userId: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return false;
    }

    this.emailIndex.delete(profile.email);
    this.profiles.delete(userId);

    return true;
  }

  /**
   * Get quick checkout data for a user
   */
  async getQuickCheckoutData(userId: string): Promise<{
    shippingAddress: SavedAddress | null;
    billingAddress: SavedAddress | null;
    paymentMethod: PaymentMethod | null;
  }> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return {
        shippingAddress: null,
        billingAddress: null,
        paymentMethod: null
      };
    }

    return {
      shippingAddress: await this.getDefaultShippingAddress(userId),
      billingAddress: await this.getDefaultBillingAddress(userId),
      paymentMethod: await this.getDefaultPaymentMethod(userId)
    };
  }
}
