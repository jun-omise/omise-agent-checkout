/**
 * User Profile Database Model
 * MongoDB schema for user profiles
 */

import { getDatabase } from '../services/database.service.js';
import type {
  UserProfile,
  SavedAddress,
  PaymentMethod,
  CreateProfileParams,
  AddAddressParams,
  AddPaymentMethodParams
} from '../services/user-profile.service.js';

export class UserProfileModel {
  private collectionName = 'user_profiles';

  private async getCollection() {
    const db = getDatabase();
    const mongodb = db.getDatabase();
    return mongodb.collection(this.collectionName);
  }

  async create(params: CreateProfileParams): Promise<UserProfile> {
    const collection = await this.getCollection();

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

    await collection.insertOne({ _id: profileId, ...profile });
    return profile;
  }

  async findById(userId: string): Promise<UserProfile | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: userId });

    if (!doc) return null;

    return this.mapToUserProfile(doc);
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ email });

    if (!doc) return null;

    return this.mapToUserProfile(doc);
  }

  async update(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const collection = await this.getCollection();

    const result = await collection.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;

    return this.mapToUserProfile(result);
  }

  async delete(userId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: userId });
    return result.deletedCount > 0;
  }

  async addShippingAddress(userId: string, address: SavedAddress): Promise<boolean> {
    const collection = await this.getCollection();

    // If setting as default, unset others
    if (address.isDefault) {
      await collection.updateOne(
        { _id: userId },
        { $set: { 'shippingAddresses.$[].isDefault': false } }
      );
    }

    const result = await collection.updateOne(
      { _id: userId },
      {
        $push: { shippingAddresses: address },
        $set: { updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  async addBillingAddress(userId: string, address: SavedAddress): Promise<boolean> {
    const collection = await this.getCollection();

    // If setting as default, unset others
    if (address.isDefault) {
      await collection.updateOne(
        { _id: userId },
        { $set: { 'billingAddresses.$[].isDefault': false } }
      );
    }

    const result = await collection.updateOne(
      { _id: userId },
      {
        $push: { billingAddresses: address },
        $set: { updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<SavedAddress>,
    type: 'shipping' | 'billing'
  ): Promise<boolean> {
    const collection = await this.getCollection();
    const fieldName = type === 'shipping' ? 'shippingAddresses' : 'billingAddresses';

    // If setting as default, unset others first
    if (updates.isDefault) {
      await collection.updateOne(
        { _id: userId },
        { $set: { [`${fieldName}.$[].isDefault`]: false } }
      );
    }

    const updateFields: Record<string, any> = {};
    Object.keys(updates).forEach(key => {
      updateFields[`${fieldName}.$.${key}`] = (updates as any)[key];
    });

    const result = await collection.updateOne(
      { _id: userId, [`${fieldName}.id`]: addressId },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async deleteAddress(userId: string, addressId: string, type: 'shipping' | 'billing'): Promise<boolean> {
    const collection = await this.getCollection();
    const fieldName = type === 'shipping' ? 'shippingAddresses' : 'billingAddresses';

    const result = await collection.updateOne(
      { _id: userId },
      {
        $pull: { [fieldName]: { id: addressId } },
        $set: { updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  async addPaymentMethod(userId: string, paymentMethod: PaymentMethod): Promise<boolean> {
    const collection = await this.getCollection();

    // If setting as default, unset others
    if (paymentMethod.isDefault) {
      await collection.updateOne(
        { _id: userId },
        { $set: { 'paymentMethods.$[].isDefault': false } }
      );
    }

    const result = await collection.updateOne(
      { _id: userId },
      {
        $push: { paymentMethods: paymentMethod },
        $set: { updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  async updatePaymentMethod(
    userId: string,
    methodId: string,
    updates: Partial<PaymentMethod>
  ): Promise<boolean> {
    const collection = await this.getCollection();

    // If setting as default, unset others first
    if (updates.isDefault) {
      await collection.updateOne(
        { _id: userId },
        { $set: { 'paymentMethods.$[].isDefault': false } }
      );
    }

    const updateFields: Record<string, any> = {};
    Object.keys(updates).forEach(key => {
      updateFields[`paymentMethods.$.${key}`] = (updates as any)[key];
    });

    const result = await collection.updateOne(
      { _id: userId, 'paymentMethods.id': methodId },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async deletePaymentMethod(userId: string, methodId: string): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { _id: userId },
      {
        $pull: { paymentMethods: { id: methodId } },
        $set: { updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  async recordCheckout(userId: string, orderAmount: number): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { _id: userId },
      {
        $inc: { totalOrders: 1, totalSpent: orderAmount },
        $set: { lastCheckoutAt: new Date(), updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  async list(limit: number = 100, offset: number = 0): Promise<UserProfile[]> {
    const collection = await this.getCollection();
    const docs = await collection
      .find({})
      .skip(offset)
      .limit(limit)
      .toArray();

    return docs.map(doc => this.mapToUserProfile(doc));
  }

  private mapToUserProfile(doc: any): UserProfile {
    return {
      id: doc._id,
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      phone: doc.phone,
      shippingAddresses: doc.shippingAddresses || [],
      billingAddresses: doc.billingAddresses || [],
      paymentMethods: doc.paymentMethods || [],
      preferences: doc.preferences || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastCheckoutAt: doc.lastCheckoutAt,
      totalOrders: doc.totalOrders || 0,
      totalSpent: doc.totalSpent || 0
    };
  }

  async createIndexes(): Promise<void> {
    const collection = await this.getCollection();

    // Create indexes for better query performance
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ totalSpent: -1 });

    console.log('✓ User profile indexes created');
  }
}
