# CIE Faculty Portal

## Overview

The CIE Faculty Portal is a comprehensive Progressive Web Application (PWA) designed for the Computer and Information Engineering faculty. It serves as a centralized platform for multi-role educational management, enabling communication between students, department governors, faculty governors, and administrators. The system provides real-time chat capabilities, notifications management, document sharing, and role-based access control across four departments: Computer Engineering, Information Systems, Software Engineering, and Network Engineering.

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
- Session-based authentication using express-session with PostgreSQL session store
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
- PostgreSQL as the primary relational database
- Drizzle ORM for type-safe database queries and schema management
- Connection pooling via node-postgres (pg) library

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
- PostgreSQL-backed session store (connect-pg-simple)
- HTTP-only cookies for session tokens
- CSRF protection via session secret
- Automatic session cleanup on expiry

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

## Render Deployment Configuration

The application is fully compatible with Render.com deployment:

**Environment Variables Required**
- `DATABASE_URL`: PostgreSQL connection string (provided by Render's PostgreSQL add-on)
- `PORT`: Server port (automatically set by Render, defaults to 5000)
- `NODE_ENV`: Set to "production" for production deployment
- `SESSION_SECRET`: Secure session secret key
- `DB_SSL`: Set to "true" if using Render's PostgreSQL (requires SSL)

**Deployment Steps**
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Add Render PostgreSQL add-on (provides internal DATABASE_URL)
4. Set environment variables in Render dashboard
5. Build command: `npm run build`
6. Start command: `npm start`

**Key Features**
- Server listens on `0.0.0.0:PORT` (Render-compatible)
- Automatic database schema push on deployment
- Cron jobs for image cleanup (runs hourly)
- WebSocket support for real-time features
- Production-ready build pipeline with Vite + ESBuild