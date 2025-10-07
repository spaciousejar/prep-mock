### perpmock — AI Mock Interviews

AI-powered platform for practicing job interviews with real-time voice and instant feedback.

- **Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS v4, Firebase, Google Gemini AI SDK, Vapi Web SDK, Zod, Sonner.
- **Auth & Data**: Firebase Auth (session cookie) + Firestore.
- **Realtime voice**: Vapi assistant/workflow.
- **AI feedback**: Structured feedback via AI SDK + Zod.

### Features
- Email/password sign up & sign in
- Generate interview questions (role, level, type, tech stack)
- AI voice interviews
- Auto-save interview records with covers, tech icons, dates, scores
- Feedback page with scores, strengths, improvements

### Requirements
- Node.js 18+
- Firebase project (Admin + Web SDK credentials)
- Vapi account (Web token, workflow/assistant)
- Google AI SDK access


### Quick Start
```
npm run dev 

```

### Key Paths
- Auth/session:
  - `firebase/admin.ts` initializes Admin SDK and Firestore.
  - `lib/actions/auth.action.ts` handles session cookie, sign-up, sign-in, and current user retrieval.
  - `app/(auth)/layout.tsx` and `app/(root)/layout.tsx` gate routes by auth status.
- Interview generation:
  - `app/api/vapi/generate/route.ts` uses AI SDK Google model to produce questions and stores an `interviews` document.
  - `app/(root)/interview/page.tsx` renders the “generate” flow with `Agent`.
- Taking interviews:
  - `app/(root)/interview/[id]/page.tsx` renders an interview session with `Agent`.
  - `components/Agent.tsx` handles voice session via Vapi, and on finish posts transcript to `createFeedback`.
- Feedback:
  - `lib/actions/general.action.ts` `createFeedback` uses AI SDK + Zod schema to create structured feedback and saves it to Firestore.
  - `app/(root)/interview/[id]/feedback/page.tsx` displays feedback breakdown, strengths, improvements.
- UI:
  - `components/InterviewCard.tsx` shows interview cards with dates, scores, and CTAs.
  - `components/DisplayTechIcons.tsx` maps tech stack to logos.
  - `app/globals.css` contains Tailwind v4 themes/utilities.

### Firestore Collections
- `users/{uid}`: { name, email }
- `interviews/{id}`: { role, level, type, techstack[], questions[], userId, finalized, coverImage, createdAt }
- `feedback/{id}`: { interviewId, userId, totalScore, categoryScores[], strengths[], areasForImprovement[], finalAssessment, createdAt }

### Vapi Setup
- Create a Web Token and set `NEXT_PUBLIC_VAPI_WEB_TOKEN`.
- Create a workflow ID used for “generate” flow and set `NEXT_PUBLIC_VAPI_WORKFLOW_ID`.
- The live interview flow uses the `interviewer` assistant defined in `constants/index.ts` with provider settings (e.g., Deepgram, 11labs, OpenAI). Adjust to your providers.


### Troubleshooting
- Auth returns null: verify `session` cookie creation in `setSessionCookie` and Admin credentials.
- No interviews listed: ensure `GET /api/vapi/generate` and POST body fields match; verify Firestore rules.
- Voice call doesn’t start: confirm `NEXT_PUBLIC_VAPI_WEB_TOKEN` and workflow/assistant availability.
- AI feedback fails: check `GOOGLE_GENERATIVE_AI_API_KEY` and model availability; see console logs.