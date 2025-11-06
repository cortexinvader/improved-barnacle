# CIE Faculty Portal - Design Guidelines

## Design Approach

**Selected Approach:** Utility-Focused Design System with Material Design 3 principles  
**Rationale:** This is an information-dense, multi-role educational platform requiring clear hierarchy, excellent usability, and consistent patterns across complex features (chat, notifications, documents, admin panels).

**Color Scheme Mandate:** Modern minimalistic grey, black, and white palette as specified. All design decisions support this monochromatic foundation.

## Core Design Principles

1. **Role Clarity:** Each user role (Student, Department Governor, Faculty Governor, Admin) gets distinct dashboard layouts with clear visual hierarchy
2. **Information Density:** Maximize content visibility while maintaining breathing room - this is a productivity tool, not marketing
3. **Monochrome Sophistication:** Use subtle shadows, borders, and surface elevation to create depth without color
4. **Mobile-First PWA:** Touch-friendly targets (min 44px), gesture-friendly interactions, optimized for phone screens

## Typography System

**Font Family:** Inter (primary), Roboto Mono (code/technical content)  
**Hierarchy:**
- H1: 2rem (32px), font-weight 700 - Dashboard headers
- H2: 1.5rem (24px), font-weight 600 - Section titles, room names
- H3: 1.25rem (20px), font-weight 600 - Card headers, notification titles
- Body: 1rem (16px), font-weight 400 - Default text
- Small: 0.875rem (14px), font-weight 400 - Metadata, timestamps
- Caption: 0.75rem (12px), font-weight 500 - Labels, badges

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm  
**Common Patterns:**
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4
- Icon margins: mr-2, ml-2

**Container Strategy:**
- Dashboard main content: max-w-7xl mx-auto px-4
- Chat interface: Full-width with fixed header/input
- Modal/Dialog: max-w-2xl
- Forms: max-w-md for signup, max-w-xl for multi-step

## Component Library

### Navigation & Headers

**Top Navigation Bar:**
- Height: 64px, fixed position
- Left: Logo/App name with small icon
- Center: Page title (role-specific)
- Right: User avatar (initials-based), notification bell with badge counter, menu icon
- Subtle bottom border (1px) for separation

**Sidebar (Desktop Only):**
- Width: 280px, collapsible to 64px (icon-only)
- Sections: Dashboard, Chat Rooms, Notifications, Documents, Profile
- Active state: Subtle background treatment with left border accent (4px)

### Dashboard Layouts

**Student Dashboard:**
- Hero section: Welcome banner with name, department, reg number
- Grid layout (2 columns desktop, 1 mobile):
  - Left: Notifications feed (general + department)
  - Right: Quick stats, upcoming deadlines, recent documents
- Watermark: Fixed bottom-right, semi-transparent developer info with contact

**Governor Dashboards:**
- Post Creation Panel: Prominent card at top with:
  - Large textarea (min-height 120px)
  - Post type selector (urgent/regular/cruise) as chip buttons
  - Department targeting dropdown (department governors)
  - Emoji picker inline
  - Submit button (large, full-width on mobile)
- Posted notifications list below with edit/delete actions

**Admin Dashboard:**
- 3-column grid (1 col mobile):
  - User management, Room management, Backup/Restore controls
- Elevated cards with clear action buttons
- Override controls with confirmation modals

### Chat System

**Room Switcher:**
- Horizontal scrollable chip list (mobile) or sidebar list (desktop)
- Active room: Filled chip style
- Badge indicators for unread counts

**Message Container:**
- Infinite scroll with virtual scrolling for performance
- Message bubbles:
  - Sent: Align right, max-width 70%
  - Received: Align left, max-width 70%
  - Subtle rounded corners (8px)
  - Padding: p-3
  - Timestamp below in caption size
  - Reaction bar below (heart, thumbs up, etc.)

**Message Input Area:**
- Fixed bottom, elevated above content
- Height: Auto-expanding textarea (48px to 120px max)
- Toolbar row above input:
  - Left: Format buttons (bold, italic, color picker, image upload)
  - Right: AI mention shortcut, send button
- Mention autocomplete dropdown above input

**Image Messages:**
- Inline thumbnails (max 300px width) in message bubble
- Expiration timer badge (top-right corner)
- Click to expand lightbox view

### Notifications Feed

**Notification Cards:**
- Full-width with subtle border
- Header row: Icon (urgent/regular/cruise emoji), Title, Timestamp
- Content: Rich text with proper line-height (1.6)
- Footer: Reaction buttons, comment count, reference count
- Expandable comments section (accordion)
- Department badge (top-right corner for department-specific)

**Reaction System:**
- Inline emoji reaction bar (heart, like, celebrate, etc.)
- Count displayed next to each emoji
- User's reactions highlighted

### Document Upload Interface

**Upload Zone:**
- Large dropzone (min 200px height)
- Drag-and-drop visual feedback
- File type icons for PDF/DOC
- Upload button as secondary action
- Progress bar during upload

**Document List:**
- Table view (desktop) with columns: Name, Owner, Department, Uploaded, Size, Expiration, Actions
- Card view (mobile) with same info stacked
- Filters: By department, by type, by owner

### User Profiles

**Profile Card:**
- Centered layout (max-w-2xl)
- Large initials avatar (96px circle)
- Info grid below:
  - Username, Phone, Reg Number (students only)
  - Role badge, Department name
- No edit controls (read-only for viewing others)

### Forms & Inputs

**Signup Form:**
- Step-by-step wizard (desktop) or vertical scroll (mobile)
- Fields: Standard text inputs (height 48px)
- Department selector: Searchable dropdown
- Tutorial modal triggers on submission (blocking overlay)

**Input Standards:**
- Height: 48px minimum for touch
- Border: 1px, increased to 2px on focus
- Label: Floating style or top-aligned
- Error states: Red underline + helper text below
- Icon support: Left-aligned icons in inputs

### Modals & Overlays

**Tutorial Modal (Signup Guide):**
- Full-screen overlay (mobile) or large centered modal (desktop)
- Multi-step carousel with progress dots
- Each step: Illustration/screenshot + title + description
- Navigation: Previous/Next buttons, Skip link

**Confirmation Dialogs:**
- Centered, max-w-md
- Clear title, description, two action buttons (confirm/cancel)
- Destructive actions (delete) get visual emphasis

### Status Indicators & Badges

**Online Status:** Small dot (8px) on avatar corner  
**Notification Badges:** Pill shape with count, max-width for large numbers (99+)  
**Role Badges:** Rounded rectangle with text (Student, Gov, Admin)  
**Post Type Tags:** Urgent (filled), Regular (outline), Cruise (with emoji)

## Responsive Breakpoints

- Mobile: < 768px (single column, stacked layout, bottom nav)
- Tablet: 768px - 1024px (2 columns where appropriate, sidebar toggles)
- Desktop: > 1024px (full sidebar, 3-column grids, spacious layout)

## PWA-Specific Elements

**Install Prompt Banner:**
- Slides up from bottom on mobile
- Dismissible with X icon
- "Add to Home Screen" primary action button
- App icon + name + brief description

**Offline Indicator:**
- Subtle banner at top when offline
- Icon + "No connection" message
- Auto-dismisses when back online

**Push Notification Badge:**
- System-level badge on app icon (handled by browser)
- In-app: Bell icon with count in top nav

## Accessibility Standards

- Min contrast ratios maintained in monochrome scheme
- Focus indicators: 2px outline on all interactive elements
- Keyboard navigation: Logical tab order throughout
- Screen reader labels on icon-only buttons
- Touch targets: Minimum 44x44px
- Form validation: Clear error messages with icons

## Animation Philosophy

**Use Sparingly:**
- Page transitions: Simple fade (200ms)
- Card/Modal entrance: Subtle scale + fade (250ms)
- Notification toast: Slide in from top (300ms)
- No decorative animations - only functional feedback

## Images

**No Hero Images:** This is a utility application - lead with functionality, not visuals  
**User Avatars:** Generated from initials, circular, no photos  
**Upload Previews:** Thumbnail generation for uploaded images in chat (300x300px max)  
**Icons:** Heroicons library via CDN for consistent iconography throughout