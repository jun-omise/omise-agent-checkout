import express, { Request, Response } from 'express';
import { config } from 'dotenv';
import { OmiseService } from './services/omise.service.js';
import { CheckoutAgentService, CartItem } from './services/checkout-agent.service.js';
import { EcommercePlatformManager } from './services/ecommerce-manager.service.js';
import { UserProfileService } from './services/user-profile.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize services
const omiseService = new OmiseService({
  publicKey: process.env.OMISE_PUBLIC_KEY || '',
  secretKey: process.env.OMISE_SECRET_KEY || '',
});

// Initialize e-commerce platform manager (optional)
const ecommercePlatformManager = new EcommercePlatformManager();

// Initialize user profile service
const userProfileService = new UserProfileService();

const checkoutAgent = new CheckoutAgentService(
  process.env.ANTHROPIC_API_KEY || '',
  omiseService,
  ecommercePlatformManager,
  userProfileService
);

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Get Omise public key for frontend
 */
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    omisePublicKey: process.env.OMISE_PUBLIC_KEY,
  });
});

/**
 * Create a new checkout session
 */
app.post('/api/checkout/session', (req: Request, res: Response) => {
  try {
    const { cart, currency = 'THB', userId } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Invalid cart data' });
    }

    const session = checkoutAgent.createSession(cart as CartItem[], currency, userId);
    res.json({
      sessionId: session.sessionId,
      totalAmount: session.totalAmount,
      currency: session.currency,
      cart: session.cart,
      userId: session.userId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get checkout session
 */
app.get('/api/checkout/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = checkoutAgent.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Chat with checkout agent
 */
app.post('/api/checkout/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing sessionId or message' });
    }

    const response = await checkoutAgent.chat(sessionId, message);
    res.json({ message: response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Payment callback endpoint
 */
app.get('/api/checkout/callback/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = checkoutAgent.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      message: 'Payment callback received',
      session: {
        sessionId: session.sessionId,
        status: session.status,
        totalAmount: session.totalAmount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List available payment methods
 */
app.get('/api/payment-methods', async (req: Request, res: Response) => {
  try {
    const capabilities = await omiseService.getCapabilities();
    res.json(capabilities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a test token (for development only)
 */
app.post('/api/tokens', async (req: Request, res: Response) => {
  try {
    const token = await omiseService.createToken(req.body);
    res.json(token);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// User Profile API Endpoints

/**
 * Create a user profile
 */
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, phone } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields: email, firstName, lastName' });
    }

    const profile = await userProfileService.createProfile({ email, firstName, lastName, phone });
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user profile by ID
 */
app.get('/api/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await userProfileService.getProfile(userId);

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user profile by email
 */
app.get('/api/users/email/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const profile = await userProfileService.getProfileByEmail(email);

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update user profile
 */
app.put('/api/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const profile = await userProfileService.updateProfile(userId, updates);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete user profile
 */
app.delete('/api/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const success = await userProfileService.deleteProfile(userId);

    if (!success) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ message: 'User profile deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// E-commerce Platform API Endpoints

/**
 * Register an e-commerce platform
 */
app.post('/api/platforms', async (req: Request, res: Response) => {
  try {
    const { type, config, identifier } = req.body;

    if (!type || !config) {
      return res.status(400).json({ error: 'Missing required fields: type, config' });
    }

    await ecommercePlatformManager.registerPlatform(type, config, identifier);
    res.json({ message: `Platform ${type} registered successfully` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List registered platforms
 */
app.get('/api/platforms', (req: Request, res: Response) => {
  try {
    const platforms = ecommercePlatformManager.listPlatforms();
    res.json(platforms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Set active platform
 */
app.post('/api/platforms/active', (req: Request, res: Response) => {
  try {
    const { platformId } = req.body;

    if (!platformId) {
      return res.status(400).json({ error: 'Missing platformId' });
    }

    ecommercePlatformManager.setActivePlatform(platformId);
    res.json({ message: `Platform ${platformId} set as active` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search product by SKU
 */
app.get('/api/products/sku/:sku', async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const product = await ecommercePlatformManager.searchProductBySku(sku);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List products
 */
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const products = await ecommercePlatformManager.listProducts({ limit, search });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get product by ID
 */
app.get('/api/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const product = await ecommercePlatformManager.getProduct(productId);
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create product
 */
app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const product = await ecommercePlatformManager.createProduct(req.body);
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update product
 */
app.put('/api/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const product = await ecommercePlatformManager.updateProduct(productId, req.body);
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete product
 */
app.delete('/api/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const success = await ecommercePlatformManager.deleteProduct(productId);

    if (!success) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update product stock
 */
app.put('/api/products/:productId/stock', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Missing quantity' });
    }

    const success = await ecommercePlatformManager.updateStock(productId, quantity);
    res.json({ success, message: 'Stock updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Serve frontend
 */
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║      Omise Agent Checkout Solution                       ║
║      Powered by AI & Model Context Protocol              ║
║      E-commerce Platform Integration Enabled             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Server running on: http://localhost:${port}
Environment: ${process.env.NODE_ENV || 'development'}

Core API Endpoints:
- GET  /health
- GET  /api/config
- GET  /api/payment-methods
- POST /api/checkout/session
- GET  /api/checkout/session/:sessionId
- POST /api/checkout/chat
- GET  /api/checkout/callback/:sessionId

User Profile API:
- POST   /api/users                    - Create user profile
- GET    /api/users/:userId            - Get user profile
- GET    /api/users/email/:email       - Get user by email
- PUT    /api/users/:userId            - Update user profile
- DELETE /api/users/:userId            - Delete user profile

E-commerce Platform API:
- POST   /api/platforms                - Register platform
- GET    /api/platforms                - List platforms
- POST   /api/platforms/active         - Set active platform
- GET    /api/products                 - List products
- GET    /api/products/:productId      - Get product
- GET    /api/products/sku/:sku        - Search by SKU
- POST   /api/products                 - Create product
- PUT    /api/products/:productId      - Update product
- DELETE /api/products/:productId      - Delete product
- PUT    /api/products/:productId/stock - Update stock

Supported E-commerce Platforms:
- Shopify
- WooCommerce
- Magento

MCP Server:
- Run: npm run dev:mcp

Features:
✓ AI-powered conversational checkout
✓ Multiple payment methods (Card, PromptPay, Banking)
✓ User profiles with saved addresses
✓ Quick checkout with saved payment methods
✓ Multi-platform e-commerce integration
✓ Product management and inventory sync

Ready to process payments!
  `);
});
