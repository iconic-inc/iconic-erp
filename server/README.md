# Iconic ERP - Backend Server

A comprehensive Enterprise Resource Planning (ERP) backend system built with Node.js, Express, and MongoDB. This server provides robust APIs for managing business operations including employee management, customer relations, case services, and more.

## 🚀 Features

- **Employee Management**: Complete HR system with attendance tracking and profile management
- **Customer Relations**: Customer database and interaction management
- **Case Services**: Business case tracking and workflow management
- **Role-Based Access Control**: Secure authentication and authorization system
- **Real-time Logging**: Comprehensive logging with Winston and Discord integration
- **File Management**: Document upload and export capabilities
- **Email Integration**: Automated email notifications with Nodemailer
- **API Documentation**: Well-structured RESTful API endpoints

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn** package manager

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory and configure the following variables:

   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/iconic-erp

   # Server
   PORT=3000
   NODE_ENV=development

   # JWT
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRES_IN=7d

   # Email (Nodemailer)
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-email@domain.com
   SMTP_PASS=your-email-password

   # Other configurations...
   ```

## 🚀 Initial Setup

**Important**: Before starting the application for the first time, you must run the setup script to generate necessary data and create an administrator account.

```bash
npm run setup
```

This command will:

- Generate API keys and system resources
- Create default roles and permissions
- Set up an administrator account
- Initialize the database with required data

During setup, you'll be prompted to enter an email address for the administrator account. A temporary password will be generated and sent to this email.

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

The server will start with hot-reloading enabled using nodemon.

### Production Mode

```bash
npm run build
npm start
```

This will build the TypeScript code and start the application using PM2.

## 📝 Available Scripts

- `npm run dev` - Start development server with hot-reloading
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server with PM2
- `npm run setup` - **Initial setup script (run this first!)**
- `npm run gen:apikey` - Generate API keys
- `npm run gen:resource` - Generate system resources
- `npm run gen:role` - Generate roles and permissions
- `npm run gen:employee` - Generate sample employee data
- `npm run gen:customer` - Generate sample customer data

## 🏗️ Project Structure

```
src/
├── api/              # API layer
│   ├── controllers/  # Request handlers
│   ├── middlewares/  # Express middlewares
│   ├── models/       # Database models
│   ├── routers/      # Route definitions
│   ├── services/     # Business logic
│   └── schemas/      # Validation schemas
├── configs/          # Configuration files
├── db/              # Database initialization
├── logs/            # Application logs
└── scripts/         # Utility scripts
```

## 🔧 Configuration

The application uses various configuration files:

- `ecosystem.config.js` - PM2 configuration
- `tsconfig.json` - TypeScript configuration
- `nodemon.json` - Nodemon configuration
- `docker-compose.yml` - Docker setup

## 🐳 Docker Support

The application includes Docker support. Use the provided `docker-compose.yml` to run the entire stack:

```bash
docker-compose up -d
```

## 📊 Logging

The application uses Winston for comprehensive logging:

- Application logs are stored in the `logs/` directory
- Discord integration for real-time error notifications
- Rotating log files to manage disk space

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Remember**: Always run `npm run setup` before using the system for the first time!
