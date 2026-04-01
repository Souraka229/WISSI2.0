# QuizLive - Quick Start Guide

Get started with QuizLive in 5 minutes.

## 1. Environment Setup (1 min)

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

## 2. Install Dependencies (2 min)

```bash
pnpm install
```

## 3. Run Development Server (1 min)

```bash
pnpm dev
```

The app is now running at `http://localhost:3000`

## 4. Test the Flow (1 min)

### As a Teacher:
1. Go to `/auth/sign-up`
2. Create account with test email
3. Confirm email (check your inbox)
4. Login and go to dashboard
5. Create a quiz
6. Add some questions
7. Click "Launch" to start a session
8. Get the PIN code

### As a Student:
1. Open new tab/window
2. Go to `/join`
3. Enter the PIN code from teacher
4. Enter your name
5. Answer quiz questions
6. See results on leaderboard

## 5. Database Status

The database is pre-configured with:
- ✅ All 7 tables created
- ✅ Row Level Security enabled
- ✅ Proper relationships set up
- ✅ Indexes for performance
- ✅ Auto profile creation on signup

**No additional setup needed!**

---

## Key URLs

| Page | URL | Role |
|------|-----|------|
| Landing | `/` | Everyone |
| Sign Up | `/auth/sign-up` | Teacher |
| Login | `/auth/login` | Teacher |
| Dashboard | `/dashboard` | Teacher (protected) |
| Create Quiz | `/dashboard/create` | Teacher |
| Quiz Editor | `/dashboard/quiz/[id]` | Teacher |
| Launch | `/dashboard/launch/[id]` | Teacher |
| Join Quiz | `/join` | Student |
| Play Quiz | `/student/[sessionId]/[participantId]` | Student |
| Results | `/results/[sessionId]` | Everyone |

---

## File Locations for Common Tasks

### Add a New Page
1. Create file in `/app`
2. Use layout pattern from existing pages
3. Use `createClient()` for auth checks

### Add a Quiz Feature
1. Add action in `/app/actions/quiz.ts`
2. Use in component via `import { action } from '@/app/actions/quiz'`
3. Call with `await action(params)`

### Update Design
1. Edit color tokens in `/app/globals.css`
2. Or use Tailwind classes directly
3. Check `.cursor-reference.md` for patterns

### Debug Issues
1. Check browser console (F12)
2. Look at Supabase Studio for data
3. Verify auth: `supabase.auth.getSession()`
4. Check environment variables are loaded

---

## Common Commands

```bash
# Development
pnpm dev              # Start dev server

# Build & Deploy
pnpm build            # Create production build
pnpm start            # Start production server

# Database
pnpm supabase gen types  # Generate TS types

# Linting (if configured)
pnpm lint
```

---

## Test Accounts

To avoid email verification during development, you can:

1. **Use magic links in Supabase**
   - Go to Supabase → Auth → Users
   - Create test user manually
   - Reset password link

2. **Disable email confirmation** (development only)
   - Supabase → Authentication → Providers
   - Email → Disable "Confirm email"

3. **Auto-confirm in code** (temporary)
   - In server action: `await supabase.auth.admin.updateUserById(user.id, { email_confirmed_at: new Date() })`

---

## Architecture Overview

```
User Browser
    ↓
Next.js 15 (App Router)
    ↓
  ├── Server Actions (server-side mutations)
  ├── API Routes (public endpoints)
  └── Pages (RSC + Client components)
    ↓
Supabase
    ├── Auth (email/password)
    ├── Database (PostgreSQL)
    └── RLS (Row Level Security)
```

---

## Performance Tips

- Questions load lazy via server actions
- Session updates via revalidateTags
- Real-time ready (for WebSocket upgrades)
- Database queries indexed for speed
- Client components only when needed

---

## Next Steps

1. **Deploy to Vercel** (recommended)
   - `vercel deploy`
   - Set environment variables in dashboard

2. **Customize Design**
   - Edit color tokens in `globals.css`
   - Update fonts in `layout.tsx`
   - Modify components in `components/`

3. **Add Features**
   - See README.md for patterns
   - Use server actions for new features
   - Add to actions/quiz.ts

4. **Integration**
   - SuperPrompt API (AI quiz generation)
   - Stripe (payments)
   - SendGrid (emails)
   - Analytics tools

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not authenticated" | Login first at `/auth/login` |
| PIN code invalid | Make sure session is active |
| No questions showing | Add questions in quiz editor first |
| Styles not loading | Check `globals.css` is imported |
| Database errors | Verify Supabase URL/key in `.env.local` |
| Can't login | Check email is confirmed in Supabase |

---

## Support Resources

- **README.md** - Full documentation and architecture
- **.cursor-reference.md** - Code patterns and quick ref
- **PROJECT_SUMMARY.md** - Project overview
- **Supabase Docs** - https://supabase.com/docs
- **Next.js Docs** - https://nextjs.org/docs

---

**You're all set! Start with `/` and explore the app.**

Questions? Check the documentation files above.
