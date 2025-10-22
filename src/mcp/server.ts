#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { OmiseService } from '../services/omise.service.js';

config();

/**
 * Omise MCP Server
 * Provides AI agents with tools to interact with Omise payment gateway
 */
class OmiseMCPServer {
  private server: Server;
  private omiseService: OmiseService;

  constructor() {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'omise-payment-server',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.omiseService = new OmiseService({
      publicKey: process.env.OMISE_PUBLIC_KEY!,
      secretKey: process.env.OMISE_SECRET_KEY!,
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_charge':
            return await this.handleCreateCharge(args);
          case 'get_charge':
            return await this.handleGetCharge(args);
          case 'list_charges':
            return await this.handleListCharges(args);
          case 'create_customer':
            return await this.handleCreateCustomer(args);
          case 'get_customer':
            return await this.handleGetCustomer(args);
          case 'create_token':
            return await this.handleCreateToken(args);
          case 'create_source':
            return await this.handleCreateSource(args);
          case 'list_payment_methods':
            return await this.handleListPaymentMethods();
          case 'refund_charge':
            return await this.handleRefundCharge(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'create_charge',
        description: 'Create a payment charge with Omise. Supports credit cards, internet banking, mobile banking, and other payment methods.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount in smallest currency unit (e.g., 100000 for 1000.00 THB)',
            },
            currency: {
              type: 'string',
              description: 'Currency code (e.g., THB, USD, SGD)',
              default: 'THB',
            },
            description: {
              type: 'string',
              description: 'Description of the charge',
            },
            source: {
              type: 'string',
              description: 'Payment source token or card token ID',
            },
            customer: {
              type: 'string',
              description: 'Customer ID (optional)',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the charge',
            },
          },
          required: ['amount', 'currency'],
        },
      },
      {
        name: 'get_charge',
        description: 'Retrieve details of a specific charge by ID',
        inputSchema: {
          type: 'object',
          properties: {
            chargeId: {
              type: 'string',
              description: 'The charge ID to retrieve',
            },
          },
          required: ['chargeId'],
        },
      },
      {
        name: 'list_charges',
        description: 'List all charges with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of charges to return (max 100)',
              default: 20,
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
              default: 0,
            },
          },
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer profile for storing payment methods',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Customer email address',
            },
            description: {
              type: 'string',
              description: 'Customer description',
            },
            card: {
              type: 'string',
              description: 'Card token to attach to customer',
            },
            metadata: {
              type: 'object',
              description: 'Additional customer metadata',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve customer details by ID',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The customer ID to retrieve',
            },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'create_token',
        description: 'Create a token for a credit/debit card (for testing)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Cardholder name',
            },
            number: {
              type: 'string',
              description: 'Card number',
            },
            expiration_month: {
              type: 'number',
              description: 'Expiration month (1-12)',
            },
            expiration_year: {
              type: 'number',
              description: 'Expiration year (e.g., 2025)',
            },
            security_code: {
              type: 'string',
              description: 'CVV/CVC code',
            },
          },
          required: ['name', 'number', 'expiration_month', 'expiration_year'],
        },
      },
      {
        name: 'create_source',
        description: 'Create a payment source for alternative payment methods (PromptPay, Internet Banking, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Payment method type (e.g., promptpay, internet_banking_bay, mobile_banking_scb)',
            },
            amount: {
              type: 'number',
              description: 'Amount in smallest currency unit',
            },
            currency: {
              type: 'string',
              description: 'Currency code',
              default: 'THB',
            },
          },
          required: ['type', 'amount', 'currency'],
        },
      },
      {
        name: 'list_payment_methods',
        description: 'Get list of available payment methods and their capabilities',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'refund_charge',
        description: 'Refund a charge partially or fully',
        inputSchema: {
          type: 'object',
          properties: {
            chargeId: {
              type: 'string',
              description: 'The charge ID to refund',
            },
            amount: {
              type: 'number',
              description: 'Amount to refund (optional, defaults to full refund)',
            },
          },
          required: ['chargeId'],
        },
      },
    ];
  }

  private async handleCreateCharge(args: any) {
    const charge = await this.omiseService.createCharge(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(charge, null, 2),
        },
      ],
    };
  }

  private async handleGetCharge(args: any) {
    const charge = await this.omiseService.getCharge(args.chargeId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(charge, null, 2),
        },
      ],
    };
  }

  private async handleListCharges(args: any) {
    const charges = await this.omiseService.listCharges(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(charges, null, 2),
        },
      ],
    };
  }

  private async handleCreateCustomer(args: any) {
    const customer = await this.omiseService.createCustomer(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(customer, null, 2),
        },
      ],
    };
  }

  private async handleGetCustomer(args: any) {
    const customer = await this.omiseService.getCustomer(args.customerId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(customer, null, 2),
        },
      ],
    };
  }

  private async handleCreateToken(args: any) {
    const token = await this.omiseService.createToken(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(token, null, 2),
        },
      ],
    };
  }

  private async handleCreateSource(args: any) {
    const source = await this.omiseService.createSource(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(source, null, 2),
        },
      ],
    };
  }

  private async handleListPaymentMethods() {
    const methods = await this.omiseService.getCapabilities();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(methods, null, 2),
        },
      ],
    };
  }

  private async handleRefundCharge(args: any) {
    const refund = await this.omiseService.refundCharge(args.chargeId, args.amount);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(refund, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Omise MCP Server running on stdio');
  }
}

// Start the server
const server = new OmiseMCPServer();
server.run().catch(console.error);
