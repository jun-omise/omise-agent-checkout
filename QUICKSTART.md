# Quick Start Guide

Get up and running with Omise Agent Checkout in 5 minutes!

## 1. Install (1 minute)

```bash
# Clone and install
git clone <repo-url>
cd omise-agent-checkout
npm install
```

## 2. Configure (2 minutes)

```bash
# Copy environment file
cp .env.example .env
```

Edit `.env` with your keys:

```env
OMISE_PUBLIC_KEY=pkey_test_your_key
OMISE_SECRET_KEY=skey_test_your_key
ANTHROPIC_API_KEY=sk-ant-your_key
```

**Get your keys:**
- Omise: https://dashboard.omise.co/test/keys
- Anthropic: https://console.anthropic.com

## 3. Build (1 minute)

```bash
npm run build
```

## 4. Run (30 seconds)

```bash
npm run dev
```

## 5. Test (30 seconds)

Open http://localhost:3000

Click "Start Checkout" and chat with the AI agent!

## Test Payment

In browser console:

```javascript
testCardPayment()
```

Uses test card: `4242424242424242`

## Next Steps

- Read the [Complete Tutorial](TUTORIAL.md)
- Check out [Examples](EXAMPLES.md)
- Explore [API Documentation](README.md#api-documentation)

## Quick Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run dev:mcp          # Start MCP server

# Production
npm run build            # Build for production
npm start                # Run production server

# Testing
npm test                 # Run tests (coming soon)
```

## Common Issues

**"Failed to create charge"**
→ Check your Omise keys in `.env`

**"Cannot find module"**
→ Run `npm install` again

**"Port 3000 already in use"**
→ Change `PORT=3001` in `.env`

## Design System

Change theme in browser console:

```javascript
const ds = new DesignSystem();
ds.setTheme('dark');     // Dark theme
ds.setTheme('omise');    // Omise brand
ds.setTheme('purple');   // Purple gradient
```

## Support

- 📖 [Full Tutorial](TUTORIAL.md)
- 🎯 [Examples](EXAMPLES.md)
- 🔌 [MCP Integration](MCP_INTEGRATION.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)

---

**Happy coding!** 🚀
