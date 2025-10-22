# Omise Agent Checkout

A sophisticated AI-powered checkout solution that combines Omise payment gateway with Claude AI using the Model Context Protocol (MCP). This solution provides an intelligent, conversational checkout experience for e-commerce applications.

## ⚡ Quick Start

```bash
npm install
cp .env.example .env
# Add your API keys to .env
npm run build
npm run dev
# Visit http://localhost:3000
```

📖 **New to this project?** Start with the [Quick Start Guide](QUICKSTART.md) or [Complete Tutorial](TUTORIAL.md)

## Features

- **AI-Powered Checkout Agent**: Conversational checkout interface powered by Claude AI
- **Model Context Protocol (MCP)**: Standardized integration with Omise payment gateway
- **Adaptable Design System**: Complete design system with themes, components, and utilities
- **Multiple Payment Methods**:
  - Credit/Debit Cards
  - PromptPay (QR Code)
  - Internet Banking (Bangkok Bank, Kasikorn Bank, SCB, KTB)
  - Mobile Banking
- **Secure Payment Processing**: PCI-compliant tokenization via Omise.js
- **Real-time Chat Interface**: Natural language interaction for checkout
- **RESTful API**: Complete API for checkout sessions and payment processing
- **TypeScript**: Full type safety and modern development experience
- **4 Built-in Themes**: Default, Dark, Omise Brand, and Purple Gradient

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Web UI      │  │  Omise.js    │  │  Chat Agent  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Express API Server (index.ts)             │  │
│  └──────────────────────────────────────────────────┘  │
│           │                            │                │
│           ▼                            ▼                │
│  ┌─────────────────┐         ┌──────────────────────┐  │
│  │ Checkout Agent  │         │   Omise Service      │  │
│  │ Service         │◄────────│   (Payment Handler)  │  │
│  │ (Claude AI)     │         └──────────────────────┘  │
│  └─────────────────┘                   │                │
│           │                            │                │
└───────────┼────────────────────────────┼────────────────┘
            │                            │
            ▼                            ▼
   ┌─────────────────┐         ┌──────────────────┐
   │  Anthropic API  │         │  Omise Gateway   │
   │  (Claude)       │         │  (Payment API)   │
   └─────────────────┘         └──────────────────┘
```

### MCP Integration

```
┌─────────────────────────────────────────────────────────┐
│            MCP Server (stdio transport)                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Omise MCP Tools:                                  │ │
│  │  • create_charge        • create_customer          │ │
│  │  • get_charge           • get_customer             │ │
│  │  • list_charges         • create_token             │ │
│  │  • create_source        • refund_charge            │ │
│  │  • list_payment_methods                            │ │
│  └────────────────────────────────────────────────────┘ │
│                            │                             │
│                            ▼                             │
│                   ┌─────────────────┐                    │
│                   │  Omise Service  │                    │
│                   └─────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes
- **[Complete Tutorial](TUTORIAL.md)** - Step-by-step guide for everything
- **[Design System](DESIGN_SYSTEM.md)** - Complete design system documentation
- **[Code Examples](EXAMPLES.md)** - Practical code examples
- **[MCP Integration](MCP_INTEGRATION.md)** - Model Context Protocol guide

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Omise account ([sign up here](https://www.omise.co))
- Anthropic API key ([get one here](https://console.anthropic.com))

### Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd omise-agent-checkout
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
# Omise Configuration
OMISE_PUBLIC_KEY=pkey_test_your_public_key_here
OMISE_SECRET_KEY=skey_test_your_secret_key_here

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-your_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

4. **Build the project**:
```bash
npm run build
```

## Usage

### Development Mode

Start the development server with hot reload:
```bash
npm run dev
```

The application will be available at:
- **Main App**: `http://localhost:3000`
- **Design Showcase**: `http://localhost:3000/design-showcase.html`

### Production Mode

Build and start in production:
```bash
npm run build
npm start
```

### MCP Server Mode

Run the standalone MCP server:
```bash
npm run dev:mcp
```

This starts the MCP server on stdio, which can be used by MCP clients to interact with Omise payment gateway.

## Design System

The checkout solution includes a comprehensive design system with:

### Themes

Switch themes in the browser:
```javascript
const ds = new DesignSystem();
ds.setTheme('dark');     // Dark theme
ds.setTheme('omise');    // Omise brand colors
ds.setTheme('purple');   // Purple gradient
ds.setTheme('default');  // Default theme
```

Or use the theme switcher UI (paint brush icon in bottom-right corner).

### Components

Pre-built components for rapid development:
- Buttons (Primary, Secondary, Outline, Ghost)
- Cards with headers and footers
- Form inputs with validation states
- Badges and alerts
- Loading states (spinners, progress bars, skeletons)
- Modals and notifications
- Grid and layout utilities

See the [Design System Documentation](DESIGN_SYSTEM.md) for complete details.

### Design Showcase

View all components in action:
```
http://localhost:3000/design-showcase.html
```

## API Documentation

### Endpoints

#### `POST /api/checkout/session`
Create a new checkout session.

**Request**:
```json
{
  "cart": [
    {
      "id": "1",
      "name": "Product Name",
      "description": "Product description",
      "price": 100000,
      "quantity": 1
    }
  ],
  "currency": "THB"
}
```

**Response**:
```json
{
  "sessionId": "sess_1234567890_abc123",
  "totalAmount": 100000,
  "currency": "THB",
  "cart": [...]
}
```

#### `GET /api/checkout/session/:sessionId`
Get checkout session details.

**Response**:
```json
{
  "sessionId": "sess_1234567890_abc123",
  "cart": [...],
  "totalAmount": 100000,
  "currency": "THB",
  "status": "active",
  "conversationHistory": [...]
}
```

#### `POST /api/checkout/chat`
Send a message to the checkout agent.

**Request**:
```json
{
  "sessionId": "sess_1234567890_abc123",
  "message": "I want to pay with PromptPay"
}
```

**Response**:
```json
{
  "message": "Great! I'll generate a PromptPay QR code for you..."
}
```

#### `GET /api/payment-methods`
Get available payment methods.

**Response**:
```json
{
  "payment_methods": [
    {
      "name": "card",
      "currencies": ["THB", "USD", ...]
    },
    ...
  ]
}
```

## MCP Tools

The MCP server provides the following tools:

### `create_charge`
Create a payment charge.
```typescript
{
  amount: number,           // Amount in smallest currency unit
  currency: string,         // Currency code (THB, USD, etc.)
  source: string,          // Payment source token
  description?: string,    // Charge description
  customer?: string,       // Customer ID
  metadata?: object        // Additional metadata
}
```

### `create_source`
Create a payment source for alternative payment methods.
```typescript
{
  type: string,           // Payment method type (promptpay, internet_banking_bbl, etc.)
  amount: number,         // Amount in smallest currency unit
  currency: string        // Currency code
}
```

### `create_customer`
Create a customer profile.
```typescript
{
  email: string,          // Customer email
  description?: string,   // Customer description
  card?: string,         // Card token to attach
  metadata?: object      // Additional metadata
}
```

### `get_charge`
Retrieve charge details.
```typescript
{
  chargeId: string       // Charge ID to retrieve
}
```

### `refund_charge`
Refund a charge.
```typescript
{
  chargeId: string,      // Charge ID to refund
  amount?: number        // Amount to refund (optional, defaults to full refund)
}
```

## Payment Methods

### Credit/Debit Cards

The agent accepts major credit and debit cards through secure tokenization:

```javascript
// Frontend tokenization (automatic via Omise.js)
Omise.createToken('card', {
  name: 'Cardholder Name',
  number: '4242424242424242',
  expiration_month: 12,
  expiration_year: 2025,
  security_code: '123'
}, (statusCode, response) => {
  // Token received: response.id
});
```

### PromptPay

Thai mobile payment via QR code:
- Just tell the agent "I want to pay with PromptPay"
- Agent generates QR code
- Customer scans with banking app

### Internet Banking

Direct bank transfer support:
- Bangkok Bank (BBL)
- Kasikorn Bank (KBank)
- Siam Commercial Bank (SCB)
- Krung Thai Bank (KTB)

## Testing

### Test Cards

Use these test cards in the Omise test environment:

| Card Number | Description |
|-------------|-------------|
| 4242424242424242 | Successful charge |
| 4111111111111111 | Successful charge |
| 4000000000000002 | Charge declined |

### Test Flow

1. Start the application: `npm run dev`
2. Open browser: `http://localhost:3000`
3. Click "Start Checkout"
4. Chat with the agent: "I want to pay with credit card"
5. Use test card: Call `testCardPayment()` in browser console
6. Agent processes the payment

## Project Structure

```
omise-agent-checkout/
├── src/
│   ├── mcp/
│   │   └── server.ts              # MCP server implementation
│   ├── services/
│   │   ├── omise.service.ts       # Omise API wrapper
│   │   └── checkout-agent.service.ts  # AI checkout agent
│   └── index.ts                   # Express API server
├── public/
│   ├── index.html                 # Frontend HTML
│   ├── styles.css                 # Frontend styles
│   └── app.js                     # Frontend JavaScript
├── dist/                          # Compiled TypeScript output
├── .env.example                   # Environment variables template
├── package.json                   # Project dependencies
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## Security Best Practices

1. **Never commit secrets**: Keep `.env` file out of version control
2. **Use HTTPS**: Always use HTTPS in production
3. **Token handling**: Card tokens are single-use and never stored
4. **PCI Compliance**: Omise.js handles card data, never your server
5. **Validate inputs**: All user inputs are validated server-side
6. **Rate limiting**: Implement rate limiting in production
7. **CORS**: Configure CORS appropriately for your domain

## Deployment

### Environment Variables

Ensure these are set in your production environment:
- `OMISE_PUBLIC_KEY` - Your Omise public key
- `OMISE_SECRET_KEY` - Your Omise secret key (keep secret!)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (keep secret!)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to `production`

### Recommendations

- Use a process manager like PM2
- Enable HTTPS/TLS
- Set up monitoring and logging
- Configure proper CORS headers
- Implement rate limiting
- Use production API keys from Omise

## Integration with Claude Desktop

To use the MCP server with Claude Desktop, add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omise-payment": {
      "command": "node",
      "args": ["/path/to/omise-agent-checkout/dist/mcp/server.js"],
      "env": {
        "OMISE_PUBLIC_KEY": "pkey_test_...",
        "OMISE_SECRET_KEY": "skey_test_..."
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

**"Failed to create charge"**
- Check your Omise API keys
- Verify you're using test keys in development
- Check the amount is in smallest currency unit (e.g., 100000 for 1000.00 THB)

**"Token creation failed"**
- Verify Omise.js is loaded
- Check public key is set correctly
- Ensure card details are valid

**"Session not found"**
- Session may have expired
- Start a new checkout session

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues related to:
- **Omise API**: [Omise Documentation](https://docs.omise.co)
- **Anthropic/Claude**: [Anthropic Documentation](https://docs.anthropic.com)
- **MCP**: [MCP Specification](https://modelcontextprotocol.io)

## Acknowledgments

- Built with [Omise](https://www.omise.co) - Payment gateway for Southeast Asia
- Powered by [Claude](https://www.anthropic.com) - AI assistant by Anthropic
- Using [Model Context Protocol](https://modelcontextprotocol.io) - Open standard for AI integrations

---

Made with care for better payment experiences
