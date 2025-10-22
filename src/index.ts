import express, { Request, Response } from 'express';
import { config } from 'dotenv';
import { OmiseService } from './services/omise.service.js';
import { CheckoutAgentService, CartItem } from './services/checkout-agent.service.js';
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

const checkoutAgent = new CheckoutAgentService(
  process.env.ANTHROPIC_API_KEY || '',
  omiseService
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
    const { cart, currency = 'THB' } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Invalid cart data' });
    }

    const session = checkoutAgent.createSession(cart as CartItem[], currency);
    res.json({
      sessionId: session.sessionId,
      totalAmount: session.totalAmount,
      currency: session.currency,
      cart: session.cart,
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
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Server running on: http://localhost:${port}
Environment: ${process.env.NODE_ENV || 'development'}

API Endpoints:
- GET  /health
- GET  /api/config
- GET  /api/payment-methods
- POST /api/checkout/session
- GET  /api/checkout/session/:sessionId
- POST /api/checkout/chat
- GET  /api/checkout/callback/:sessionId

MCP Server:
- Run: npm run dev:mcp

Ready to process payments!
  `);
});
