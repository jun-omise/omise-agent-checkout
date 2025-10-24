/**
 * Checkout Session Database Model
 * MongoDB schema for checkout sessions
 */

import { getDatabase } from '../services/database.service.js';
import type { CheckoutSession, CartItem, Message } from '../services/checkout-agent.service.js';

export class CheckoutSessionModel {
  private collectionName = 'checkout_sessions';

  private async getCollection() {
    const db = getDatabase();
    const mongodb = db.getDatabase();
    return mongodb.collection(this.collectionName);
  }

  async create(session: CheckoutSession): Promise<CheckoutSession> {
    const collection = await this.getCollection();

    await collection.insertOne({
      _id: session.sessionId,
      ...session,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return session;
  }

  async findById(sessionId: string): Promise<CheckoutSession | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: sessionId });

    if (!doc) return null;

    return this.mapToSession(doc);
  }

  async update(sessionId: string, updates: Partial<CheckoutSession>): Promise<CheckoutSession | null> {
    const collection = await this.getCollection();

    const result = await collection.findOneAndUpdate(
      { _id: sessionId },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;

    return this.mapToSession(result);
  }

  async addMessage(sessionId: string, message: Message): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { _id: sessionId },
      {
        $push: { conversationHistory: message },
        $set: { updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  async updateCart(sessionId: string, cart: CartItem[], totalAmount: number): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { _id: sessionId },
      {
        $set: {
          cart,
          totalAmount,
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async updateStatus(sessionId: string, status: CheckoutSession['status']): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { _id: sessionId },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async delete(sessionId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: sessionId });
    return result.deletedCount > 0;
  }

  async findByUserId(userId: string, limit: number = 10): Promise<CheckoutSession[]> {
    const collection = await this.getCollection();
    const docs = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map(doc => this.mapToSession(doc));
  }

  async findRecent(limit: number = 50): Promise<CheckoutSession[]> {
    const collection = await this.getCollection();
    const docs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map(doc => this.mapToSession(doc));
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const collection = await this.getCollection();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await collection.deleteMany({
      status: { $in: ['completed', 'cancelled'] },
      updatedAt: { $lt: cutoffDate }
    });

    return result.deletedCount || 0;
  }

  private mapToSession(doc: any): CheckoutSession {
    return {
      sessionId: doc._id,
      customerId: doc.customerId,
      userId: doc.userId,
      cart: doc.cart || [],
      totalAmount: doc.totalAmount,
      currency: doc.currency,
      conversationHistory: doc.conversationHistory || [],
      paymentMethod: doc.paymentMethod,
      status: doc.status,
      shippingAddressId: doc.shippingAddressId,
      billingAddressId: doc.billingAddressId,
      paymentMethodId: doc.paymentMethodId
    };
  }

  async createIndexes(): Promise<void> {
    const collection = await this.getCollection();

    // Create indexes for better query performance
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ updatedAt: -1 });

    // TTL index to auto-delete old completed sessions after 90 days
    await collection.createIndex(
      { updatedAt: 1 },
      {
        expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
        partialFilterExpression: { status: { $in: ['completed', 'cancelled'] } }
      }
    );

    console.log('✓ Checkout session indexes created');
  }
}
