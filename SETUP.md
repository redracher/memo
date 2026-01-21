# Setup Instructions

## Database Setup

Before using the application, you need to create the notes table in Supabase.

### Step 1: Run the SQL Schema

1. Go to your Supabase dashboard: https://flchhzrxbmnvtdjhkkxa.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/notes-schema.sql`
5. Paste it into the SQL editor
6. Click **Run** or press `Cmd/Ctrl + Enter`

This will create:
- `notes` table with proper structure
- Row Level Security (RLS) policies so users can only access their own notes
- Indexes for performance
- Automatic `updated_at` timestamp trigger

### Step 2: Verify the Table

1. Go to **Table Editor** in the left sidebar
2. You should see a `notes` table
3. The table should have these columns:
   - `id` (uuid, primary key)
   - `user_id` (uuid, references auth.users)
   - `title` (text)
   - `content` (jsonb)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

### Step 3: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Add your Supabase credentials (you should already have these)
3. **For AI Pressure Test feature**: Add your Anthropic API key
   - Get an API key from: https://console.anthropic.com/
   - Add to `.env.local`: `ANTHROPIC_API_KEY=your_api_key_here`

### Step 4: Test the Application

1. Make sure your dev server is running: `npm run dev`
2. Go to http://localhost:3000/login
3. Sign up or log in
4. You should now see the dashboard with the sidebar
5. Click "+ New Note" to create your first note

## Features Implemented

✅ **Dashboard with Sidebar Layout**
- Fixed 280px sidebar with #f5f4f1 background
- App logo/name at top
- Search input for filtering notes
- Large "+ New Note" button (green #10b981)
- Scrollable list of notes sorted by last updated
- User email and logout button at bottom

✅ **Note Management**
- Create new notes with "Untitled" default title
- View all notes in the sidebar
- Click any note to open it
- Active note highlighted in sidebar
- Search notes by title

✅ **Note Editor Page**
- Large editable title input at top
- Novel rich text editor for content
- Auto-save with 2-second debounce
- "Saved" / "Saving..." / "Unsaved" indicator
- Full authentication check

✅ **Database Features**
- Row Level Security (users can only see their own notes)
- Automatic timestamps (created_at, updated_at)
- JSONB storage for rich editor content
- Fast queries with indexes

✅ **Advanced Features**
- **Hashtag Extraction**: Use #tags inline and filter by them in sidebar
- **Wiki Links**: Use [[Note Name]] to link between notes (creates stub notes if they don't exist)
- **Backlinks**: See which notes link to the current note
- **AI Pressure Test**: Click "🤖 Pressure Test" to get Claude's critical analysis of your investment thesis
  - Analyzes key assumptions, weakest points, counter-arguments
  - Provides risk factors and devil's advocate perspective
  - Suggests questions to investigate before committing capital
  - Can append analysis to note or copy to clipboard

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** with custom colors
- **Supabase** for database and authentication
- **TipTap** rich text editor with custom extensions
- **Anthropic Claude API** for AI analysis
- **Lucide React** for icons
