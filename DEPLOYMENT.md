# Production Deployment Guide

Complete guide for deploying the Omise Agent Checkout solution to production with database persistence and e-commerce platform integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Installation](#installation)
5. [Database Initialization](#database-initialization)
6. [E-commerce Platform Setup](#e-commerce-platform-setup)
7. [Deployment Options](#deployment-options)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Omise Account** with API keys
- **Anthropic API Key** (Claude AI)

### Optional (choose one for persistence)
- **MongoDB** 5.0+ (recommended for production)
- **PostgreSQL** 14+ (alternative)

### For E-commerce Integration
- **Shopify** store with Admin API access (optional)
- **WooCommerce** store with REST API enabled (optional)
- **Magento** 2.x store with integration token (optional)

---

## Database Setup

### Option 1: MongoDB (Recommended)

**1. Install MongoDB**

**Ubuntu/Debian:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

**Docker:**
```bash
docker run -d \
  --name omise-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your_password \
  -v mongodb_data:/data/db \
  mongo:6.0
```

**2. Create Database**

```bash
mongosh
```

```javascript
use omise_checkout
db.createUser({
  user: "omise_user",
  pwd: "your_secure_password",
  roles: [{ role: "readWrite", db: "omise_checkout" }]
})
```

**3. Connection URI**
```
mongodb://omise_user:your_secure_password@localhost:27017/omise_checkout
```

### Option 2: PostgreSQL

**1. Install PostgreSQL**

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**2. Create Database**

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE omise_checkout;
CREATE USER omise_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE omise_checkout TO omise_user;
```

---

## Environment Configuration

**1. Copy environment template**

```bash
cp .env.example .env
```

**2. Configure required variables**

```env
# Omise Configuration (REQUIRED)
OMISE_PUBLIC_KEY=pkey_live_your_public_key
OMISE_SECRET_KEY=skey_live_your_secret_key

# Anthropic Configuration (REQUIRED)
ANTHROPIC_API_KEY=sk-ant-your_api_key

# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration (REQUIRED for production)
DB_TYPE=mongodb
DATABASE_URI=mongodb://omise_user:password@localhost:27017/omise_checkout

# Alternative PostgreSQL
# DB_TYPE=postgresql
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=omise_checkout
# DB_USER=omise_user
# DB_PASSWORD=your_password
```

**3. Configure optional e-commerce platforms**

```env
# Shopify (if using)
SHOPIFY_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_API_VERSION=2024-01

# WooCommerce (if using)
WOOCOMMERCE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx

# Magento (if using)
MAGENTO_URL=https://your-magento-store.com
MAGENTO_ACCESS_TOKEN=your_access_token
MAGENTO_STORE_CODE=default
```

---

## Installation

**1. Clone repository**

```bash
git clone https://github.com/your-repo/omise-agent-checkout.git
cd omise-agent-checkout
```

**2. Install dependencies**

```bash
npm install
```

**3. Install database driver (if using database)**

For MongoDB:
```bash
npm install mongodb --save-optional
```

For PostgreSQL:
```bash
npm install pg --save-optional
```

**4. Build TypeScript**

```bash
npm run build
```

---

## Database Initialization

**1. Initialize database and create indexes**

```bash
npm run db:init
```

This will:
- Connect to your configured database
- Create necessary collections/tables
- Set up indexes for optimal performance
- Configure TTL (Time To Live) for auto-cleanup

**Expected output:**
```
🚀 Starting database initialization...

Database Type: mongodb
Database Name: omise_checkout

✓ MongoDB connected successfully

📋 Creating indexes...

✓ User profile indexes created
✓ Checkout session indexes created

✅ Database initialization completed successfully!

Your database is ready to use.
```

---

## E-commerce Platform Setup

### Shopify Integration

**1. Create Custom App**
- Log in to Shopify Admin
- Go to **Apps** → **App and sales channel settings** → **Develop apps**
- Click **Create an app**
- Configure Admin API scopes:
  - `read_products`
  - `write_products`
  - `read_orders`
  - `write_orders`
  - `read_customers`
  - `write_customers`

**2. Get API Credentials**
- Install the app
- Copy **Admin API access token**
- Note your store domain (e.g., `mystore.myshopify.com`)

**3. Register Platform via API**

```bash
curl -X POST http://localhost:3000/api/platforms \
  -H "Content-Type: application/json" \
  -d '{
    "type": "shopify",
    "config": {
      "shopDomain": "your-store.myshopify.com",
      "accessToken": "shpat_xxxxx",
      "apiVersion": "2024-01"
    }
  }'
```

### WooCommerce Integration

**1. Generate API Keys**
- WordPress Admin → **WooCommerce** → **Settings**
- Go to **Advanced** → **REST API**
- Click **Add key**
- Set permissions to **Read/Write**
- Copy **Consumer key** and **Consumer secret**

**2. Register Platform**

```bash
curl -X POST http://localhost:3000/api/platforms \
  -H "Content-Type: application/json" \
  -d '{
    "type": "woocommerce",
    "config": {
      "storeUrl": "https://your-store.com",
      "consumerKey": "ck_xxxxx",
      "consumerSecret": "cs_xxxxx"
    }
  }'
```

### Magento Integration

**1. Create Integration**
- Magento Admin → **System** → **Extensions** → **Integrations**
- Click **Add New Integration**
- Grant necessary permissions
- Activate and copy **Access Token**

**2. Register Platform**

```bash
curl -X POST http://localhost:3000/api/platforms \
  -H "Content-Type: application/json" \
  -d '{
    "type": "magento",
    "config": {
      "storeUrl": "https://your-magento-store.com",
      "accessToken": "your_access_token"
    }
  }'
```

---

## Deployment Options

### Option 1: PM2 (Recommended for VPS)

**1. Install PM2**

```bash
npm install -g pm2
```

**2. Create ecosystem file**

`ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'omise-checkout',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

**3. Start application**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**4. Monitoring**

```bash
pm2 monit
pm2 logs omise-checkout
```

### Option 2: Docker

**1. Create Dockerfile**

`Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**2. Create docker-compose.yml**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:6.0
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=your_password
    restart: unless-stopped

volumes:
  mongodb_data:
```

**3. Deploy**

```bash
docker-compose up -d
```

### Option 3: Cloud Platforms

#### Heroku

```bash
# Install Heroku CLI
heroku create omise-checkout

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set OMISE_PUBLIC_KEY=pkey_xxx
heroku config:set OMISE_SECRET_KEY=skey_xxx
heroku config:set ANTHROPIC_API_KEY=sk-ant-xxx

# Deploy
git push heroku main
```

#### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-18 omise-checkout

# Create environment
eb create omise-checkout-prod

# Deploy
eb deploy
```

#### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT-ID/omise-checkout

# Deploy
gcloud run deploy omise-checkout \
  --image gcr.io/PROJECT-ID/omise-checkout \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Monitoring & Maintenance

### Health Checks

**Endpoint:** `GET /health`

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-24T10:00:00.000Z"
}
```

### Logging

**PM2 Logs:**
```bash
pm2 logs omise-checkout --lines 100
```

**Docker Logs:**
```bash
docker-compose logs -f app
```

### Database Maintenance

**Clean up old sessions (MongoDB):**

```javascript
// Run monthly
db.checkout_sessions.deleteMany({
  status: { $in: ['completed', 'cancelled'] },
  updatedAt: { $lt: new Date(Date.now() - 90*24*60*60*1000) }
})
```

**Backup Database:**

```bash
# MongoDB
mongodump --uri="mongodb://user:pass@localhost:27017/omise_checkout" --out=backup/

# PostgreSQL
pg_dump omise_checkout > backup/omise_checkout.sql
```

### Performance Monitoring

Monitor these metrics:
- **Response time** - Target: <200ms for API calls
- **Memory usage** - Alert if >80%
- **Database connections** - Monitor active connections
- **Error rate** - Alert if >1%

---

## Troubleshooting

### Database Connection Failed

**Problem:** "Failed to connect to MongoDB"

**Solutions:**
1. Check database is running: `systemctl status mongod`
2. Verify connection URI in `.env`
3. Check firewall: `sudo ufw allow 27017`
4. Test connection: `mongosh "mongodb://localhost:27017"`

### E-commerce Platform Connection Error

**Problem:** "Failed to connect to Shopify"

**Solutions:**
1. Verify API credentials
2. Check API permissions/scopes
3. Ensure store domain is correct
4. Test API manually with curl

### High Memory Usage

**Solutions:**
1. Reduce session retention time
2. Enable database cleanup job
3. Scale horizontally (add instances)
4. Optimize conversation history storage

### Slow Performance

**Solutions:**
1. Check database indexes: `db.user_profiles.getIndexes()`
2. Enable query caching
3. Add CDN for static assets
4. Use connection pooling

---

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set secure environment variables
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use strong database passwords
- [ ] Rotate API keys regularly
- [ ] Enable database authentication
- [ ] Use secrets manager (AWS Secrets Manager, etc.)
- [ ] Set up firewall rules
- [ ] Enable audit logging

---

## Support & Resources

- **Main Documentation:** [README.md](./README.md)
- **Tutorial:** [ECOMMERCE_INTEGRATION_TUTORIAL.md](./ECOMMERCE_INTEGRATION_TUTORIAL.md)
- **Examples:** [EXAMPLES.md](./EXAMPLES.md)

---

**Deployment Status Check:**

✅ Prerequisites installed
✅ Database configured
✅ Environment variables set
✅ Database initialized
✅ Application built
✅ Tests passing
✅ Platform deployed
✅ Health check passing
✅ Monitoring configured

**Your Omise Agent Checkout is production-ready!** 🚀
