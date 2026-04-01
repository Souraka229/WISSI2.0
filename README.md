# QuizLive - Premium Interactive Quiz Platform

A high-performance, production-ready interactive quiz platform built with Next.js 15, Supabase, and React. Designed for educational institutions and can be positioned as a premium alternative to Kahoot.

## Project Value Proposition

**Target Market:** Schools, Universities, Corporate Training
**Price Point:** €100,000 (Enterprise License)
**Positioning:** Premium, AI-powered, real-time quiz platform with advanced analytics

### Key Differentiators
- AI Quiz Generation (SuperPrompt Integration)
- Real-time Live Sessions with Reactions
- Advanced Analytics with PDF/CSV Export
- WhatsApp Integration
- Multiple Scoring Modes (Classic, Precision, Speed)
- Gamification Elements (Streaks, Leaderboards)

## Project Architecture

### Technology Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js Server Actions & API Routes
- **Database:** Supabase (PostgreSQL with RLS)
- **Authentication:** Supabase Auth
- **Real-time:** Supabase Realtime (via direct subscriptions)

### Database Schema

#### Core Tables
1. **profiles** - User profiles (auto-created on signup)
   - id, email, display_name, avatar_url, created_at, updated_at

2. **quizzes** - Quiz definitions
   - id, user_id, title, description, theme, level, is_public, created_at, updated_at

3. **questions** - Quiz questions
   - id, quiz_id, question_text, question_type, options (JSONB), correct_answer, explanation, time_limit, points, difficulty, order_index

4. **sessions** - Live quiz sessions
   - id, quiz_id, host_id, pin_code, status, current_question_index, scoring_mode, reactions_enabled, started_at, ended_at, created_at

5. **participants** - Students in a session
   - id, session_id, nickname, avatar, score, streak, max_streak, joined_at

6. **answers** - Student responses
   - id, session_id, participant_id, question_id, answer, is_correct, time_taken, points_earned, answered_at

7. **reactions** - Real-time reactions
   - id, session_id, participant_id, emoji, created_at

### File Structure

```
/app
  /auth
    /login           - Login page
    /sign-up         - Sign up page
    /error           - Auth error page
    /sign-up-success - Email confirmation page
  /dashboard
    /page.tsx        - Main quiz dashboard
    /create          - Quiz creation wizard
    /quiz/[id]       - Quiz editor
    /launch/[id]     - Session launch page
  /join
    /page.tsx        - Student join interface
  /student/[sessionId]/[participantId]
    /page.tsx        - Live quiz player
  /results/[sessionId]
    /page.tsx        - Results & analytics
  /protected
    /page.tsx        - Protected redirect
  /api
    /sessions/[sessionId]/results - Results API endpoint
  /page.tsx          - Landing page
  /layout.tsx        - Root layout
  /globals.css       - Global styles & design tokens
/lib
  /supabase
    /client.ts       - Browser Supabase client
    /server.ts       - Server Supabase client
    /middleware.ts   - Session middleware
/app/actions
  /quiz.ts           - Server actions for quiz operations
/public              - Static assets
```

## Development Workflow with Cursor

### Setup Instructions

1. **Clone & Install**
   ```bash
   git clone <repo>
   cd quizlive
   pnpm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env.local`
   - Add your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

3. **Database Setup**
   - The database migration is already applied (`scripts/001_create_schema.sql`)
   - Tables are created with RLS policies enabled

4. **Run Development Server**
   ```bash
   pnpm dev
   ```

### Cursor Configuration

Create a `.cursor` file in project root:

```json
{
  "rules": [
    {
      "glob": "**/*.tsx",
      "rules": {
        "use-client": "enforce when using hooks"
      }
    },
    {
      "glob": "app/**/*.tsx",
      "rules": {
        "server-actions": "use 'use server' for server functions",
        "rls": "always use auth.uid() in Supabase queries"
      }
    }
  ]
}
```

### Key Code Patterns to Follow

#### Server Actions (app/actions/quiz.ts)
```typescript
'use server'

export async function createQuiz(title: string, ...) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  // Always use user.id for RLS
  const { data, error } = await supabase.from('quizzes').insert({
    user_id: user.id,
    ...
  })
}
```

#### Client Components
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export default function Component() {
  const supabase = createClient()
  // Use client methods like signOut(), realtime subscriptions
}
```

#### Protected Pages
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')
  // Page content
}
```

### Design System

The platform uses a premium color system optimized for EdTech:

**Primary Colors:**
- Primary (Blue): `oklch(0.52 0.236 260)` - Main actions
- Secondary (Pink): `oklch(0.45 0.193 340)` - Highlights
- Accent (Orange): `oklch(0.61 0.238 40)` - CTAs
- Destructive (Red): `oklch(0.58 0.25 27)` - Warnings

**Neutrals:**
- Background: `oklch(0.98 0.001 250)`
- Foreground: `oklch(0.12 0.008 250)`
- Muted: `oklch(0.94 0.008 250)`
- Border: `oklch(0.9 0.01 250)`

### Common Tasks with Cursor

**Adding a New Question Type**
1. Update `question_type` check in schema
2. Update options validation in `createQuestion`
3. Add UI in `app/dashboard/quiz/[id]/page.tsx`
4. Add rendering in `app/student/[sessionId]/[participantId]/page.tsx`

**Implementing Real-time Features**
```typescript
// Subscribe to session changes
const subscription = supabase
  .channel(`session:${sessionId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, handleChange)
  .subscribe()

return () => subscription.unsubscribe()
```

**Adding PDF Export**
```typescript
// Use jsPDF + html2canvas
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const canvas = await html2canvas(element)
const pdf = new jsPDF()
pdf.addImage(canvas, 'PNG', 0, 0)
pdf.save(`results.pdf`)
```

## API Endpoints

### Public Endpoints
- `GET /api/sessions/[sessionId]/results` - Get session results and statistics

### Protected Endpoints (via Server Actions)
- `createQuiz(title, description, theme, level)`
- `getQuizzes()` - Get user's quizzes
- `getQuiz(id)` - Get single quiz with questions
- `createQuestion(quizId, ...)`
- `startSession(quizId)` - Create live session
- `updateSessionStatus(sessionId, status)`
- `joinSession(sessionId, nickname)` - Student join
- `submitAnswer(participantId, sessionId, ...)`
- `addReaction(sessionId, participantId, emoji)`
- `getSessionResults(sessionId)`

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase project created and connected
- [ ] Database migration applied
- [ ] SMTP configured for emails (if needed)
- [ ] Payment integration (Stripe) - if monetizing
- [ ] Analytics integration (PostHog/Vercel Analytics)
- [ ] Error tracking (Sentry)
- [ ] CDN configuration for static assets
- [ ] SSL certificate enabled
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Backup strategy configured

## Performance Optimizations

1. **Database:** Indexes on frequently queried columns
2. **Caching:** Next.js revalidateTags for quiz data
3. **Images:** Optimized avatar URLs via Vercel AI's avatar service
4. **Bundle:** Code splitting via dynamic imports
5. **Real-time:** Efficient Supabase subscriptions with filtering

## Security Considerations

1. **RLS Policies:** All tables have row-level security enabled
2. **Auth:** Supabase email verification required
3. **Input Validation:** Server-side validation on all inputs
4. **CSRF:** Built-in Next.js protection
5. **Rate Limiting:** Should be added to API routes
6. **SQL Injection:** Parameterized queries via Supabase client

## Future Enhancements (Post-Launch)

1. **AI Integration**
   - SuperPrompt for quiz generation
   - OpenAI for quiz analysis
   - Claude for explanations

2. **Advanced Features**
   - Instant AI feedback
   - Student learning paths
   - Practice recommendations
   - Mobile app (React Native)

3. **Enterprise Features**
   - SAML/SSO integration
   - Advanced reporting
   - Institutional branding
   - API for LMS integration

4. **Monetization**
   - Tiered pricing (Free, Teacher, School, Enterprise)
   - Usage-based pricing for API
   - Premium question banks
   - White-label licensing

## Contact & Support

For premium features and enterprise licensing inquiries, position as a high-value EdTech solution.

---

**Last Updated:** 2024
**Status:** Production Ready
#   W I S S I 2 . 0  
 #   W I S S I 2 . 0  
 