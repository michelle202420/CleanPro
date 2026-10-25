# CleanPro - Professional Cleaning Services Website

A complete bilingual (English/Slovak) website for a commercial cleaning company, featuring a modern frontend and comprehensive backend system with admin dashboard and marketing CRM.

## 🌟 Features

### Frontend Website
- **Bilingual Support**: Full English and Slovak translations with language switcher
- **Responsive Design**: Mobile-first approach, works on all devices
- **Modern UI**: Clean, professional design with smooth animations
- **Pages**:
  - Home / Domov
  - Services / Služby (Office & Retail Cleaning)
  - About Us / O nás
  - Contact / Kontakt
  - Privacy Policy / Ochrana osobných údajov

### Backend System
- **Quote Management**: Automated quote request handling with unique quote numbers
- **Customer Database**: Track all customers and their quote history
- **Admin Dashboard**: Secure admin panel with authentication
- **Marketing CRM**: Complete prospecting and sales pipeline management
- **RESTful API**: Well-structured API endpoints for all operations

### Admin Dashboard Features
- **Authentication**: JWT-based secure login system
- **Dashboard Overview**: Real-time statistics and recent activity
- **Quote Management**: View, filter, and update quote requests
- **Customer Management**: Track customer information and history
- **Marketing CRM**:
  - Prospect company management
  - Contact tracking (multiple contacts per company)
  - Interaction logging (emails, calls, meetings, demos)
  - Sales pipeline stages (new → contacted → interested → proposal → negotiation → won/lost)
  - Follow-up reminders
  - Campaign tracking

## 📁 Project Structure

```
cleaning-website/
├── index.html              # Homepage
├── services.html           # Services page
├── about.html             # About Us page
├── contact.html           # Contact page
├── privacy.html           # Privacy Policy page
├── css/
│   ├── style.css          # Main website styles
│   └── admin.css          # Admin dashboard styles
├── js/
│   ├── script.js          # Frontend functionality
│   ├── admin-login.js     # Admin login handler
│   ├── admin-dashboard.js # Dashboard functionality
│   ├── admin-quotes.js    # Quote management
│   ├── admin-customers.js # Customer management
│   └── admin-prospects.js # Marketing CRM functionality
├── admin/
│   ├── login.html         # Admin login page
│   ├── index.html         # Admin dashboard
│   ├── quotes.html        # Quote management interface
│   ├── customers.html     # Customer list
│   └── prospects.html     # Marketing CRM interface
├── database/
│   ├── schema.sql         # Main database schema
│   ├── marketing-schema.sql # Marketing CRM schema
│   ├── init-db.js         # Database initialization script
│   └── db.js              # Database connection utility
├── routes/
│   ├── quotes.js          # Quote API endpoints
│   ├── auth.js            # Authentication endpoints
│   ├── admin.js           # Admin dashboard endpoints
│   └── prospects.js       # Marketing CRM endpoints
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── server.js              # Express server
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore rules
├── BACKEND_SETUP.md      # Backend setup guide
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone or download the project**
   ```bash
   cd /path/to/cleaning-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `JWT_SECRET`: Generate a secure random string
   - `PORT`: Server port (default: 3000)
   - `NODE_ENV`: Set to 'production' for production

4. **Initialize the database**
   ```bash
   npm run init-db
   ```
   
   This creates the SQLite database and default admin user:
   - **Username**: `admin`
   - **Password**: `Admin123!`
   - ⚠️ **IMPORTANT**: Change this password after first login!

5. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Access the website**
   - **Public Website**: http://localhost:3000
   - **Admin Dashboard**: http://localhost:3000/admin/login.html

## 📖 Usage Guide

### For Website Visitors

1. **Browse Services**: Navigate through the bilingual website
2. **Switch Language**: Use the SK | EN switcher in the top-right corner
3. **Request Quote**: Fill out the contact form on the Contact page
4. **Privacy**: Review the privacy policy before submitting

### For Administrators

#### First Login
1. Go to http://localhost:3000/admin/login.html
2. Login with default credentials (admin / Admin123!)
3. **Immediately change your password** in the dashboard

#### Managing Quotes
1. Navigate to **Quotes** section
2. View all quote requests with filtering options
3. Click **View** to see full details
4. Click **Update** to change quote status
5. Track quote progression through stages

#### Managing Customers
1. Navigate to **Customers** section
2. View all customers and their statistics
3. Click **View** for customer details
4. Click **Quotes** to see customer's quote history

#### Marketing CRM - Managing Prospects

**Adding a New Prospect Company:**
1. Navigate to **Prospects** section
2. Click **Add New Prospect**
3. Fill in company details (legal name, industry, size, location)
4. Save the prospect

**Adding Contacts:**
1. Open a prospect's details
2. Click **Add Contact**
3. Enter contact information (name, job title, email, phone, role)
4. Save the contact

**Logging Interactions:**
1. Click **Log Activity** on a prospect
2. Select interaction type (email, call, meeting, demo, proposal)
3. Add notes and outcome
4. Set next follow-up date if needed
5. Save the interaction

**Tracking Sales Pipeline:**
1. View prospects by status filter
2. Update prospect status as they progress:
   - **New**: Just added to CRM
   - **Contacted**: Initial contact made
   - **Interested**: Showed interest
   - **Proposal**: Proposal sent
   - **Negotiation**: In negotiation phase
   - **Won**: Converted to customer
   - **Lost**: Did not convert

## 🔧 API Endpoints

### Public Endpoints
- `POST /api/quotes/submit` - Submit a quote request
- `GET /api/quotes/check/:quoteNumber` - Check quote status

### Admin Endpoints (Require Authentication)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/quotes` - List all quotes
- `GET /api/admin/quotes/:id` - Get quote details
- `PUT /api/admin/quotes/:id/status` - Update quote status
- `GET /api/admin/customers` - List all customers
- `GET /api/admin/customers/:id` - Get customer details
- `GET /api/admin/customers/:id/quotes` - Get customer quotes

### Marketing CRM Endpoints (Require Authentication)
- `GET /api/prospects` - List all prospects
- `POST /api/prospects` - Create new prospect
- `GET /api/prospects/:id` - Get prospect details
- `PUT /api/prospects/:id` - Update prospect
- `PUT /api/prospects/:id/status` - Update prospect status
- `GET /api/prospects/:id/contacts` - List prospect contacts
- `POST /api/prospects/:id/contacts` - Add new contact
- `GET /api/prospects/:id/interactions` - List interactions
- `POST /api/prospects/:id/interactions` - Log new interaction

## 🗄️ Database Schema

### Main Tables
- **customers**: Customer information
- **quote_requests**: Quote requests with unique numbers
- **admin_users**: Admin user accounts
- **admin_sessions**: Active admin sessions
- **quote_notes**: Internal notes on quotes
- **quote_history**: Quote status change history

### Marketing CRM Tables
- **prospect_companies**: Prospective companies
- **prospect_contacts**: Contacts within prospect companies
- **marketing_interactions**: All interactions with prospects
- **prospect_status**: Status tracking and pipeline stages
- **marketing_campaigns**: Campaign management (optional)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Session management
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- SQL injection prevention
- XSS protection

## 🌐 Deployment

### Production Checklist

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Use strong `JWT_SECRET`
   - Configure proper `PORT`

2. **Database**
   - Backup database regularly
   - Set proper file permissions
   - Consider PostgreSQL for production

3. **Security**
   - Change default admin password
   - Enable HTTPS
   - Configure firewall rules
   - Set up monitoring

4. **Server**
   - Use process manager (PM2)
   - Set up reverse proxy (Nginx)
   - Configure logging
   - Enable automatic restarts

### Deployment Commands

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server.js --name cleanpro

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

## 📊 Monitoring & Maintenance

### Regular Tasks
- Review quote requests daily
- Update prospect interactions weekly
- Backup database weekly
- Review security logs monthly
- Update dependencies quarterly

### Database Backup
```bash
# Backup database
cp database/cleanpro.db database/backups/cleanpro-$(date +%Y%m%d).db

# Restore from backup
cp database/backups/cleanpro-YYYYMMDD.db database/cleanpro.db
```

## 🛠️ Troubleshooting

### Common Issues

**Database initialization fails:**
- Ensure Node.js is installed
- Run `npm install` first
- Check file permissions

**Cannot login to admin:**
- Verify database was initialized
- Check default credentials (admin / Admin123!)
- Clear browser cache and cookies

**API requests fail:**
- Ensure server is running
- Check console for errors
- Verify JWT token is valid

**Frontend form not submitting:**
- Check browser console for errors
- Verify backend server is running
- Check network tab for API responses

## 📝 Development

### Adding New Features

1. **New API Endpoint:**
   - Add route in appropriate file in `routes/`
   - Update middleware if needed
   - Test with Postman or similar tool

2. **New Admin Page:**
   - Create HTML file in `admin/`
   - Add corresponding JavaScript in `js/`
   - Update navigation in all admin pages

3. **Database Changes:**
   - Update schema files
   - Create migration script if needed
   - Test thoroughly before production

## 📄 License

This project is proprietary software for CleanPro cleaning services.

## 👥 Support

For technical support or questions:
- Review this documentation
- Check BACKEND_SETUP.md for detailed backend information
- Contact the development team

## 🎯 Future Enhancements

Potential features to add:
- Email notifications for new quotes
- SMS reminders for follow-ups
- Calendar integration for scheduling
- Invoice generation
- Payment processing
- Customer portal
- Mobile app
- Advanced analytics and reporting
- Multi-language support (add more languages)
- Integration with accounting software

---

**Built with ❤️ for CleanPro**