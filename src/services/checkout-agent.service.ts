import Anthropic from '@anthropic-ai/sdk';
import { OmiseService } from './omise.service.js';
import { EcommercePlatformManager } from './ecommerce-manager.service.js';
import { UserProfileService } from './user-profile.service.js';

export interface CheckoutSession {
  sessionId: string;
  customerId?: string;
  userId?: string; // User profile ID for quick checkout
  cart: CartItem[];
  totalAmount: number;
  currency: string;
  conversationHistory: Message[];
  paymentMethod?: string;
  status: 'active' | 'pending_payment' | 'completed' | 'cancelled';
  shippingAddressId?: string;
  billingAddressId?: string;
  paymentMethodId?: string;
}

export interface CartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * AI-powered checkout agent service
 * Handles conversational checkout flow using Claude
 */
export class CheckoutAgentService {
  private anthropic: Anthropic;
  private omiseService: OmiseService;
  private ecommercePlatformManager?: EcommercePlatformManager;
  private userProfileService?: UserProfileService;
  private sessions: Map<string, CheckoutSession>;

  constructor(
    anthropicApiKey: string,
    omiseService: OmiseService,
    ecommercePlatformManager?: EcommercePlatformManager,
    userProfileService?: UserProfileService
  ) {
    this.anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });
    this.omiseService = omiseService;
    this.ecommercePlatformManager = ecommercePlatformManager;
    this.userProfileService = userProfileService;
    this.sessions = new Map();
  }

  /**
   * Create a new checkout session
   */
  createSession(cart: CartItem[], currency: string = 'THB', userId?: string): CheckoutSession {
    const sessionId = this.generateSessionId();
    const totalAmount = this.calculateTotal(cart);

    const session: CheckoutSession = {
      sessionId,
      cart,
      totalAmount,
      currency,
      conversationHistory: [],
      status: 'active',
      userId,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get checkout session
   */
  getSession(sessionId: string): CheckoutSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Process user message and generate AI response
   */
  async chat(sessionId: string, userMessage: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message to history
    session.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(session);

    // Call Claude with tools
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: session.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      tools: this.getTools(),
    });

    // Process the response and handle tool calls
    let assistantMessage = '';

    for (const content of response.content) {
      if (content.type === 'text') {
        assistantMessage += content.text;
      } else if (content.type === 'tool_use') {
        // Handle tool calls (payment processing)
        const toolResult = await this.handleToolCall(
          content.name,
          content.input,
          session
        );
        assistantMessage += `\n\n${toolResult}`;
      }
    }

    // Add assistant response to history
    session.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    });

    return assistantMessage;
  }

  /**
   * Build system prompt for the agent
   */
  private buildSystemPrompt(session: CheckoutSession): string {
    const cartSummary = session.cart
      .map((item) => `- ${item.name} (${item.quantity}x) - ${this.formatAmount(item.price * item.quantity, session.currency)}`)
      .join('\n');

    const hasEcommerce = !!this.ecommercePlatformManager;
    const hasUserProfiles = !!this.userProfileService;

    let additionalFeatures = '';

    if (hasEcommerce) {
      additionalFeatures += `\n\nE-commerce Platform Integration:
- You can help customers add products to their cart from connected platforms (Shopify, WooCommerce, Magento)
- Search products by SKU
- Update product quantities and cart items
- Manage product inventory`;
    }

    if (hasUserProfiles) {
      additionalFeatures += `\n\nUser Profile Management:
- You can help customers save their shipping and billing addresses for future use
- Customers can save payment methods for quick checkout
- Enable one-click checkout with saved information
- Retrieve saved addresses and payment methods`;
    }

    return `You are a helpful and friendly checkout assistant for an e-commerce platform. You help customers complete their purchases smoothly using Omise payment gateway.

Current Shopping Cart:
${cartSummary}

Total Amount: ${this.formatAmount(session.totalAmount, session.currency)}
Currency: ${session.currency}

Your responsibilities:
1. Guide customers through the checkout process
2. Answer questions about their order and payment methods
3. Help them choose the best payment method (credit card, PromptPay, internet banking, etc.)
4. Process payments securely when requested
5. Provide clear confirmation after successful payment
6. Handle any issues or concerns professionally
${hasEcommerce ? '7. Help customers search and add products from the e-commerce platform' : ''}
${hasUserProfiles ? '8. Assist with saving addresses and payment methods for quick checkout' : ''}

Available Payment Methods:
- Credit/Debit Card
- PromptPay (QR Code)
- Internet Banking (Bangkok Bank, Kasikorn Bank, SCB, etc.)
- Mobile Banking (SCB Easy, KTB Next, etc.)
${additionalFeatures}

Guidelines:
- Be conversational and friendly
- Explain payment options clearly
- Ensure customer understands the amount and currency
- Confirm before processing payment
- Provide clear next steps after payment
- Handle errors gracefully
${hasUserProfiles ? '- Offer to save payment information for faster future checkouts' : ''}

Current Session Status: ${session.status}
${session.customerId ? `Customer ID: ${session.customerId}` : ''}
${session.userId ? `User Profile ID: ${session.userId}` : ''}
`;
  }

  /**
   * Get available tools for the agent
   */
  private getTools(): Anthropic.Tool[] {
    const tools: Anthropic.Tool[] = [
      {
        name: 'process_card_payment',
        description: 'Process a credit/debit card payment. This should only be called after the customer confirms they want to pay with card and provides card details.',
        input_schema: {
          type: 'object',
          properties: {
            card_token: {
              type: 'string',
              description: 'The tokenized card token from Omise.js',
            },
            save_card: {
              type: 'boolean',
              description: 'Whether to save the card for future use',
              default: false,
            },
          },
          required: ['card_token'],
        },
      },
      {
        name: 'create_promptpay_payment',
        description: 'Create a PromptPay QR code payment. Returns a QR code that customer can scan.',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_internet_banking_payment',
        description: 'Create an internet banking payment link.',
        input_schema: {
          type: 'object',
          properties: {
            bank: {
              type: 'string',
              description: 'Bank code (e.g., bbl, kbank, scb, ktb)',
              enum: ['bbl', 'kbank', 'scb', 'ktb'],
            },
          },
          required: ['bank'],
        },
      },
      {
        name: 'check_payment_status',
        description: 'Check the status of a payment charge.',
        input_schema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'The charge ID to check',
            },
          },
          required: ['charge_id'],
        },
      },
    ];

    // Add e-commerce platform tools if available
    if (this.ecommercePlatformManager) {
      tools.push(
        {
          name: 'search_product_by_sku',
          description: 'Search for a product by SKU code in the e-commerce platform',
          input_schema: {
            type: 'object',
            properties: {
              sku: {
                type: 'string',
                description: 'The SKU code to search for',
              },
            },
            required: ['sku'],
          },
        },
        {
          name: 'add_product_to_cart',
          description: 'Add a product to the shopping cart by product ID',
          input_schema: {
            type: 'object',
            properties: {
              product_id: {
                type: 'string',
                description: 'The product ID to add',
              },
              quantity: {
                type: 'number',
                description: 'Quantity to add',
                default: 1,
              },
            },
            required: ['product_id'],
          },
        },
        {
          name: 'update_cart_item',
          description: 'Update the quantity of a cart item',
          input_schema: {
            type: 'object',
            properties: {
              cart_item_id: {
                type: 'string',
                description: 'The cart item ID to update',
              },
              quantity: {
                type: 'number',
                description: 'New quantity (0 to remove)',
              },
            },
            required: ['cart_item_id', 'quantity'],
          },
        },
        {
          name: 'list_products',
          description: 'List available products from the e-commerce platform',
          input_schema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of products to return',
                default: 10,
              },
              search: {
                type: 'string',
                description: 'Search term to filter products',
              },
            },
          },
        }
      );
    }

    // Add user profile tools if available
    if (this.userProfileService) {
      tools.push(
        {
          name: 'save_shipping_address',
          description: 'Save a shipping address to the user profile for future use',
          input_schema: {
            type: 'object',
            properties: {
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              address1: { type: 'string', description: 'Street address' },
              address2: { type: 'string', description: 'Apartment, suite, etc.' },
              city: { type: 'string' },
              state: { type: 'string', description: 'State or province' },
              postal_code: { type: 'string' },
              country: { type: 'string' },
              phone: { type: 'string' },
              label: { type: 'string', description: 'Label like "Home" or "Office"' },
              is_default: { type: 'boolean', description: 'Set as default address' },
            },
            required: ['first_name', 'last_name', 'address1', 'city', 'state', 'postal_code', 'country'],
          },
        },
        {
          name: 'save_billing_address',
          description: 'Save a billing address to the user profile for future use',
          input_schema: {
            type: 'object',
            properties: {
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              address1: { type: 'string', description: 'Street address' },
              address2: { type: 'string', description: 'Apartment, suite, etc.' },
              city: { type: 'string' },
              state: { type: 'string', description: 'State or province' },
              postal_code: { type: 'string' },
              country: { type: 'string' },
              phone: { type: 'string' },
              label: { type: 'string', description: 'Label like "Home" or "Office"' },
              is_default: { type: 'boolean', description: 'Set as default address' },
            },
            required: ['first_name', 'last_name', 'address1', 'city', 'state', 'postal_code', 'country'],
          },
        },
        {
          name: 'get_saved_addresses',
          description: 'Get saved shipping and billing addresses for the user',
          input_schema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'save_payment_method',
          description: 'Save a payment method to the user profile for quick checkout',
          input_schema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['card', 'promptpay', 'internet_banking'],
                description: 'Payment method type',
              },
              card_token: { type: 'string', description: 'Card token (for card payments)' },
              card_brand: { type: 'string', description: 'Card brand (Visa, Mastercard, etc.)' },
              card_last_digits: { type: 'string', description: 'Last 4 digits of card' },
              card_expiry_month: { type: 'string', description: 'Card expiry month' },
              card_expiry_year: { type: 'string', description: 'Card expiry year' },
              card_holder_name: { type: 'string', description: 'Cardholder name' },
              bank_code: { type: 'string', description: 'Bank code (for internet banking)' },
              is_default: { type: 'boolean', description: 'Set as default payment method' },
            },
            required: ['type'],
          },
        },
        {
          name: 'get_quick_checkout_data',
          description: 'Get saved addresses and payment method for quick checkout',
          input_schema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'process_quick_checkout',
          description: 'Process payment using saved payment method and addresses',
          input_schema: {
            type: 'object',
            properties: {
              use_saved_payment: {
                type: 'boolean',
                description: 'Use the saved default payment method',
                default: true,
              },
            },
          },
        }
      );
    }

    return tools;
  }

  /**
   * Handle tool calls from Claude
   */
  private async handleToolCall(
    toolName: string,
    input: any,
    session: CheckoutSession
  ): Promise<string> {
    try {
      switch (toolName) {
        case 'process_card_payment':
          return await this.processCardPayment(input.card_token, session);

        case 'create_promptpay_payment':
          return await this.createPromptPayPayment(session);

        case 'create_internet_banking_payment':
          return await this.createInternetBankingPayment(input.bank, session);

        case 'check_payment_status':
          return await this.checkPaymentStatus(input.charge_id);

        // E-commerce platform tools
        case 'search_product_by_sku':
          return await this.searchProductBySku(input.sku);

        case 'add_product_to_cart':
          return await this.addProductToCart(session, input.product_id, input.quantity || 1);

        case 'update_cart_item':
          return await this.updateCartItem(session, input.cart_item_id, input.quantity);

        case 'list_products':
          return await this.listProducts(input.limit || 10, input.search);

        // User profile tools
        case 'save_shipping_address':
          return await this.saveShippingAddress(session, input);

        case 'save_billing_address':
          return await this.saveBillingAddress(session, input);

        case 'get_saved_addresses':
          return await this.getSavedAddresses(session);

        case 'save_payment_method':
          return await this.savePaymentMethod(session, input);

        case 'get_quick_checkout_data':
          return await this.getQuickCheckoutData(session);

        case 'process_quick_checkout':
          return await this.processQuickCheckout(session, input.use_saved_payment);

        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  /**
   * Process card payment
   */
  private async processCardPayment(
    cardToken: string,
    session: CheckoutSession
  ): Promise<string> {
    const charge = await this.omiseService.createCharge({
      amount: session.totalAmount,
      currency: session.currency,
      source: cardToken,
      description: `Order payment - Session ${session.sessionId}`,
      metadata: {
        sessionId: session.sessionId,
        items: JSON.stringify(session.cart),
      },
    });

    if (charge.status === 'successful' || charge.status === 'pending') {
      session.status = charge.status === 'successful' ? 'completed' : 'pending_payment';
      return `Payment processed successfully! Charge ID: ${charge.id}, Status: ${charge.status}`;
    } else {
      return `Payment failed: ${charge.failure_message || 'Unknown error'}`;
    }
  }

  /**
   * Create PromptPay payment
   */
  private async createPromptPayPayment(session: CheckoutSession): Promise<string> {
    const source = await this.omiseService.createSource({
      type: 'promptpay',
      amount: session.totalAmount,
      currency: session.currency,
    });

    const charge = await this.omiseService.createCharge({
      amount: session.totalAmount,
      currency: session.currency,
      source: source.id,
      description: `Order payment - Session ${session.sessionId}`,
      return_uri: `http://localhost:3000/checkout/callback/${session.sessionId}`,
    });

    session.status = 'pending_payment';

    return `PromptPay QR code generated! Scan URL: ${source.scannable_code?.image?.download_uri || charge.authorize_uri}\nCharge ID: ${charge.id}`;
  }

  /**
   * Create internet banking payment
   */
  private async createInternetBankingPayment(
    bank: string,
    session: CheckoutSession
  ): Promise<string> {
    const bankTypes: Record<string, string> = {
      bbl: 'internet_banking_bbl',
      kbank: 'internet_banking_kbank',
      scb: 'internet_banking_scb',
      ktb: 'internet_banking_ktb',
    };

    const source = await this.omiseService.createSource({
      type: bankTypes[bank] || 'internet_banking_bbl',
      amount: session.totalAmount,
      currency: session.currency,
    });

    const charge = await this.omiseService.createCharge({
      amount: session.totalAmount,
      currency: session.currency,
      source: source.id,
      description: `Order payment - Session ${session.sessionId}`,
      return_uri: `http://localhost:3000/checkout/callback/${session.sessionId}`,
    });

    session.status = 'pending_payment';

    return `Internet banking payment created! Please visit: ${charge.authorize_uri}\nCharge ID: ${charge.id}`;
  }

  /**
   * Check payment status
   */
  private async checkPaymentStatus(chargeId: string): Promise<string> {
    const charge = await this.omiseService.getCharge(chargeId);
    return `Payment status: ${charge.status}, Amount: ${this.formatAmount(charge.amount, charge.currency)}`;
  }

  /**
   * Calculate cart total
   */
  private calculateTotal(cart: CartItem[]): number {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Format amount with currency
   */
  private formatAmount(amount: number, currency: string): string {
    const formatted = (amount / 100).toFixed(2);
    return `${formatted} ${currency}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // E-commerce Platform Methods

  /**
   * Search product by SKU
   */
  private async searchProductBySku(sku: string): Promise<string> {
    if (!this.ecommercePlatformManager) {
      return 'E-commerce platform integration is not available';
    }

    const product = await this.ecommercePlatformManager.searchProductBySku(sku);

    if (!product) {
      return `No product found with SKU: ${sku}`;
    }

    return `Found product: ${product.name}\nSKU: ${product.sku}\nPrice: ${this.formatAmount(product.price, product.currency)}\nStock: ${product.stock}\nDescription: ${product.description}`;
  }

  /**
   * Add product to cart
   */
  private async addProductToCart(session: CheckoutSession, productId: string, quantity: number): Promise<string> {
    if (!this.ecommercePlatformManager) {
      return 'E-commerce platform integration is not available';
    }

    const product = await this.ecommercePlatformManager.getProduct(productId);

    const cartItem: CartItem = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      quantity,
    };

    session.cart.push(cartItem);
    session.totalAmount = this.calculateTotal(session.cart);

    return `Added ${quantity}x ${product.name} to cart. New total: ${this.formatAmount(session.totalAmount, session.currency)}`;
  }

  /**
   * Update cart item quantity
   */
  private async updateCartItem(session: CheckoutSession, cartItemId: string, quantity: number): Promise<string> {
    const itemIndex = session.cart.findIndex((item) => item.id === cartItemId);

    if (itemIndex === -1) {
      return `Cart item with ID ${cartItemId} not found`;
    }

    if (quantity === 0) {
      const removedItem = session.cart.splice(itemIndex, 1)[0];
      session.totalAmount = this.calculateTotal(session.cart);
      return `Removed ${removedItem.name} from cart. New total: ${this.formatAmount(session.totalAmount, session.currency)}`;
    }

    session.cart[itemIndex].quantity = quantity;
    session.totalAmount = this.calculateTotal(session.cart);

    return `Updated ${session.cart[itemIndex].name} quantity to ${quantity}. New total: ${this.formatAmount(session.totalAmount, session.currency)}`;
  }

  /**
   * List products from e-commerce platform
   */
  private async listProducts(limit: number, search?: string): Promise<string> {
    if (!this.ecommercePlatformManager) {
      return 'E-commerce platform integration is not available';
    }

    const products = await this.ecommercePlatformManager.listProducts({ limit, search });

    if (products.length === 0) {
      return 'No products found';
    }

    const productList = products
      .map((p) => `- ${p.name} (SKU: ${p.sku}) - ${this.formatAmount(p.price, p.currency)} - Stock: ${p.stock}`)
      .join('\n');

    return `Available products:\n${productList}`;
  }

  // User Profile Methods

  /**
   * Save shipping address
   */
  private async saveShippingAddress(session: CheckoutSession, address: any): Promise<string> {
    if (!this.userProfileService) {
      return 'User profile service is not available';
    }

    if (!session.userId) {
      return 'No user profile associated with this session. Please create a user profile first.';
    }

    const savedAddress = await this.userProfileService.addShippingAddress(session.userId, {
      firstName: address.first_name,
      lastName: address.last_name,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
      phone: address.phone,
      label: address.label,
      isDefault: address.is_default || false,
    });

    session.shippingAddressId = savedAddress.id;

    return `Shipping address saved successfully! ${savedAddress.isDefault ? '(Set as default)' : ''}\nAddress ID: ${savedAddress.id}`;
  }

  /**
   * Save billing address
   */
  private async saveBillingAddress(session: CheckoutSession, address: any): Promise<string> {
    if (!this.userProfileService) {
      return 'User profile service is not available';
    }

    if (!session.userId) {
      return 'No user profile associated with this session. Please create a user profile first.';
    }

    const savedAddress = await this.userProfileService.addBillingAddress(session.userId, {
      firstName: address.first_name,
      lastName: address.last_name,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
      phone: address.phone,
      label: address.label,
      isDefault: address.is_default || false,
    });

    session.billingAddressId = savedAddress.id;

    return `Billing address saved successfully! ${savedAddress.isDefault ? '(Set as default)' : ''}\nAddress ID: ${savedAddress.id}`;
  }

  /**
   * Get saved addresses
   */
  private async getSavedAddresses(session: CheckoutSession): Promise<string> {
    if (!this.userProfileService) {
      return 'User profile service is not available';
    }

    if (!session.userId) {
      return 'No user profile associated with this session.';
    }

    const profile = await this.userProfileService.getProfile(session.userId);
    if (!profile) {
      return 'User profile not found';
    }

    const shippingAddresses = profile.shippingAddresses
      .map((addr) => `- ${addr.label || 'Address'}: ${addr.address1}, ${addr.city}, ${addr.state} ${addr.postalCode}${addr.isDefault ? ' (Default)' : ''}`)
      .join('\n');

    const billingAddresses = profile.billingAddresses
      .map((addr) => `- ${addr.label || 'Address'}: ${addr.address1}, ${addr.city}, ${addr.state} ${addr.postalCode}${addr.isDefault ? ' (Default)' : ''}`)
      .join('\n');

    return `Shipping Addresses:\n${shippingAddresses || 'None saved'}\n\nBilling Addresses:\n${billingAddresses || 'None saved'}`;
  }

  /**
   * Save payment method
   */
  private async savePaymentMethod(session: CheckoutSession, paymentMethod: any): Promise<string> {
    if (!this.userProfileService) {
      return 'User profile service is not available';
    }

    if (!session.userId) {
      return 'No user profile associated with this session. Please create a user profile first.';
    }

    const savedMethod = await this.userProfileService.addPaymentMethod(session.userId, {
      type: paymentMethod.type,
      cardToken: paymentMethod.card_token,
      cardBrand: paymentMethod.card_brand,
      cardLastDigits: paymentMethod.card_last_digits,
      cardExpiryMonth: paymentMethod.card_expiry_month,
      cardExpiryYear: paymentMethod.card_expiry_year,
      cardHolderName: paymentMethod.card_holder_name,
      bankCode: paymentMethod.bank_code,
      isDefault: paymentMethod.is_default || false,
    });

    session.paymentMethodId = savedMethod.id;

    return `Payment method saved successfully! ${savedMethod.isDefault ? '(Set as default)' : ''}\nPayment Method ID: ${savedMethod.id}`;
  }

  /**
   * Get quick checkout data
   */
  private async getQuickCheckoutData(session: CheckoutSession): Promise<string> {
    if (!this.userProfileService) {
      return 'User profile service is not available';
    }

    if (!session.userId) {
      return 'No user profile associated with this session.';
    }

    const checkoutData = await this.userProfileService.getQuickCheckoutData(session.userId);

    let result = 'Quick Checkout Data:\n\n';

    if (checkoutData.shippingAddress) {
      result += `Shipping Address: ${checkoutData.shippingAddress.address1}, ${checkoutData.shippingAddress.city}, ${checkoutData.shippingAddress.state}\n`;
    } else {
      result += 'Shipping Address: Not saved\n';
    }

    if (checkoutData.billingAddress) {
      result += `Billing Address: ${checkoutData.billingAddress.address1}, ${checkoutData.billingAddress.city}, ${checkoutData.billingAddress.state}\n`;
    } else {
      result += 'Billing Address: Not saved\n';
    }

    if (checkoutData.paymentMethod) {
      const pm = checkoutData.paymentMethod;
      if (pm.type === 'card') {
        result += `Payment Method: ${pm.cardBrand || 'Card'} ending in ${pm.cardLastDigits}\n`;
      } else {
        result += `Payment Method: ${pm.type}\n`;
      }
    } else {
      result += 'Payment Method: Not saved\n';
    }

    return result;
  }

  /**
   * Process quick checkout with saved payment method
   */
  private async processQuickCheckout(session: CheckoutSession, useSavedPayment: boolean = true): Promise<string> {
    if (!this.userProfileService) {
      return 'User profile service is not available';
    }

    if (!session.userId) {
      return 'No user profile associated with this session. Cannot process quick checkout.';
    }

    const checkoutData = await this.userProfileService.getQuickCheckoutData(session.userId);

    if (!checkoutData.paymentMethod) {
      return 'No saved payment method found. Please add a payment method first.';
    }

    const paymentMethod = checkoutData.paymentMethod;

    // Process payment based on saved method type
    let result = '';

    if (paymentMethod.type === 'card' && paymentMethod.cardToken) {
      result = await this.processCardPayment(paymentMethod.cardToken, session);
    } else if (paymentMethod.type === 'promptpay') {
      result = await this.createPromptPayPayment(session);
    } else if (paymentMethod.type === 'internet_banking' && paymentMethod.bankCode) {
      result = await this.createInternetBankingPayment(paymentMethod.bankCode, session);
    } else {
      return 'Saved payment method is incomplete or invalid.';
    }

    // Record the checkout in user profile
    if (session.status === 'completed') {
      await this.userProfileService.recordCheckout(session.userId, session.totalAmount);
    }

    return `Quick Checkout:\n${result}`;
  }
}
