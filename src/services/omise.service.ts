import Omise from 'omise';

export interface OmiseConfig {
  publicKey: string;
  secretKey: string;
}

export interface ChargeParams {
  amount: number;
  currency: string;
  description?: string;
  source?: string;
  customer?: string;
  card?: string;
  metadata?: Record<string, any>;
  return_uri?: string;
}

export interface CustomerParams {
  email: string;
  description?: string;
  card?: string;
  metadata?: Record<string, any>;
}

export interface TokenParams {
  name: string;
  number: string;
  expiration_month: number;
  expiration_year: number;
  security_code?: string;
}

export interface SourceParams {
  type: string;
  amount: number;
  currency: string;
}

/**
 * Service for interacting with Omise Payment Gateway
 */
export class OmiseService {
  private omise: any;

  constructor(config: OmiseConfig) {
    this.omise = Omise({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
    });
  }

  /**
   * Create a charge
   */
  async createCharge(params: ChargeParams): Promise<any> {
    return new Promise((resolve, reject) => {
      this.omise.charges.create(params, (err: any, charge: any) => {
        if (err) {
          reject(new Error(`Failed to create charge: ${err.message}`));
        } else {
          resolve(charge);
        }
      });
    });
  }

  /**
   * Retrieve a charge by ID
   */
  async getCharge(chargeId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.omise.charges.retrieve(chargeId, (err: any, charge: any) => {
        if (err) {
          reject(new Error(`Failed to retrieve charge: ${err.message}`));
        } else {
          resolve(charge);
        }
      });
    });
  }

  /**
   * List charges with pagination
   */
  async listCharges(params: { limit?: number; offset?: number } = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      this.omise.charges.list(params, (err: any, list: any) => {
        if (err) {
          reject(new Error(`Failed to list charges: ${err.message}`));
        } else {
          resolve(list);
        }
      });
    });
  }

  /**
   * Create a customer
   */
  async createCustomer(params: CustomerParams): Promise<any> {
    return new Promise((resolve, reject) => {
      this.omise.customers.create(params, (err: any, customer: any) => {
        if (err) {
          reject(new Error(`Failed to create customer: ${err.message}`));
        } else {
          resolve(customer);
        }
      });
    });
  }

  /**
   * Retrieve a customer by ID
   */
  async getCustomer(customerId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.omise.customers.retrieve(customerId, (err: any, customer: any) => {
        if (err) {
          reject(new Error(`Failed to retrieve customer: ${err.message}`));
        } else {
          resolve(customer);
        }
      });
    });
  }

  /**
   * Create a token for a card
   */
  async createToken(params: TokenParams): Promise<any> {
    return new Promise((resolve, reject) => {
      this.omise.tokens.create({ card: params }, (err: any, token: any) => {
        if (err) {
          reject(new Error(`Failed to create token: ${err.message}`));
        } else {
          resolve(token);
        }
      });
    });
  }

  /**
   * Create a payment source (for alternative payment methods)
   */
  async createSource(params: SourceParams): Promise<any> {
    return new Promise((resolve, reject) => {
      this.omise.sources.create(params, (err: any, source: any) => {
        if (err) {
          reject(new Error(`Failed to create source: ${err.message}`));
        } else {
          resolve(source);
        }
      });
    });
  }

  /**
   * Get account capabilities (available payment methods)
   */
  async getCapabilities(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.omise.capability.retrieve((err: any, capability: any) => {
        if (err) {
          reject(new Error(`Failed to retrieve capabilities: ${err.message}`));
        } else {
          resolve(capability);
        }
      });
    });
  }

  /**
   * Refund a charge
   */
  async refundCharge(chargeId: string, amount?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const params = amount ? { amount } : {};
      this.omise.charges.refund(chargeId, params, (err: any, refund: any) => {
        if (err) {
          reject(new Error(`Failed to refund charge: ${err.message}`));
        } else {
          resolve(refund);
        }
      });
    });
  }
}
