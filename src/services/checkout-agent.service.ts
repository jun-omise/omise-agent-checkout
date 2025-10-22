import Anthropic from '@anthropic-ai/sdk';
import { OmiseService } from './omise.service.js';

export interface CheckoutSession {
  sessionId: string;
  customerId?: string;
  cart: CartItem[];
  totalAmount: number;
  currency: string;
  conversationHistory: Message[];
  paymentMethod?: string;
  status: 'active' | 'pending_payment' | 'completed' | 'cancelled';
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
  private sessions: Map<string, CheckoutSession>;

  constructor(anthropicApiKey: string, omiseService: OmiseService) {
    this.anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });
    this.omiseService = omiseService;
    this.sessions = new Map();
  }

  /**
   * Create a new checkout session
   */
  createSession(cart: CartItem[], currency: string = 'THB'): CheckoutSession {
    const sessionId = this.generateSessionId();
    const totalAmount = this.calculateTotal(cart);

    const session: CheckoutSession = {
      sessionId,
      cart,
      totalAmount,
      currency,
      conversationHistory: [],
      status: 'active',
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

Available Payment Methods:
- Credit/Debit Card
- PromptPay (QR Code)
- Internet Banking (Bangkok Bank, Kasikorn Bank, SCB, etc.)
- Mobile Banking (SCB Easy, KTB Next, etc.)

Guidelines:
- Be conversational and friendly
- Explain payment options clearly
- Ensure customer understands the amount and currency
- Confirm before processing payment
- Provide clear next steps after payment
- Handle errors gracefully

Current Session Status: ${session.status}
${session.customerId ? `Customer ID: ${session.customerId}` : ''}
`;
  }

  /**
   * Get available tools for the agent
   */
  private getTools(): Anthropic.Tool[] {
    return [
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

        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (error: any) {
      return `Error processing payment: ${error.message}`;
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
}
