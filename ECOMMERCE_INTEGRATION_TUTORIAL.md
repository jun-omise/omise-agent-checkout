# E-commerce Platform Integration & Quick Checkout Tutorial

Complete guide for integrating Shopify, WooCommerce, and Magento with the Omise Agent Checkout solution, plus user profile management for quick checkout.

## Table of Contents

1. [Overview](#overview)
2. [User Profile Management](#user-profile-management)
3. [E-commerce Platform Integration](#e-commerce-platform-integration)
4. [Quick Checkout Feature](#quick-checkout-feature)
5. [AI Agent Integration](#ai-agent-integration)
6. [API Reference](#api-reference)
7. [Examples](#examples)

---

## Overview

The Omise Agent Checkout now supports:

- **Multi-platform Integration**: Connect to Shopify, WooCommerce, or Magento
- **Product Management**: Add, edit, search, and manage products via SKU
- **User Profiles**: Store shipping addresses, billing addresses, and payment methods
- **Quick Checkout**: One-click checkout with saved information
- **AI-Powered Shopping**: Natural language product search and cart management

### Key Features

✓ Search products by SKU across all connected platforms
✓ Add products to cart directly from your e-commerce store
✓ Save customer addresses for faster future checkouts
✓ Store payment methods securely (tokenized)
✓ Quick checkout with one command
✓ Conversational AI for the entire shopping experience

---

## User Profile Management

User profiles allow customers to save their information for faster checkouts.

### Creating a User Profile

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+66812345678"
  }'
```

**Response:**
```json
{
  "id": "user_1234567890_abc123",
  "email": "customer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+66812345678",
  "shippingAddresses": [],
  "billingAddresses": [],
  "paymentMethods": [],
  "preferences": {},
  "createdAt": "2025-10-24T10:00:00.000Z",
  "updatedAt": "2025-10-24T10:00:00.000Z",
  "totalOrders": 0,
  "totalSpent": 0
}
```

### Saving Addresses

Users can save multiple shipping and billing addresses with labels like "Home" or "Office".

**Via AI Agent (Conversational):**
```
User: Save my shipping address
Agent: I'd be happy to help you save your shipping address! Please provide:
        - First and last name
        - Street address
        - City, state, and postal code
        - Country
        - Phone number (optional)
        - A label like "Home" or "Office" (optional)

User: John Doe, 123 Main Street, Bangkok, Bangkok 10110, Thailand, +66812345678, Home
Agent: [Saves the address]
      Shipping address saved successfully! (Set as default)
      Address ID: addr_1234567890_xyz789
```

**Via API:**
```bash
# Save via checkout session (requires userId in session)
curl -X POST http://localhost:3000/api/checkout/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess_xxx",
    "message": "Save this as my shipping address: 123 Main St, Bangkok, Bangkok, 10110, Thailand"
  }'
```

### Saving Payment Methods

Payment methods are saved with tokens (never raw card data).

**Via AI Agent:**
```
User: Save my card for future purchases
Agent: I'll save your payment method. Please provide your card details,
       and I'll securely tokenize it.

User: [Provides card token from Omise.js]
Agent: Payment method saved successfully! (Set as default)
       Payment Method ID: pm_1234567890_xyz789
```

### Retrieving User Profile

```bash
# By user ID
curl http://localhost:3000/api/users/user_1234567890_abc123

# By email
curl http://localhost:3000/api/users/email/customer@example.com
```

---

## E-commerce Platform Integration

Connect your Shopify, WooCommerce, or Magento store to enable product management.

### 1. Shopify Integration

#### Step 1: Get Shopify Credentials

1. Log in to your Shopify admin panel
2. Go to **Apps** → **Develop apps** → **Create an app**
3. Enable **Admin API** access
4. Grant permissions: `read_products`, `write_products`, `read_orders`, `write_orders`
5. Copy your **Admin API access token**

#### Step 2: Register Shopify Platform

```bash
curl -X POST http://localhost:3000/api/platforms \
  -H "Content-Type: application/json" \
  -d '{
    "type": "shopify",
    "config": {
      "shopDomain": "your-store.myshopify.com",
      "accessToken": "shpat_xxxxxxxxxxxxx",
      "apiVersion": "2024-01"
    },
    "identifier": "my-shopify-store"
  }'
```

**Response:**
```json
{
  "message": "Platform shopify registered successfully"
}
```

#### Step 3: Set as Active Platform

```bash
curl -X POST http://localhost:3000/api/platforms/active \
  -H "Content-Type: application/json" \
  -d '{
    "platformId": "my-shopify-store"
  }'
```

### 2. WooCommerce Integration

#### Step 1: Generate WooCommerce API Keys

1. Log in to your WordPress admin
2. Go to **WooCommerce** → **Settings** → **Advanced** → **REST API**
3. Click **Add key**
4. Set **Permissions** to **Read/Write**
5. Copy the **Consumer key** and **Consumer secret**

#### Step 2: Register WooCommerce Platform

```bash
curl -X POST http://localhost:3000/api/platforms \
  -H "Content-Type: application/json" \
  -d '{
    "type": "woocommerce",
    "config": {
      "storeUrl": "https://your-store.com",
      "consumerKey": "ck_xxxxxxxxxxxxx",
      "consumerSecret": "cs_xxxxxxxxxxxxx",
      "version": "wc/v3"
    },
    "identifier": "my-woocommerce-store"
  }'
```

### 3. Magento Integration

#### Step 1: Generate Magento Access Token

1. Log in to Magento admin
2. Go to **System** → **Extensions** → **Integrations**
3. Create a new integration with API permissions
4. Activate and copy the **Access Token**

#### Step 2: Register Magento Platform

```bash
curl -X POST http://localhost:3000/api/platforms \
  -H "Content-Type: application/json" \
  -d '{
    "type": "magento",
    "config": {
      "storeUrl": "https://your-magento-store.com",
      "accessToken": "your-access-token",
      "storeCode": "default"
    },
    "identifier": "my-magento-store"
  }'
```

### Managing Products

#### Search Product by SKU

```bash
curl http://localhost:3000/api/products/sku/PRODUCT-SKU-001
```

**Response:**
```json
{
  "id": "12345",
  "sku": "PRODUCT-SKU-001",
  "name": "Premium Headphones",
  "description": "High-quality wireless headphones",
  "price": 499900,
  "currency": "THB",
  "stock": 50,
  "images": ["https://example.com/image1.jpg"],
  "category": "Electronics"
}
```

#### List Products

```bash
# List all products
curl http://localhost:3000/api/products?limit=10

# Search products
curl http://localhost:3000/api/products?search=headphones&limit=5
```

#### Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "NEW-PRODUCT-001",
    "name": "New Product",
    "description": "Product description",
    "price": 29900,
    "currency": "THB",
    "stock": 100,
    "category": "Electronics",
    "images": ["https://example.com/product.jpg"]
  }'
```

#### Update Product

```bash
# Update product price and stock
curl -X PUT http://localhost:3000/api/products/12345 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 39900,
    "stock": 75
  }'
```

#### Update Product Stock Only

```bash
curl -X PUT http://localhost:3000/api/products/12345/stock \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 100
  }'
```

#### Delete Product

```bash
curl -X DELETE http://localhost:3000/api/products/12345
```

---

## Quick Checkout Feature

Quick checkout allows returning customers to complete purchases with saved information in seconds.

### Setting Up Quick Checkout

**Step 1: Create User Profile and Session**

```javascript
// Create user profile
const user = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'customer@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+66812345678'
  })
}).then(r => r.json());

// Create checkout session with user ID
const session = await fetch('http://localhost:3000/api/checkout/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cart: [
      { id: '1', name: 'Product 1', price: 50000, quantity: 1 }
    ],
    currency: 'THB',
    userId: user.id  // Link session to user profile
  })
}).then(r => r.json());
```

**Step 2: Save Addresses and Payment Method (via AI Agent)**

```
User: I want to save my information for quick checkout
Agent: Great! I can help you set up quick checkout. Let me save your:
       1. Shipping address
       2. Billing address
       3. Payment method

User: My address is 123 Main St, Bangkok, Bangkok, 10110, Thailand, +66812345678
Agent: [Saves shipping address] Saved! Now, would you like to use the same for billing?

User: Yes
Agent: Perfect! Now let's save your payment method.

User: I'll pay with my credit card [provides card token]
Agent: [Saves payment method] All set! Your quick checkout is ready.
```

**Step 3: Use Quick Checkout**

```
User: Quick checkout please
Agent: [Retrieves saved data and processes payment]
       Quick Checkout:
       Payment processed successfully! Charge ID: chrg_xxx, Status: successful

       Used your saved:
       - Shipping: 123 Main St, Bangkok
       - Payment: Visa ending in 4242
```

### Quick Checkout Flow Diagram

```
1. User starts checkout → Session created with userId
2. AI Agent detects saved profile
3. Agent offers quick checkout option
4. User confirms
5. Agent retrieves saved addresses + payment method
6. Payment processed automatically
7. Order completed
```

---

## AI Agent Integration

The AI agent now supports natural language commands for products and profiles.

### Product Search Commands

```
User: Find me product with SKU HEADPHONE-001
Agent: [Searches for product]
       Found product: Premium Headphones
       SKU: HEADPHONE-001
       Price: 4,999.00 THB
       Stock: 50
       Description: High-quality wireless headphones

User: Add it to my cart
Agent: [Adds product to cart]
       Added 1x Premium Headphones to cart.
       New total: 4,999.00 THB
```

### Cart Management

```
User: Show me products with "wireless" in the name
Agent: [Lists products]
       Available products:
       - Wireless Headphones (SKU: WH-001) - 4,999.00 THB - Stock: 50
       - Wireless Mouse (SKU: WM-002) - 1,299.00 THB - Stock: 100
       - Wireless Keyboard (SKU: WK-003) - 2,499.00 THB - Stock: 75

User: Add the wireless mouse to my cart
Agent: Added 1x Wireless Mouse to cart. New total: 6,298.00 THB

User: Actually, change the quantity to 2
Agent: Updated Wireless Mouse quantity to 2. New total: 7,597.00 THB
```

### Address Management

```
User: What's my saved shipping address?
Agent: Shipping Addresses:
       - Home: 123 Main St, Bangkok, Bangkok 10110 (Default)
       - Office: 456 Business Rd, Bangkok, Bangkok 10120

User: Use my office address for this order
Agent: I've selected your Office address for shipping.
```

---

## API Reference

### User Profile Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create user profile |
| GET | `/api/users/:userId` | Get user by ID |
| GET | `/api/users/email/:email` | Get user by email |
| PUT | `/api/users/:userId` | Update user profile |
| DELETE | `/api/users/:userId` | Delete user profile |

### E-commerce Platform Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/platforms` | Register platform |
| GET | `/api/platforms` | List platforms |
| POST | `/api/platforms/active` | Set active platform |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get product by ID |
| GET | `/api/products/sku/:sku` | Search by SKU |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| PUT | `/api/products/:id/stock` | Update stock |

### Checkout Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkout/session` | Create session (supports `userId`) |
| GET | `/api/checkout/session/:id` | Get session |
| POST | `/api/checkout/chat` | Chat with AI agent |

---

## Examples

### Complete E-commerce Integration Example

```javascript
// 1. Register Shopify store
await fetch('http://localhost:3000/api/platforms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'shopify',
    config: {
      shopDomain: 'mystore.myshopify.com',
      accessToken: 'shpat_xxxxx',
      apiVersion: '2024-01'
    }
  })
});

// 2. Search for product by SKU
const product = await fetch('http://localhost:3000/api/products/sku/HEADPHONE-001')
  .then(r => r.json());

// 3. Create user profile
const user = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'customer@example.com',
    firstName: 'Jane',
    lastName: 'Smith'
  })
}).then(r => r.json());

// 4. Start checkout with product and user
const session = await fetch('http://localhost:3000/api/checkout/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cart: [{
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    }],
    currency: 'THB',
    userId: user.id
  })
}).then(r => r.json());

// 5. Save shipping address via AI
await fetch('http://localhost:3000/api/checkout/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.sessionId,
    message: 'Save my shipping address: 123 Main St, Bangkok, Bangkok, 10110, Thailand, +66812345678, Home'
  })
});

// 6. Complete quick checkout
const result = await fetch('http://localhost:3000/api/checkout/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.sessionId,
    message: 'Complete quick checkout with my saved payment method'
  })
}).then(r => r.json());

console.log(result.message);
```

### Product Management Example

```javascript
// Add new product to WooCommerce
const newProduct = await fetch('http://localhost:3000/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sku: 'LAPTOP-PRO-2024',
    name: 'Professional Laptop 2024',
    description: 'High-performance laptop for professionals',
    price: 4990000, // 49,900.00 THB in cents
    currency: 'THB',
    stock: 25,
    category: 'Computers',
    images: ['https://example.com/laptop.jpg']
  })
}).then(r => r.json());

// Update stock when sold
await fetch(`http://localhost:3000/api/products/${newProduct.id}/stock`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quantity: 24
  })
});
```

---

## Environment Variables

Add these to your `.env` file for platform integrations:

```env
# Core Configuration
OMISE_PUBLIC_KEY=pkey_test_xxxxx
OMISE_SECRET_KEY=skey_test_xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
PORT=3000

# Shopify (Optional)
SHOPIFY_DOMAIN=mystore.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx

# WooCommerce (Optional)
WOOCOMMERCE_URL=https://mystore.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx

# Magento (Optional)
MAGENTO_URL=https://mymagento.com
MAGENTO_ACCESS_TOKEN=xxxxx
```

---

## Best Practices

### Security

1. **Never store raw card data** - Always use Omise tokens
2. **Validate user input** - Sanitize all addresses and profile data
3. **Use HTTPS** - In production, always use secure connections
4. **Rotate API keys** - Regularly update platform credentials

### Performance

1. **Cache product data** - Reduce API calls to platforms
2. **Limit concurrent requests** - Rate limit platform API calls
3. **Use pagination** - Don't load all products at once
4. **Index by SKU** - For faster product lookups

### User Experience

1. **Offer quick checkout** - For returning customers
2. **Save preferences** - Remember user's default addresses
3. **Validate addresses** - Check format before saving
4. **Provide clear feedback** - Confirm when data is saved

---

## Troubleshooting

### Platform Connection Issues

**Problem:** "Failed to connect to Shopify"

**Solution:**
- Verify your `shopDomain` is correct (e.g., `store.myshopify.com`)
- Check that your access token has the required permissions
- Ensure API version is supported (use `2024-01` or later)

### Product Not Found

**Problem:** Product search by SKU returns null

**Solution:**
- Verify the SKU exists in your platform
- Check that the platform is set as active
- Ensure product is published (not draft)

### Quick Checkout Fails

**Problem:** "No saved payment method found"

**Solution:**
- Ensure user has saved a payment method
- Verify the payment token is still valid
- Check that the user ID is linked to the session

---

## Next Steps

1. **Add Database Persistence** - Replace in-memory storage with MongoDB/PostgreSQL
2. **Implement Webhooks** - Listen for platform events (product updates, orders)
3. **Add Product Sync** - Automatically sync products from platforms
4. **Build Admin Dashboard** - Manage platforms and users visually
5. **Add Analytics** - Track popular products and conversion rates

---

## Support

For issues or questions:
- Check the main [README.md](./README.md)
- Review [EXAMPLES.md](./EXAMPLES.md)
- Open an issue on GitHub

---

**Made with ❤️ using Omise, Claude AI, and Modern E-commerce Platforms**
