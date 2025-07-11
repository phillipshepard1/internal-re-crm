# CRM System

A modern, internal CRM system built with Next.js, Tailwind CSS, and Supabase for lead management and follow-up workflows.

## Features

### Core Modules
- **Dashboard**: Overview of key metrics and quick actions
- **People**: Contact management with detailed profiles
- **Follow-ups**: Systematic follow-up scheduling and tracking
- **Tasks**: Task management and assignment
- **Notes**: System-wide note-taking
- **Admin Panel**: User management and system configuration

### Authentication & Security
- **Google OAuth**: One-click login with Google accounts
- **Email/Password**: Traditional authentication method
- **Domain-Based Roles**: Automatic admin assignment based on email domains
- **Role-Based Access**: Admin and Agent permissions
- **Session Management**: Secure session handling with Supabase

### Key Workflows
- **Lead Management**: Round Robin assignment for new leads
- **Follow-up Workflow**: Automated follow-up scheduling with interaction logging
- **Contact Management**: Comprehensive contact profiles with activity tracking

### User Roles
- **Admin**: Full system access, user management, round robin configuration
- **Agent**: Core module access, assigned contacts only

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Cloud Console account (for OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crm-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_APP_NAME=CRM Project
   
   # Google OAuth (optional - for additional features)
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   
   # Admin Domain Configuration
   NEXT_PUBLIC_ADMIN_DOMAINS=yourcompany.com,admin.yourcompany.com
   ```

4. **Set up Google OAuth (Optional but Recommended)**
   
   Follow the comprehensive setup guide: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
   
   Quick setup:
   - Create Google Cloud Console project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Configure Supabase Google provider
   - Set admin domains in environment variables

5. **Set up Supabase Database**

   Create the following tables in your Supabase database:

   ```sql
   -- Users table (extends Supabase auth.users)
   CREATE TABLE users (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     email TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
     in_round_robin BOOLEAN DEFAULT false,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- People table (enhanced with all client information fields)
   CREATE TABLE people (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     first_name TEXT NOT NULL,
     last_name TEXT,
     profile_picture TEXT,
     email TEXT[],
     phone TEXT[],
     client_type TEXT,
     birthday DATE,
     mailing_address TEXT,
     relationship_id UUID REFERENCES people(id),
     assigned_to UUID REFERENCES users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     last_interaction TIMESTAMP WITH TIME ZONE,
     next_follow_up TIMESTAMP WITH TIME ZONE,
     best_to_reach_by TEXT,
     notes TEXT,
     lists TEXT[]
   );

   -- Properties table for people's property information
   CREATE TABLE properties (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     person_id UUID REFERENCES people(id) NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('looking_for', 'selling', 'closed')),
     description TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Lists table for categorizing people
   CREATE TABLE lists (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL UNIQUE,
     description TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- People lists junction table
   CREATE TABLE people_lists (
     person_id UUID REFERENCES people(id) ON DELETE CASCADE,
     list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
     PRIMARY KEY (person_id, list_id)
   );

   -- Notes table
   CREATE TABLE notes (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     title TEXT NOT NULL,
     content TEXT NOT NULL,
     person_id UUID REFERENCES people(id),
     created_by UUID REFERENCES users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tasks table
   CREATE TABLE tasks (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT,
     person_id UUID REFERENCES people(id),
     assigned_to UUID REFERENCES users(id),
     due_date DATE,
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Follow-ups table
   CREATE TABLE follow_ups (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     person_id UUID REFERENCES people(id) NOT NULL,
     due_date DATE NOT NULL,
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
     notes TEXT,
     created_by UUID REFERENCES users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Activity log table
   CREATE TABLE activities (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     person_id UUID REFERENCES people(id) NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('created', 'follow_up', 'note_added', 'task_added')),
     description TEXT NOT NULL,
     created_by UUID REFERENCES users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Files table for file uploads
   CREATE TABLE files (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     person_id UUID REFERENCES people(id),
     filename TEXT NOT NULL,
     file_path TEXT NOT NULL,
     file_size INTEGER,
     mime_type TEXT,
     uploaded_by UUID REFERENCES users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Insert default lists
   INSERT INTO lists (name, description) VALUES
     ('VIP Clients', 'High-value clients requiring special attention'),
     ('Hot Leads', 'Leads with high conversion potential'),
     ('Cold Leads', 'Leads requiring follow-up'),
     ('Past Clients', 'Previous clients for re-engagement');
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Authentication Features

### Google OAuth Integration
- **One-click login** with Google accounts
- **Domain-based role assignment** - Company emails get admin access
- **Automatic user creation** with proper role assignment
- **Secure session management** with Supabase

### Role Assignment Logic
- **Admin Domains**: Users with emails from configured domains get admin access
- **Agent Default**: All other users get agent access
- **Manual Override**: Admins can change user roles in the admin panel

### Environment Configuration
```bash
# Configure admin domains (comma-separated)
NEXT_PUBLIC_ADMIN_DOMAINS=yourcompany.com,admin.yourcompany.com,management.yourcompany.com
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel with role management
│   ├── follow-ups/        # Follow-ups module
│   ├── login/             # Authentication (Google + Email/Password)
│   ├── notes/             # Notes module
│   ├── people/            # People module
│   ├── tasks/             # Tasks module
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── auth/              # Authentication components
│   └── layout/            # Layout components
├── contexts/              # React contexts (AuthContext with Google OAuth)
├── lib/                   # Utility libraries
└── types/                 # TypeScript type definitions
```

## Key Features Implementation

### Authentication
- **Supabase Auth** with Google OAuth integration
- **Role-based access control** with domain-based assignment
- **Protected routes** with AuthGuard
- **Session persistence** and automatic role assignment

### People Module
- Contact list with search and filtering
- Detailed contact profiles with all required fields:
  - Profile picture upload
  - Multiple email addresses
  - Multiple phone numbers
  - Client types dropdown
  - Birthday field
  - Lists/tags functionality
  - Mailing address
  - Relationship linking
  - Best to reach by preference
  - Properties section (Looking For, Selling, Closed)
  - General notes
- Activity tracking
- Notes and tasks per contact

### Follow-ups Workflow
- Scheduled follow-up tracking
- Interaction logging
- Automatic next follow-up scheduling
- Overdue/upcoming filtering

### Admin Panel
- **User management** with role assignment
- **Role management** with domain configuration display
- **Round Robin configuration** for lead distribution
- **System settings** and integration status
- **Authentication monitoring** and configuration

## Documentation

- **[Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)** - Complete setup instructions
- **[Lead Integration Guide](./LEAD_INTEGRATION_GUIDE.md)** - Lead capture and processing
- **[Database Schema](./supabase/migrations/)** - Database structure and migrations

## Deployment

### Production Considerations
1. **Environment Variables**: Set production values
2. **Google OAuth**: Update redirect URLs for production domain
3. **SSL Certificate**: Required for Google OAuth in production
4. **Admin Domains**: Configure production admin domains
5. **Supabase**: Use production Supabase project

### Environment Variables for Production
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_ADMIN_DOMAINS=yourcompany.com,admin.yourcompany.com
```

## Support

For authentication setup and troubleshooting:
1. Check [Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)
2. Review browser console for errors
3. Verify environment variables
4. Check Supabase authentication logs

---

**Your CRM now features enterprise-grade authentication with Google OAuth and domain-based role management! 🚀**
