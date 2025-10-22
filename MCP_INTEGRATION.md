# MCP Integration Guide

Complete guide for integrating the Omise MCP Server with various clients and applications.

## Overview

The Omise MCP (Model Context Protocol) Server provides standardized access to Omise payment gateway functionality through a protocol designed for AI assistants and autonomous agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Client                            │
│  (Claude Desktop, Custom App, or Agent Framework)            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ stdio or SSE transport
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Omise MCP Server                          │
│                                                              │
│  Tools:                                                      │
│  ├─ create_charge         Create payment charges            │
│  ├─ get_charge            Retrieve charge details           │
│  ├─ list_charges          List all charges                  │
│  ├─ create_customer       Create customer profiles          │
│  ├─ get_customer          Get customer details              │
│  ├─ create_token          Tokenize card data                │
│  ├─ create_source         Create payment sources            │
│  ├─ list_payment_methods  List available methods            │
│  └─ refund_charge         Process refunds                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Omise API                               │
│                  (api.omise.co)                              │
└─────────────────────────────────────────────────────────────┘
```

## Running the MCP Server

### Standalone Mode

```bash
# Development
npm run dev:mcp

# Production
npm run mcp
```

### Programmatic Usage

```typescript
import { OmiseMCPServer } from './src/mcp/server.js';

const server = new OmiseMCPServer();
await server.run();
```

## Integration Methods

### 1. Claude Desktop Integration

Add the Omise MCP server to Claude Desktop's configuration.

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "omise-payment": {
      "command": "node",
      "args": [
        "/absolute/path/to/omise-agent-checkout/dist/mcp/server.js"
      ],
      "env": {
        "OMISE_PUBLIC_KEY": "pkey_test_5xtsn6w...",
        "OMISE_SECRET_KEY": "skey_test_5xtsn6w..."
      }
    }
  }
}
```

After configuration, restart Claude Desktop. The tools will be available automatically.

#### Example Usage in Claude Desktop

```
You: Create a PromptPay payment for 1,500 THB

Claude: I'll create a PromptPay payment source for 1,500 THB.
[Uses create_source and create_charge tools]

Created PromptPay payment:
- Amount: 1,500.00 THB
- Charge ID: chrg_test_xxx
- QR Code: [QR code image URL]

Please scan the QR code with your mobile banking app to complete the payment.
```

### 2. MCP SDK Client Integration

Use the official MCP SDK to build custom clients.

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

// Create transport
const serverProcess = spawn('node', [
  'dist/mcp/server.js'
], {
  env: {
    ...process.env,
    OMISE_PUBLIC_KEY: 'pkey_test_xxx',
    OMISE_SECRET_KEY: 'skey_test_xxx'
  }
});

const transport = new StdioClientTransport({
  process: serverProcess
});

// Create client
const client = new Client(
  {
    name: 'omise-client',
    version: '1.0.0'
  },
  {
    capabilities: {}
  }
);

// Connect
await client.connect(transport);

// List available tools
const { tools } = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool({
  name: 'create_charge',
  arguments: {
    amount: 100000,
    currency: 'THB',
    source: 'tokn_test_xxx',
    description: 'Order #12345'
  }
});

console.log('Charge created:', result);
```

### 3. Agent Framework Integration

#### LangChain Integration

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';

// Initialize MCP client
const mcpClient = new MCPClient(/* ... */);
await mcpClient.connect();

// Get tools from MCP server
const { tools } = await mcpClient.listTools();

// Convert MCP tools to LangChain tools
const langchainTools = tools.map(tool => ({
  name: tool.name,
  description: tool.description,
  schema: tool.inputSchema,
  func: async (input: any) => {
    const result = await mcpClient.callTool({
      name: tool.name,
      arguments: input
    });
    return JSON.stringify(result);
  }
}));

// Use with LangChain agent
const model = new ChatAnthropic({
  modelName: 'claude-3-5-sonnet-20241022',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
});

// Agent can now use Omise payment tools
```

#### AutoGPT/AgentGPT Integration

```python
# Python example for AutoGPT
import subprocess
import json

class OmiseMCPPlugin:
    def __init__(self, public_key, secret_key):
        self.process = subprocess.Popen(
            ['node', 'dist/mcp/server.js'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            env={
                'OMISE_PUBLIC_KEY': public_key,
                'OMISE_SECRET_KEY': secret_key
            }
        )

    def call_tool(self, tool_name, arguments):
        request = {
            'method': 'tools/call',
            'params': {
                'name': tool_name,
                'arguments': arguments
            }
        }

        self.process.stdin.write(json.dumps(request).encode())
        self.process.stdin.flush()

        response = self.process.stdout.readline()
        return json.loads(response)
```

## Tool Reference

### create_charge

Create a new payment charge.

**Input Schema**:
```typescript
{
  amount: number;           // Required: Amount in smallest currency unit
  currency: string;         // Required: Currency code (THB, USD, etc.)
  source?: string;          // Payment source token
  customer?: string;        // Customer ID
  description?: string;     // Charge description
  metadata?: object;        // Custom metadata
}
```

**Example**:
```typescript
await client.callTool({
  name: 'create_charge',
  arguments: {
    amount: 250000,        // 2,500.00 THB
    currency: 'THB',
    source: 'tokn_test_xxx',
    description: 'Order #12345',
    metadata: {
      orderId: '12345',
      customerId: 'cust_001'
    }
  }
});
```

**Response**:
```json
{
  "id": "chrg_test_xxx",
  "amount": 250000,
  "currency": "THB",
  "status": "successful",
  "paid": true,
  "transaction": "trxn_test_xxx"
}
```

### create_source

Create a payment source for alternative payment methods.

**Input Schema**:
```typescript
{
  type: string;            // Required: Payment method type
  amount: number;          // Required: Amount in smallest unit
  currency: string;        // Required: Currency code
}
```

**Supported Types**:
- `promptpay` - PromptPay QR Code
- `internet_banking_bbl` - Bangkok Bank
- `internet_banking_kbank` - Kasikorn Bank
- `internet_banking_scb` - Siam Commercial Bank
- `internet_banking_ktb` - Krung Thai Bank
- `mobile_banking_scb` - SCB Easy App
- `mobile_banking_kbank` - K PLUS
- And more...

**Example**:
```typescript
await client.callTool({
  name: 'create_source',
  arguments: {
    type: 'promptpay',
    amount: 150000,        // 1,500.00 THB
    currency: 'THB'
  }
});
```

### create_customer

Create a customer profile for storing payment methods.

**Input Schema**:
```typescript
{
  email: string;           // Required: Customer email
  description?: string;    // Customer description
  card?: string;          // Card token to attach
  metadata?: object;      // Custom metadata
}
```

**Example**:
```typescript
await client.callTool({
  name: 'create_customer',
  arguments: {
    email: 'customer@example.com',
    description: 'Premium customer',
    metadata: {
      tier: 'premium',
      registeredAt: '2024-01-01'
    }
  }
});
```

### refund_charge

Refund a charge partially or fully.

**Input Schema**:
```typescript
{
  chargeId: string;        // Required: Charge ID to refund
  amount?: number;         // Optional: Partial refund amount
}
```

**Example**:
```typescript
// Full refund
await client.callTool({
  name: 'refund_charge',
  arguments: {
    chargeId: 'chrg_test_xxx'
  }
});

// Partial refund
await client.callTool({
  name: 'refund_charge',
  arguments: {
    chargeId: 'chrg_test_xxx',
    amount: 50000  // Refund 500.00 THB
  }
});
```

## Best Practices

### 1. Error Handling

```typescript
try {
  const result = await client.callTool({
    name: 'create_charge',
    arguments: { /* ... */ }
  });

  // Parse result
  const content = result.content[0];
  if (content.type === 'text') {
    const data = JSON.parse(content.text);

    if (data.object === 'error') {
      console.error('Omise error:', data.message);
    }
  }
} catch (error) {
  console.error('MCP error:', error);
}
```

### 2. Security

- **Never expose secret keys**: Keep `OMISE_SECRET_KEY` secure
- **Use environment variables**: Don't hardcode credentials
- **Validate inputs**: Verify all amounts and parameters
- **Use test keys in development**: Switch to production keys only when ready

### 3. Amount Handling

Always use smallest currency unit:
```typescript
// CORRECT
const amount = 1500.00; // THB
const amountInSatang = amount * 100; // 150000 satang

// INCORRECT
const amount = 1500.00; // This will charge 15.00 THB!
```

### 4. Idempotency

Use idempotency keys for charge creation:
```typescript
await client.callTool({
  name: 'create_charge',
  arguments: {
    amount: 100000,
    currency: 'THB',
    metadata: {
      idempotencyKey: 'unique-key-' + Date.now()
    }
  }
});
```

## Testing

### Test Mode

Use test API keys for development:
```bash
OMISE_PUBLIC_KEY=pkey_test_5xtsn6w...
OMISE_SECRET_KEY=skey_test_5xtsn6w...
```

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242424242424242 | Successful charge |
| 4111111111111111 | Successful charge |
| 4000000000000002 | Card declined |
| 4000000000000127 | Incorrect CVC |

### Test Sources

```typescript
// Test PromptPay
await client.callTool({
  name: 'create_source',
  arguments: {
    type: 'promptpay',
    amount: 100000,
    currency: 'THB'
  }
});
```

## Troubleshooting

### Common Issues

**"Failed to create charge"**
- Verify API keys are correct
- Check amount is in smallest unit
- Ensure source/token is valid

**"MCP server not responding"**
- Check server process is running
- Verify environment variables are set
- Check stdio pipes are not blocked

**"Permission denied"**
- Ensure server file is executable: `chmod +x dist/mcp/server.js`
- Verify Node.js is in PATH

### Debug Mode

Enable verbose logging:
```bash
DEBUG=mcp:* npm run dev:mcp
```

## Resources

- [Omise API Documentation](https://docs.omise.co)
- [MCP Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/anthropics/mcp-sdk)

## Support

For issues:
1. Check the [troubleshooting guide](#troubleshooting)
2. Review [Omise documentation](https://docs.omise.co)
3. Open an issue on GitHub

---

**Next Steps**: Try integrating with [Claude Desktop](#1-claude-desktop-integration) or explore the [API examples](EXAMPLES.md).
