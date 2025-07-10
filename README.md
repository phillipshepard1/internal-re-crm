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

### Key Workflows
- **Lead Management**: Round Robin assignment for new leads
- **Follow-up Workflow**: Automated follow-up scheduling with interaction logging
- **Contact Management**: Comprehensive contact profiles with activity tracking

### User Roles
- **Admin**: Full system access, user management, round robin configuration
- **Agent**: Core module access, assigned contacts only

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + Tailwind UI
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Icons**: Heroicons
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

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
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_APP_NAME=CRM Project
   ```

4. **Set up Supabase Database**

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

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel
│   ├── follow-ups/        # Follow-ups module
│   ├── login/             # Authentication
│   ├── notes/             # Notes module
│   ├── people/            # People module
│   ├── tasks/             # Tasks module
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── auth/              # Authentication components
│   └── layout/            # Layout components
├── contexts/              # React contexts
├── lib/                   # Utility libraries
└── types/                 # TypeScript type definitions
```

## Key Features Implementation

### Authentication
- Supabase Auth integration
- Role-based access control
- Protected routes with AuthGuard

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
- User management
- Round Robin configuration
- Activity monitoring

## Development Notes

### Current Status
- ✅ Basic UI structure and navigation
- ✅ Authentication setup with role-based access
- ✅ All main module pages created
- ✅ Complete client information fields
- ✅ Round Robin lead assignment logic
- ✅ API integration for lead sources
- ✅ Role-based data access (agents see only assigned contacts)
- ✅ Real-time dashboard statistics
- ✅ Enhanced Person interface with all required fields
- ⏳ Database schema implementation
- ⏳ File upload functionality
- ⏳ Advanced activity monitoring

### Next Steps
1. Set up Supabase database with the provided schema
2. Configure environment variables for lead source API
3. Test round robin assignment functionality
4. Implement file upload functionality
5. Add advanced activity monitoring and reporting
6. Set up automated lead processing (cron jobs/webhooks)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary and confidential.
