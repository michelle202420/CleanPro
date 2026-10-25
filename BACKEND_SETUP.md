# CleanPro Backend Setup Guide

Complete guide to set up and deploy the CleanPro quote management system with admin dashboard.

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [Admin Dashboard Access](#admin-dashboard-access)
7. [API Documentation](#api-documentation)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

## 🔧 System Requirements

- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **SQLite3**: Included with Node.js sqlite3 package
- **Operating System**: Windows, macOS, or Linux

## 📦 Installation

### Step 1: Install Dependencies

```bash
# Navigate to project directory
cd "/Users/michellemelikardi/Desktop/Universidade/Cleaning Website"

# Install Node.js dependencies
npm install
```

This will install:
- express (web framework)
- sqlite3 (database)
- bcrypt (password hashing)
- jsonwebtoken (authentication)
- cors (cross-origin requests)
- dotenv (environment variables)
- express-validator (input validation)
- express-rate-limit (API rate limiting)
- helmet (security headers)
- cookie-parser (cookie handling)
- uuid (unique identifiers)

### Step 2: Create Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` file with your settings (see [Configuration](#configuration) section).

## 🗄️ Database Setup

### Initialize Database

```bash
# Run database initialization script
npm run init-db
```

This will:
1. Create the SQLite database file at `./database/cleanpro.db`
2. Create all necessary tables (customers, quote_requests, admin_users, etc.)
3. Create database views for easier querying
4. Insert default admin user

**Default Admin Credentials:**
- Username: `admin`
- Password: `Admin123!`
- ⚠️ **IMPORTANT**: Change this password immediately after first login!

### Database Schema

The database includes the following tables:

1. **customers** - Customer information
2. **quote_requests** - Quote requests with unique quote numbers
3. **admin_users** - Admin user accounts
4. **quote_notes** - Internal notes for quotes
5. **quote_status_history** - Audit trail for status changes
6. **admin_sessions** - Active admin sessions

## ⚙️ Configuration

Edit the `.env` file with your settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./database/cleanpro.db

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Session Configuration
SESSION_EXPIRY=24h

# Admin Configuration
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@cleanpro.sk
DEFAULT_ADMIN_PASSWORD=Admin123!

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Important Security Notes:

1. **Change JWT_SECRET**: Generate a random string for production
2. **Change Admin Password**: Update default password after first login
3. **Enable HTTPS**: Use SSL/TLS in production
4. **Set NODE_ENV**: Use `production` for live deployment

## 🚀 Running the Application

### Development Mode

```bash
# Start server with auto-reload
npm run dev
```

### Production Mode

```bash
# Start server
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

You should see:
```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🧹 CleanPro Backend Server                         ║
║                                                       ║
║   Server running on: http://localhost:3000           ║
║   Environment: development                            ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

## 👨‍💼 Admin Dashboard Access

### Login

1. Open browser and navigate to: `http://localhost:3000/admin/login.html`
2. Enter credentials:
   - Username: `admin`
   - Password: `Admin123!`
3. Click "Login"

### Dashboard Features

After login, you'll have access to:

1. **Dashboard** (`/admin/index.html`)
   - Statistics overview
   - Recent quotes
   - Charts and graphs

2. **Quotes Management** (`/admin/quotes.html`)
   - View all quote requests
   - Filter by status, service type
   - Search quotes
   - Update quote status
   - Add internal notes
   - Assign quotes to admins

3. **Customers** (`/admin/customers.html`)
   - View all customers
   - Search customers
   - View customer quote history

### Changing Your Password

1. Log in to admin dashboard
2. Use API endpoint: `POST /api/auth/change-password`
3. Provide current and new password

## 📡 API Documentation

### Public Endpoints

#### Submit Quote Request
```http
POST /api/quotes/submit
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+421 XXX XXX XXX",
  "company": "Example Corp",
  "service": "office",
  "frequency": "weekly",
  "message": "Need office cleaning",
  "privacyConsent": "true"
}
```

#### Check Quote Status
```http
GET /api/quotes/check/:quoteNumber
```

### Admin Endpoints (Require Authentication)

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!"
}
```

#### Get Dashboard Data
```http
GET /api/admin/dashboard
Authorization: Bearer <token>
```

#### Get All Quotes
```http
GET /api/admin/quotes?status=pending&page=1&limit=20
Authorization: Bearer <token>
```

#### Update Quote Status
```http
PUT /api/admin/quotes/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "contacted",
  "notes": "Called customer"
}
```

#### Add Note to Quote
```http
POST /api/admin/quotes/:id/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "note": "Customer requested callback"
}
```

## 🌐 Deployment

### Option 1: Traditional Hosting (VPS/Dedicated Server)

1. **Prepare Server**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 (process manager)
   sudo npm install -g pm2
   ```

2. **Upload Files**
   ```bash
   # Upload project files to server
   scp -r * user@your-server:/var/www/cleanpro/
   ```

3. **Install Dependencies**
   ```bash
   cd /var/www/cleanpro
   npm install --production
   ```

4. **Setup Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with production settings
   ```

5. **Initialize Database**
   ```bash
   npm run init-db
   ```

6. **Start with PM2**
   ```bash
   pm2 start server.js --name cleanpro
   pm2 save
   pm2 startup
   ```

7. **Setup Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name cleanpro.sk www.cleanpro.sk;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d cleanpro.sk -d www.cleanpro.sk
   ```

### Option 2: Cloud Platforms

#### Heroku
```bash
# Install Heroku CLI
# Create Heroku app
heroku create cleanpro-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key

# Deploy
git push heroku main
```

#### DigitalOcean App Platform
1. Connect GitHub repository
2. Configure build settings
3. Set environment variables
4. Deploy

#### AWS Elastic Beanstalk
1. Install EB CLI
2. Initialize EB application
3. Configure environment
4. Deploy

### Option 3: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t cleanpro .
docker run -p 3000:3000 --env-file .env cleanpro
```

## 🔍 Troubleshooting

### Database Issues

**Problem**: Database file not found
```bash
# Solution: Initialize database
npm run init-db
```

**Problem**: Database locked
```bash
# Solution: Close all connections and restart
pm2 restart cleanpro
```

### Authentication Issues

**Problem**: Invalid token
```bash
# Solution: Clear cookies and login again
# Or check JWT_SECRET in .env
```

**Problem**: Can't login
```bash
# Solution: Reset admin password
# Run init-db again or manually update in database
```

### Server Issues

**Problem**: Port already in use
```bash
# Solution: Change PORT in .env or kill process
lsof -ti:3000 | xargs kill -9
```

**Problem**: Module not found
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Performance Issues

**Problem**: Slow queries
```bash
# Solution: Add database indexes (already included in schema)
# Or optimize queries in routes
```

**Problem**: High memory usage
```bash
# Solution: Restart server periodically
pm2 restart cleanpro
```

## 📊 Monitoring

### Check Server Status
```bash
pm2 status
pm2 logs cleanpro
```

### Database Backup
```bash
# Backup database
cp database/cleanpro.db database/backup-$(date +%Y%m%d).db

# Automated daily backup
crontab -e
# Add: 0 2 * * * cp /var/www/cleanpro/database/cleanpro.db /var/www/cleanpro/database/backup-$(date +\%Y\%m\%d).db
```

### Monitor Logs
```bash
# View real-time logs
pm2 logs cleanpro --lines 100

# View error logs
pm2 logs cleanpro --err
```

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Update JWT_SECRET in production
- [ ] Enable HTTPS/SSL
- [ ] Set NODE_ENV=production
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Regular database backups
- [ ] Keep dependencies updated
- [ ] Monitor server logs
- [ ] Use strong passwords

## 📞 Support

For issues or questions:
- Email: admin@cleanpro.sk
- Check logs: `pm2 logs cleanpro`
- Review error messages in browser console

## 📝 License

Copyright © 2026 CleanPro. All rights reserved.