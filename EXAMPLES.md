# Omise Agent Checkout - Examples

This document provides practical examples of using the Omise Agent Checkout solution.

## Table of Contents

1. [Basic Checkout Flow](#basic-checkout-flow)
2. [Payment Method Examples](#payment-method-examples)
3. [API Integration Examples](#api-integration-examples)
4. [MCP Server Examples](#mcp-server-examples)
5. [Advanced Use Cases](#advanced-use-cases)

## Basic Checkout Flow

### Example 1: Simple Product Purchase

```javascript
// 1. Create a cart
const cart = [
  {
    id: 'prod_001',
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling headphones',
    price: 499900, // 4999.00 THB
    quantity: 1
  }
];

// 2. Create checkout session
const response = await fetch('/api/checkout/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cart, currency: 'THB' })
});

const session = await response.json();
console.log('Session created:', session.sessionId);

// 3. Chat with agent
const chatResponse = await fetch('/api/checkout/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.sessionId,
    message: 'What payment methods do you accept?'
  })
});

const { message } = await chatResponse.json();
console.log('Agent:', message);
```

### Example 2: Multi-Item Cart

```javascript
const cart = [
  {
    id: 'laptop_001',
    name: 'MacBook Pro 16"',
    price: 9999000, // 99,990.00 THB
    quantity: 1
  },
  {
    id: 'mouse_001',
    name: 'Magic Mouse',
    price: 290000, // 2,900.00 THB
    quantity: 2
  },
  {
    id: 'keyboard_001',
    name: 'Magic Keyboard',
    price: 390000, // 3,900.00 THB
    quantity: 1
  }
];

// Total: 99,990 + (2,900 * 2) + 3,900 = 109,690.00 THB
const session = await createCheckoutSession(cart);
```

## Payment Method Examples

### Credit/Debit Card Payment

```javascript
// Frontend: Create card token with Omise.js
Omise.setPublicKey('pkey_test_xxx');

Omise.createToken('card', {
  name: 'John Doe',
  number: '4242424242424242',
  expiration_month: 12,
  expiration_year: 2025,
  security_code: '123'
}, async (statusCode, response) => {
  if (response.object === 'error') {
    console.error('Token error:', response.message);
    return;
  }

  // Send token to agent
  const chatResponse = await fetch('/api/checkout/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: currentSessionId,
      message: `Please process payment with card token: ${response.id}`
    })
  });

  const result = await chatResponse.json();
  console.log('Payment result:', result.message);
});
```

### PromptPay QR Code Payment

```javascript
// Simply ask the agent
const response = await fetch('/api/checkout/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: sessionId,
    message: 'I want to pay with PromptPay'
  })
});

const { message } = await response.json();
// Agent will respond with QR code URL
// Example response: "PromptPay QR code generated! Scan URL: https://..."
```

### Internet Banking Payment

```javascript
// Request internet banking payment
const response = await fetch('/api/checkout/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: sessionId,
    message: 'I want to pay with Bangkok Bank internet banking'
  })
});

const { message } = await response.json();
// Agent will provide payment URL
// Customer will be redirected to bank's payment page
```

## API Integration Examples

### Example 1: E-commerce Integration

```javascript
class CheckoutService {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
  }

  async createCheckout(orderId, items) {
    // Convert order items to cart format
    const cart = items.map(item => ({
      id: item.productId,
      name: item.productName,
      description: item.description,
      price: item.unitPrice * 100, // Convert to smallest unit
      quantity: item.quantity
    }));

    // Create session
    const response = await fetch(`${this.baseUrl}/checkout/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, currency: 'THB' })
    });

    return await response.json();
  }

  async sendMessage(sessionId, message) {
    const response = await fetch(`${this.baseUrl}/checkout/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });

    return await response.json();
  }

  async getSession(sessionId) {
    const response = await fetch(`${this.baseUrl}/checkout/session/${sessionId}`);
    return await response.json();
  }
}

// Usage
const checkout = new CheckoutService();

// Create checkout for order
const session = await checkout.createCheckout('ORD-12345', [
  { productId: '1', productName: 'Product A', unitPrice: 100, quantity: 2 },
  { productId: '2', productName: 'Product B', unitPrice: 50, quantity: 1 }
]);

// Interact with agent
const response = await checkout.sendMessage(
  session.sessionId,
  'What are my payment options?'
);
```

### Example 2: Subscription Payment

```javascript
async function createSubscription(email, planId, amount) {
  // 1. Create checkout session
  const session = await fetch('/api/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart: [{
        id: planId,
        name: 'Monthly Subscription',
        description: 'Premium Plan',
        price: amount,
        quantity: 1
      }],
      currency: 'THB'
    })
  }).then(r => r.json());

  // 2. Ask agent to create customer profile
  await fetch('/api/checkout/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      message: `Create customer profile for ${email}`
    })
  });

  // 3. Process recurring payment
  await fetch('/api/checkout/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      message: 'Process payment and save card for future use'
    })
  });

  return session;
}
```

## MCP Server Examples

### Example 1: Using MCP Server Directly

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Connect to MCP server
const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/mcp/server.js'],
  env: {
    OMISE_PUBLIC_KEY: 'pkey_test_xxx',
    OMISE_SECRET_KEY: 'skey_test_xxx'
  }
});

const client = new Client({
  name: 'checkout-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const { tools } = await client.listTools();
console.log('Available tools:', tools.map(t => t.name));

// Create a charge
const result = await client.callTool({
  name: 'create_charge',
  arguments: {
    amount: 100000,
    currency: 'THB',
    source: 'tokn_test_xxx',
    description: 'Test payment'
  }
});

console.log('Charge created:', result);
```

### Example 2: MCP with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omise-payment": {
      "command": "node",
      "args": ["/Users/you/omise-agent-checkout/dist/mcp/server.js"],
      "env": {
        "OMISE_PUBLIC_KEY": "pkey_test_xxx",
        "OMISE_SECRET_KEY": "skey_test_xxx"
      }
    }
  }
}
```

Then in Claude Desktop:
```
User: Can you help me create a PromptPay payment for 5000 THB?

Claude: I'll create a PromptPay payment source for you.
[Uses create_source tool with type: 'promptpay', amount: 500000, currency: 'THB']
```

## Advanced Use Cases

### Example 1: Dynamic Pricing with Agent

```javascript
// Agent can help with pricing decisions
async function negotiatePrice(sessionId, requestedDiscount) {
  const response = await fetch('/api/checkout/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: `Can I get a ${requestedDiscount}% discount? I'm a regular customer.`
    })
  });

  const { message } = await response.json();
  return message;
}
```

### Example 2: Multi-Currency Support

```javascript
// Create session with different currency
const usdSession = await fetch('/api/checkout/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cart: [{
      id: '1',
      name: 'Product',
      price: 10000, // 100.00 USD
      quantity: 1
    }],
    currency: 'USD' // Instead of THB
  })
}).then(r => r.json());
```

### Example 3: Payment Status Polling

```javascript
async function waitForPayment(sessionId, chargeId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch('/api/checkout/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: `Check status of charge ${chargeId}`
      })
    });

    const { message } = await response.json();

    if (message.includes('successful')) {
      return { success: true, message };
    }

    if (message.includes('failed')) {
      return { success: false, message };
    }

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return { success: false, message: 'Payment timeout' };
}
```

### Example 4: Custom Webhook Handler

```javascript
import express from 'express';

const app = express();

// Webhook endpoint for Omise events
app.post('/webhooks/omise', express.json(), async (req, res) => {
  const event = req.body;

  console.log('Omise event:', event.key);

  switch (event.key) {
    case 'charge.complete':
      // Payment completed
      await handlePaymentComplete(event.data);
      break;

    case 'charge.create':
      // New charge created
      await handleChargeCreated(event.data);
      break;

    case 'refund.create':
      // Refund created
      await handleRefundCreated(event.data);
      break;
  }

  res.json({ received: true });
});

async function handlePaymentComplete(charge) {
  // Update order status
  console.log(`Payment completed: ${charge.id}`);

  // Notify customer
  // Update inventory
  // Send confirmation email
}
```

### Example 5: Testing with Mock Data

```javascript
// Test helper functions
class CheckoutTester {
  static async testCardPayment() {
    const session = await this.createTestSession();

    // Use Omise test card
    Omise.createToken('card', {
      name: 'Test User',
      number: '4242424242424242',
      expiration_month: 12,
      expiration_year: 2025,
      security_code: '123'
    }, async (statusCode, response) => {
      const result = await fetch('/api/checkout/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          message: `Process payment with token: ${response.id}`
        })
      });

      console.log('Test result:', await result.json());
    });
  }

  static async createTestSession() {
    return await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: [{
          id: 'test_1',
          name: 'Test Product',
          price: 100000,
          quantity: 1
        }],
        currency: 'THB'
      })
    }).then(r => r.json());
  }
}

// Run tests
CheckoutTester.testCardPayment();
```

## Conversation Examples

### Example 1: Customer Support

```
Customer: How much do I need to pay?
Agent: Your total is 15,290.00 THB. This includes:
- Premium Headphones (1x) - 4,999.00 THB
- Smart Watch (1x) - 8,999.00 THB
- Wireless Charger (1x) - 1,299.00 THB

Customer: Can I pay in installments?
Agent: I can help you with that! Omise supports installment plans with certain credit cards. Would you like to proceed with a card payment that supports installments?

Customer: Yes, I'll use my card
Agent: Great! Please provide your card details using the card form, and I'll process the payment for you.
```

### Example 2: Payment Method Selection

```
Customer: What's the fastest way to pay?
Agent: The fastest methods are:
1. Credit/Debit Card - Instant confirmation
2. PromptPay - Scan QR code with your mobile banking app (usually 1-2 minutes)

Which would you prefer?

Customer: PromptPay sounds easy
Agent: Perfect! I'll generate a PromptPay QR code for 15,290.00 THB. You can scan it with any Thai banking app to complete the payment.
[Generates QR code]
```

---

For more examples and documentation, visit the [main README](README.md).
