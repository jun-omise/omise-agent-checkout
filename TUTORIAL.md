# Omise Agent Checkout - Complete Tutorial

Welcome to the Omise Agent Checkout tutorial! This guide will walk you through everything from installation to deployment.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Your First Checkout](#your-first-checkout)
3. [Customizing the Design](#customizing-the-design)
4. [Payment Integration](#payment-integration)
5. [AI Agent Customization](#ai-agent-customization)
6. [Deploying to Production](#deploying-to-production)

---

## Getting Started

### Step 1: Prerequisites

Before you begin, make sure you have:

- **Node.js** version 18 or higher
- **npm** or **yarn** package manager
- A text editor (VS Code recommended)
- An **Omise account** (sign up at [omise.co](https://www.omise.co))
- An **Anthropic API key** (get one at [console.anthropic.com](https://console.anthropic.com))

### Step 2: Clone and Install

Open your terminal and run:

```bash
# Clone the repository
git clone <your-repo-url>
cd omise-agent-checkout

# Install dependencies
npm install
```

This will install all necessary packages including:
- Express (web server)
- Anthropic SDK (AI agent)
- Omise SDK (payments)
- TypeScript (type safety)

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open `.env` and add your credentials:

```env
# Omise Keys (get from https://dashboard.omise.co/test/keys)
OMISE_PUBLIC_KEY=pkey_test_5xtsn6w...
OMISE_SECRET_KEY=skey_test_5xtsn6w...

# Anthropic Key (get from https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Server Config
PORT=3000
NODE_ENV=development
```

**Important**:
- Use **test keys** during development (they start with `pkey_test` and `skey_test`)
- Never commit your `.env` file to version control
- Keep your secret keys secure

### Step 4: Build and Run

Build the TypeScript code:

```bash
npm run build
```

Start the development server:

```bash
npm run dev
```

You should see:

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║      Omise Agent Checkout Solution                       ║
║      Powered by AI & Model Context Protocol              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Server running on: http://localhost:3000
```

### Step 5: Test the Application

1. Open your browser to `http://localhost:3000`
2. You should see a sample shopping cart
3. Click "Start Checkout"
4. Try chatting with the AI agent!

---

## Your First Checkout

Let's process your first test payment.

### Step 1: Understanding the Flow

The checkout process works like this:

```
User adds items to cart
    ↓
Creates checkout session
    ↓
Chats with AI agent about payment
    ↓
Agent helps select payment method
    ↓
Payment is processed
    ↓
Success confirmation
```

### Step 2: Create a Checkout Session

In the browser console, try:

```javascript
// Create a checkout session
const response = await fetch('/api/checkout/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cart: [
      {
        id: 'prod_001',
        name: 'Test Product',
        description: 'A test product',
        price: 100000,  // 1000.00 THB (in smallest unit)
        quantity: 1
      }
    ],
    currency: 'THB'
  })
});

const session = await response.json();
console.log('Session created:', session);
```

You'll get a response like:

```json
{
  "sessionId": "sess_1234567890_abc123",
  "totalAmount": 100000,
  "currency": "THB",
  "cart": [...]
}
```

### Step 3: Chat with the Agent

Now try chatting:

```javascript
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

The AI agent will respond with available payment methods!

### Step 4: Process a Test Payment

For testing, use Omise's test cards:

| Card Number | Result |
|-------------|--------|
| 4242424242424242 | Success |
| 4000000000000002 | Declined |

In the browser console:

```javascript
// This function is already available in app.js
testCardPayment();
```

This will:
1. Create a card token using Omise.js
2. Send it to the AI agent
3. Process the payment
4. Show the result

---

## Customizing the Design

### Step 1: Understanding the Design System

The design system consists of:
- **design-system.css**: Core tokens and variables
- **components.css**: Reusable components
- **styles.css**: Application-specific styles

### Step 2: Change the Theme

The easiest way to customize is by changing the theme. Open your browser console:

```javascript
// Initialize design system
const ds = new DesignSystem();

// Change to dark theme
ds.setTheme('dark');

// Or Omise brand theme
ds.setTheme('omise');

// Or purple gradient
ds.setTheme('purple');
```

### Step 3: Create Your Own Theme

Edit `public/design-system.css` and add your theme:

```css
[data-theme="custom"] {
  --theme-background: #f0f4f8;
  --theme-surface: #ffffff;
  --theme-primary: #0066cc;
  --theme-primary-hover: #0052a3;
  --theme-secondary: #00cc99;
  --theme-text-primary: #1a202c;
  --theme-text-secondary: #4a5568;
  --theme-text-disabled: #a0aec0;
  --theme-border: #cbd5e0;
  --theme-divider: #e2e8f0;
}
```

Then use it:

```javascript
ds.setTheme('custom');
```

### Step 4: Customize Colors

Want to change just the primary color? Add this to your CSS:

```css
:root {
  --theme-primary: #ff6b35;  /* Your brand color */
  --theme-primary-hover: #e85d2e;
}
```

### Step 5: Customize Typography

Change fonts in `design-system.css`:

```css
:root {
  --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-base: 1.125rem;  /* Larger base font */
}
```

### Step 6: Use Design System Components

The design system includes pre-built components. Example:

```html
<!-- Button variants -->
<button class="btn btn-primary">Primary Button</button>
<button class="btn btn-secondary">Secondary Button</button>
<button class="btn btn-outline">Outline Button</button>

<!-- Cards -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <p class="card-description">Card description</p>
  </div>
  <div class="card-body">
    Content goes here
  </div>
</div>

<!-- Badges -->
<span class="badge badge-success">Success</span>
<span class="badge badge-error">Error</span>

<!-- Alerts -->
<div class="alert alert-info">
  This is an info alert
</div>
```

### Step 7: Show Notifications

Use the built-in notification system:

```javascript
// Success notification
DesignSystem.showNotification('Payment successful!', 'success');

// Error notification
DesignSystem.showNotification('Payment failed', 'error');

// Warning
DesignSystem.showNotification('Please verify your card', 'warning');

// Info (auto-dismiss after 5 seconds)
DesignSystem.showNotification('Processing payment...', 'info', 5000);
```

---

## Payment Integration

### Step 1: Understanding Omise Payment Flow

```
Frontend (Browser)
    ↓
Creates card token with Omise.js (secure, PCI-compliant)
    ↓
Sends token to your server
    ↓
Server creates charge with token
    ↓
Omise processes payment
    ↓
Returns result
```

### Step 2: Accept Credit Card Payments

The card payment flow is already implemented. Here's how it works:

**Frontend** (`public/app.js`):

```javascript
// User enters card details (this should be in a form)
const cardData = {
  name: 'John Doe',
  number: '4242424242424242',
  expiration_month: 12,
  expiration_year: 2025,
  security_code: '123'
};

// Tokenize with Omise.js (runs in browser, secure)
Omise.createToken('card', cardData, async (statusCode, response) => {
  if (response.object === 'error') {
    console.error('Tokenization failed:', response.message);
    return;
  }

  // Send token to server via AI agent
  const result = await fetch('/api/checkout/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: currentSession.sessionId,
      message: `Process payment with token: ${response.id}`
    })
  });

  const data = await result.json();
  console.log('Payment result:', data.message);
});
```

### Step 3: Accept PromptPay Payments

PromptPay is popular in Thailand. The AI agent handles this:

```javascript
// Just ask the agent in natural language!
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
```

The agent will:
1. Create a PromptPay source
2. Create a charge
3. Return QR code for scanning

### Step 4: Accept Internet Banking

Similar flow for internet banking:

```javascript
await fetch('/api/checkout/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: sessionId,
    message: 'I want to pay with Bangkok Bank internet banking'
  })
});
```

Supported banks:
- Bangkok Bank (BBL)
- Kasikorn Bank (KBank)
- Siam Commercial Bank (SCB)
- Krung Thai Bank (KTB)

### Step 5: Handle Payment Webhooks

Omise sends webhooks for payment events. Add this to `src/index.ts`:

```typescript
app.post('/webhooks/omise', express.json(), async (req, res) => {
  const event = req.body;

  console.log('Webhook received:', event.key);

  switch (event.key) {
    case 'charge.complete':
      // Payment completed successfully
      await handlePaymentSuccess(event.data);
      break;

    case 'charge.create':
      // New charge created
      console.log('New charge:', event.data.id);
      break;

    case 'refund.create':
      // Refund processed
      await handleRefund(event.data);
      break;
  }

  res.json({ received: true });
});
```

### Step 6: Test Different Scenarios

Use Omise test cards to test different scenarios:

```javascript
// Test successful payment
const successCard = '4242424242424242';

// Test declined payment
const declinedCard = '4000000000000002';

// Test insufficient funds
const insufficientCard = '4000000000009995';

// Test incorrect CVC
const incorrectCVC = '4000000000000127';
```

---

## AI Agent Customization

### Step 1: Understand the Agent

The AI agent is powered by Claude and is defined in `src/services/checkout-agent.service.ts`.

### Step 2: Customize Agent Personality

Edit the system prompt in `buildSystemPrompt()`:

```typescript
private buildSystemPrompt(session: CheckoutSession): string {
  const cartSummary = // ... cart details

  return `You are Alex, a friendly and efficient checkout assistant.

Your personality:
- Professional yet warm
- Patient with customer questions
- Proactive in suggesting solutions
- Clear and concise in explanations

Your tone:
- Use casual language
- Be encouraging
- Show empathy
- Celebrate successful payments

Current Order:
${cartSummary}

Total: ${this.formatAmount(session.totalAmount, session.currency)}

Remember: Always confirm before processing payments!
`;
}
```

### Step 3: Add Custom Tools

Add new capabilities to the agent. In `getTools()`:

```typescript
private getTools(): Anthropic.Tool[] {
  return [
    // Existing tools...

    // New custom tool
    {
      name: 'apply_discount',
      description: 'Apply a discount code to the order',
      input_schema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The discount code to apply'
          }
        },
        required: ['code']
      }
    }
  ];
}
```

Then implement the handler:

```typescript
private async handleToolCall(toolName: string, input: any, session: CheckoutSession) {
  switch (toolName) {
    // Existing cases...

    case 'apply_discount':
      return await this.applyDiscount(input.code, session);

    default:
      return `Unknown tool: ${toolName}`;
  }
}

private async applyDiscount(code: string, session: CheckoutSession): Promise<string> {
  const discounts: Record<string, number> = {
    'SAVE10': 0.10,  // 10% off
    'SAVE20': 0.20,  // 20% off
    'WELCOME': 0.15  // 15% off
  };

  const discount = discounts[code.toUpperCase()];

  if (!discount) {
    return `Sorry, discount code "${code}" is not valid.`;
  }

  const discountAmount = Math.floor(session.totalAmount * discount);
  session.totalAmount -= discountAmount;

  return `Discount code "${code}" applied! You saved ${this.formatAmount(discountAmount, session.currency)}. New total: ${this.formatAmount(session.totalAmount, session.currency)}`;
}
```

### Step 4: Handle Complex Conversations

The agent maintains conversation history. You can add context:

```typescript
// In chat() method, before calling Claude:
const contextMessage = {
  role: 'user' as const,
  content: `Context: Customer has been shopping for ${this.getShoppingDuration(session)} minutes.`
};

// Include in messages array
```

### Step 5: Add Memory and Persistence

Store important information:

```typescript
export interface CheckoutSession {
  sessionId: string;
  customerId?: string;
  cart: CartItem[];
  totalAmount: number;
  currency: string;
  conversationHistory: Message[];
  paymentMethod?: string;
  status: 'active' | 'pending_payment' | 'completed' | 'cancelled';

  // Add custom fields
  customerPreferences?: {
    preferredPaymentMethod?: string;
    language?: string;
    notifications?: boolean;
  };
  discountCode?: string;
  appliedDiscounts?: number;
}
```

---

## Deploying to Production

### Step 1: Prepare for Production

1. **Get Production API Keys**

Visit your Omise dashboard and get production keys (start with `pkey_` and `skey_`).

2. **Update Environment Variables**

Create production `.env`:

```env
OMISE_PUBLIC_KEY=pkey_live_your_production_key
OMISE_SECRET_KEY=skey_live_your_production_key
ANTHROPIC_API_KEY=sk-ant-your_key
PORT=3000
NODE_ENV=production
```

3. **Build for Production**

```bash
npm run build
```

### Step 2: Deploy to a Server

#### Option A: Deploy to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-checkout-app

# Set environment variables
heroku config:set OMISE_PUBLIC_KEY=pkey_live_...
heroku config:set OMISE_SECRET_KEY=skey_live_...
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Open app
heroku open
```

#### Option B: Deploy to DigitalOcean

```bash
# Create a droplet with Node.js

# SSH into server
ssh root@your-server-ip

# Clone repository
git clone your-repo
cd omise-agent-checkout

# Install dependencies
npm install

# Build
npm run build

# Install PM2 (process manager)
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name checkout-app

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option C: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
# https://vercel.com/docs/environment-variables
```

### Step 3: Set Up HTTPS

**Critical**: Always use HTTPS in production for security.

With Let's Encrypt (free):

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 4: Configure Webhooks

Set up Omise webhooks to receive payment events:

1. Go to Omise Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/webhooks/omise`
3. Select events to receive:
   - `charge.complete`
   - `charge.create`
   - `refund.create`

### Step 5: Monitor and Log

Set up logging:

```typescript
// Add to src/index.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Use logger
logger.info('Payment processed', { chargeId: charge.id, amount: charge.amount });
logger.error('Payment failed', { error: error.message });
```

### Step 6: Security Checklist

Before going live:

- [ ] Use production API keys
- [ ] Enable HTTPS
- [ ] Set secure CORS headers
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Set up monitoring and alerts
- [ ] Test all payment methods
- [ ] Verify webhook signature
- [ ] Review error handling
- [ ] Set up backup and recovery

### Step 7: Performance Optimization

```typescript
// Add compression
import compression from 'compression';
app.use(compression());

// Add caching headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
});

// Add rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

---

## Next Steps

Congratulations! You've completed the tutorial. Here's what to explore next:

1. **Read the Examples** → [EXAMPLES.md](EXAMPLES.md)
2. **Learn MCP Integration** → [MCP_INTEGRATION.md](MCP_INTEGRATION.md)
3. **Explore the API** → [README.md](README.md#api-documentation)
4. **Join the Community** → Open issues or discussions on GitHub

---

## Getting Help

- **Documentation Issues**: Open an issue on GitHub
- **Omise API**: https://docs.omise.co
- **Anthropic/Claude**: https://docs.anthropic.com
- **MCP**: https://modelcontextprotocol.io

Happy building!
