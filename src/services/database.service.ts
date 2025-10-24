/**
 * Database Configuration and Connection
 * Supports both MongoDB and PostgreSQL
 */

export interface DatabaseConfig {
  type: 'mongodb' | 'postgresql' | 'memory';
  uri?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  options?: Record<string, any>;
}

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export class DatabaseService {
  private config: DatabaseConfig;
  private connection: any;
  private connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      console.log('Database already connected');
      return;
    }

    switch (this.config.type) {
      case 'mongodb':
        await this.connectMongoDB();
        break;
      case 'postgresql':
        await this.connectPostgreSQL();
        break;
      case 'memory':
        console.log('Using in-memory storage (no persistence)');
        this.connected = true;
        break;
      default:
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }
  }

  private async connectMongoDB(): Promise<void> {
    try {
      // Dynamic import to avoid dependency issues if MongoDB is not installed
      const { MongoClient } = await import('mongodb');

      const uri = this.config.uri ||
        `mongodb://${this.config.host || 'localhost'}:${this.config.port || 27017}/${this.config.database || 'omise_checkout'}`;

      this.connection = new MongoClient(uri, this.config.options);
      await this.connection.connect();

      this.connected = true;
      console.log('✓ MongoDB connected successfully');
    } catch (error: any) {
      console.error('MongoDB connection error:', error.message);
      throw error;
    }
  }

  private async connectPostgreSQL(): Promise<void> {
    try {
      // Dynamic import to avoid dependency issues if PostgreSQL is not installed
      const { Pool } = await import('pg');

      this.connection = new Pool({
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        database: this.config.database || 'omise_checkout',
        user: this.config.username,
        password: this.config.password,
        ...this.config.options
      });

      // Test connection
      const client = await this.connection.connect();
      client.release();

      this.connected = true;
      console.log('✓ PostgreSQL connected successfully');
    } catch (error: any) {
      console.error('PostgreSQL connection error:', error.message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.config.type === 'mongodb') {
        await this.connection.close();
      } else if (this.config.type === 'postgresql') {
        await this.connection.end();
      }

      this.connected = false;
      console.log('Database disconnected');
    } catch (error: any) {
      console.error('Error disconnecting from database:', error.message);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnection(): any {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    return this.connection;
  }

  getDatabase(name?: string): any {
    if (this.config.type === 'mongodb') {
      const dbName = name || this.config.database || 'omise_checkout';
      return this.connection.db(dbName);
    }
    return this.connection;
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function initializeDatabase(config: DatabaseConfig): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService(config);
  }
  return dbInstance;
}

export function getDatabase(): DatabaseService {
  if (!dbInstance) {
    // Default to in-memory if not initialized
    dbInstance = new DatabaseService({ type: 'memory' });
  }
  return dbInstance;
}
