# CIE Faculty Portal

## Overview

The CIE Faculty Portal is a comprehensive Progressive Web Application (PWA) designed for the Computer and Information Engineering faculty. It serves as a centralized platform for multi-role educational management, enabling communication between students, department governors, faculty governors, and administrators. The system provides real-time chat capabilities, notifications management, document sharing, and role-based access control across four departments: Computer Engineering, Information Systems, Software Engineering, and Network Engineering.

## Recent Changes

**Portability Improvements (November 2025)**
- Fixed fs module imports in `server/telegram.ts` to properly use sync methods from 'fs' instead of 'fs/promises'
- Removed Replit-specific `reusePort` option from `server/index.ts` to ensure compatibility with standard Node.js servers
- Application now works on any Node.js 20+ platform (local development, standard hosting, Docker, etc.)
- Graceful Replit detection remains in `vite.config.ts` for HMR configuration (falls back to defaults on other platforms)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Design System**
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS with a custom monochromatic theme (grey, black, white palette)
- Material Design 3 principles for information-dense layouts
- Mobile-first responsive design with PWA capabilities
- Custom CSS variables for theme management (light/dark mode support)

**State Management Strategy**
- Server state handled via TanStack Query with infinite stale time
- Session-based authentication state synchronized with backend
- WebSocket connections for real-time chat and notifications
- Local component state using React hooks

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- Session-based authentication using express-session with MemoryStore
- WebSocket server (ws library) for real-time bidirectional communication
- RESTful API endpoints for CRUD operations

**Authentication & Authorization**
- Bcrypt for password hashing (10 salt rounds)
- Role-based access control (RBAC) with four roles: student, department-governor, faculty-governor, admin
- Department-level access restrictions for governors
- Session timeout configured to 480 minutes (8 hours)

**Real-time Communication**
- WebSocket protocol for chat messages with room-based subscriptions
- WebSocket clients tagged with userId and roomId for targeted message delivery
- Persistent WebSocket connections managed per user session

### Data Storage Solutions

**Database**
- SQLite as the primary relational database (using better-sqlite3)
- Drizzle ORM for type-safe database queries and schema management
- WAL (Write-Ahead Logging) mode enabled for better concurrency
- Database file stored at: `data/cie_portal.db`

**Schema Design**
- Users table with role and department associations
- Departments table for organizational structure
- Rooms table supporting general, department-specific, and custom chat rooms
- Messages table with rich formatting, image URLs with expiry timestamps, reply threading, and reaction storage (JSONB)
- Notifications table with type classification (urgent, regular, cruise) and target department filtering
- Documents table with ownership, department access control, and expiration tracking
- Activity logs for audit trail
- Push subscriptions for web push notifications

**File Storage**
- Local filesystem storage in `uploads/` directory for images and documents
- Multer middleware for multipart form handling (10MB file size limit)
- Image expiry mechanism with configurable hours (default: 3 hours)
- Cron-based cleanup jobs for expired images

### External Dependencies

**AI Integration**
- Custom AI API endpoint configured in config.json
- AI chat accessible via @ai mentions in chat rooms
- Contextual message processing with conversation history

**Push Notifications**
- Web Push API for browser notifications
- VAPID keys for push subscription authentication
- Push subscription storage in database

**Development Tools**
- Replit-specific plugins for error overlay, cartographer, and dev banner
- TypeScript compilation without emit for type checking
- ESBuild for production server bundling

**Third-party UI Libraries**
- Radix UI primitives (20+ component primitives)
- React Hook Form with Zod resolvers for form validation
- Lucide React for icon system
- class-variance-authority (CVA) for component variant management
- tailwind-merge and clsx for dynamic class composition

### Security & Configuration

**Configuration Management**
- config.json for environment-specific settings (governors, departments, AI endpoint)
- Pre-seeded admin and governor accounts with hardcoded credentials
- Developer contact information watermarked in UI
- System configuration for image expiry, upload limits, and session timeout

**Data Initialization**
- Automated system initialization on server start
- Backup/restore mechanism for admin user data (admin_backup.json)
- Default room creation (General room) on first run
- Department seeding from configuration

**Session Management**
- MemoryStore for session storage (24-hour pruning)
- HTTP-only cookies for session tokens
- CSRF protection via session secret
- Automatic session cleanup on expiry
- 8-hour session timeout

### API Architecture

**Endpoint Structure**
- `/api/auth/*` - Authentication endpoints (login, logout, registration, session check)
- `/api/rooms/*` - Chat room management
- `/api/messages/*` - Message CRUD operations
- `/api/notifications/*` - Notification posting and retrieval
- `/api/documents/*` - Document upload/download/deletion
- `/api/admin/*` - Administrative functions (user management, system backup)
- `/api/departments` - Department listing
- `/api/config` - Client-side configuration exposure

**Request/Response Flow**
- JSON request bodies with express.json() middleware
- Credentials included in all fetch requests
- Error responses with structured JSON format
- Request logging middleware with duration tracking
- Raw body preservation for webhook verification

## Deployment Configuration

The application uses **SQLite** as its database, making deployment simple and portable:

**Environment Variables Required**
- `PORT`: Server port (automatically set by hosting platform, defaults to 5000)
- `NODE_ENV`: Set to "production" for production deployment
- `SESSION_SECRET`: Secure session secret key (required for session security)
- `TELEGRAM_BOT_TOKEN` (optional): For automated Telegram backups
- `TELEGRAM_CHAT_ID` (optional): Telegram chat for backup delivery

**Deployment Steps**

1. **Prepare the Application**
   - Push your code to GitHub repository
   - Ensure `data/admin_backup.json` is in your repository for initial user restoration
   - The SQLite database file (`data/cie_portal.db`) will be created automatically

2. **Deploy to Hosting Platform**
   - Deploy to any Node.js hosting platform (Render, Railway, Heroku, etc.)
   - Set environment variables in the platform dashboard:
     - `NODE_ENV=production`
     - `PORT=5000` (or let platform set automatically)
     - `SESSION_SECRET` (generate a secure random string)
     - `TELEGRAM_BOT_TOKEN` (optional)
     - `TELEGRAM_CHAT_ID` (optional)
   - Build command: `npm run build`
   - Start command: `npm start`

3. **Database Persistence**
   - **Important**: The SQLite database is stored in the `data/` directory
   - For platforms with ephemeral filesystems (like Render free tier), the database will reset on each deployment
   - For persistent storage:
     - Use a platform with persistent disks (Render paid tier, Railway, VPS)
     - Or migrate to PostgreSQL for cloud deployments (requires code changes)
     - Backups are automatically created in `data/admin_backup.json` and can be sent to Telegram

**Key Features**
- Server listens on `0.0.0.0:PORT` (cloud-compatible)
- No external database required - SQLite is embedded
- Automatic user and notification restoration from backup on startup
- Cron jobs for image cleanup (runs hourly)
- WebSocket support for real-time features
- Production-ready build pipeline with Vite + ESBuild

## Backup and Data Management

### Automated Backup System

The application includes a comprehensive backup system that preserves user credentials and notifications:

**Backup File Location**
- Local backup stored at: `data/admin_backup.json`
- Contains: All user credentials (with bcrypt hashed passwords), phone numbers, roles, departments, and notifications
- Updated automatically when: users sign up, notifications are posted/deleted, or users are deleted

**Backup Restoration**
- On system initialization, the app automatically restores all users and notifications from `admin_backup.json`
- Users in the backup file can login immediately without needing to create new accounts
- Notifications are restored with their original IDs, reactions, and comments
- Password detection: Automatically handles both bcrypt hashes and plaintext passwords
- Missing users/notifications are created, existing ones are preserved

**Scheduled Telegram Backup**
- Configured via `config.json` → `system.backupIntervalHours` (default: 24 hours)
- Sends `admin_backup.json` to Telegram at specified intervals
- Requires environment variables: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- If Telegram credentials are not configured, local backups still work normally

**Production Deployment Backups**
- Include `data/admin_backup.json` in your deployment repository
- On startup, the system automatically restores users and notifications from this file
- For platforms with ephemeral storage, commit the backup file to ensure data persistence across deployments
- Scheduled Telegram backups ensure you always have an off-server copy

### Security Considerations and Recommendations

⚠️ **IMPORTANT SECURITY NOTICES**

**Current Backup System Security Risks:**

1. **Credential Exposure via Telegram**
   - The backup file contains all user credentials (even though passwords are bcrypt hashed)
   - Sending credentials via Telegram creates a security risk if:
     - The Telegram bot token is compromised
     - The Telegram chat is accessed by unauthorized persons
     - The backup file is intercepted during transmission
   
2. **Plain Credentials in config.json**
   - Default admin and governor credentials are stored in `config.json` in plaintext
   - These credentials should be changed immediately after first deployment
   - The config.json file should never be committed to public repositories

3. **File System Access**
   - The `admin_backup.json` file is stored locally and accessible to anyone with file system access
   - This file contains all user data including hashed passwords

**Recommended Security Improvements:**

1. **Telegram Backup Best Practices**
   - Use a private Telegram channel with restricted access
   - Enable two-factor authentication on the Telegram account
   - Consider encrypting the backup file before sending
   - Rotate Telegram bot tokens regularly
   - Monitor backup delivery logs for suspicious activity

2. **Credential Management**
   - Change default admin/governor passwords immediately after deployment
   - Use strong, unique passwords (minimum 12 characters, mixed case, numbers, symbols)
   - Store production credentials in environment variables, not in config.json
   - Implement password rotation policies for admin accounts
   - Consider implementing multi-factor authentication for admin/governor roles

3. **Backup Encryption (Future Enhancement)**
   - Encrypt `admin_backup.json` before storing locally
   - Encrypt backups before sending via Telegram
   - Use environment variable for encryption key (never commit to repository)
   - Implement automated key rotation

4. **Access Control**
   - Restrict file system access to `data/` directory
   - Implement role-based access for backup download functionality
   - Add audit logging for backup file access
   - Monitor unauthorized access attempts

5. **Alternative Backup Solutions**
   - Consider database-level backups instead of JSON files
   - Use encrypted cloud storage (AWS S3, Google Cloud Storage) with proper IAM
   - Implement automated backup verification and integrity checks
   - Set up backup retention policies (e.g., keep last 30 days)

**Current Implementation Status:**
- ✅ Passwords are bcrypt hashed (10 salt rounds) before storage
- ✅ Backup restoration works correctly on system initialization
- ✅ Scheduled backups configured via config.json
- ✅ Telegram integration is optional (gracefully skips if not configured)
- ⚠️ No encryption on backup files
- ⚠️ Default credentials in config.json (should be changed in production)

**For Production Deployment:**
1. Set unique `SESSION_SECRET` environment variable
2. Change all default passwords in config.json
3. If using Telegram backup, secure the Telegram channel and bot
4. Regularly monitor backup logs and system access
5. Set up database backups at the infrastructure level (Render PostgreSQL backups)