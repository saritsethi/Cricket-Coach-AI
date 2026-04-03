# CricketIQ - AI Cricket Intelligence Platform

## Overview
CricketIQ is an AI-powered cricket intelligence platform centred around **Teams** as the core object, with two roles:

- **Captain** – Creates teams, populates squads and schedules (via manual entry or image upload with AI extraction), runs pre-match planning conversations, post-match analysis, and shares analyses via WhatsApp.
- **Player** – Accesses shared match analyses via a WhatsApp link (public `/analysis/:shareToken` page) with a name-capture modal, then has a private individual coaching conversation.

## Architecture
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, shadcn/ui, wouter for routing
- **Backend**: Express.js with streaming SSE for AI chat
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: None — app is open access, no login required
- **Privacy**: `userToken` UUID stored in localStorage; passed via `x-user-token` header on all requests
- **AI**: OpenAI via Replit AI Integrations (gpt-4o-mini for text, gpt-4o for vision/image analysis)
- **RAG System**: Mode-based context retrieval (pre-match, post-match, player)
- **File Storage**: Replit App Storage (Object Storage) for image uploads via presigned URLs

## Key Files
- `shared/schema.ts` — All data models; `AppMode = "pre-match" | "post-match" | "player"`
- `server/routes.ts` — API endpoints including streaming chat, image extraction, team management
- `server/rag.ts` — RAG orchestration + system prompts per mode + AI image extraction
- `server/storage.ts` — Database CRUD for all tables
- `server/seed.ts` — Cricket data seeding (matches, players, deliveries)
- `server/db.ts` — Database connection
- `client/src/App.tsx` — Main app with wouter routing
- `client/src/components/app-sidebar.tsx` — Navigation: My Teams | Pre-Match | Post-Match
- `client/src/components/cricket-chat.tsx` — Reusable streaming chat component (shared by pre/post match pages)
- `client/src/lib/queryClient.ts` — TanStack Query client + userToken management
- `client/src/pages/teams.tsx` — Team list + create
- `client/src/pages/team-detail.tsx` — Squad (manual add + image import) + Schedule (manual + image import) tabs
- `client/src/pages/pre-match.tsx` — Fixture selector, squad panel, pre-match chat
- `client/src/pages/post-match.tsx` — Fixture selector, plan panel, post-match chat + WhatsApp share
- `client/src/pages/player-analysis.tsx` — Public page at /analysis/:shareToken, name modal, player chat

## Database Tables
- `matches` — Reference match scorecards (seeded)
- `deliveries` — Ball-by-ball data (seeded)
- `players` — Player profiles with strengths/weaknesses (seeded)
- `player_images` — Player technique images
- `conversations` — Chat conversations (has `user_token` column for privacy)
- `messages` — Chat messages (with optional `imageUrl` for primary image and `imageUrls text[]` for all multi-image uploads)
- `teams` — Captain's teams (owned by `captain_token`)
- `squad_members` — Players in each team
- `season_schedules` — Season containers for fixture lists
- `scheduled_matches` — Individual fixtures (status: upcoming/planned/completed)
- `match_plans` — Pre-match plan linked to a fixture and conversation
- `match_analyses` — Post-match analysis with `share_token` for WhatsApp sharing
- `player_sessions` — Private player coaching sessions per analysis + player + userToken

## API Routes

### Conversations & Chat
- `GET /api/conversations` — List conversations (filtered by x-user-token header)
- `GET /api/conversations/:id` — Get conversation with messages
- `POST /api/conversations` — Create conversation
- `DELETE /api/conversations/:id` — Delete conversation
- `POST /api/chat/:conversationId/messages` — Send message (SSE streaming response)

### Image Extraction (AI)
- `POST /api/extract` — Extract structured data from image: `{ imageUrl, extractionType: "squad"|"schedule"|"scorecard", context?: string }` → JSON array/object

### Teams & Squad
- `GET /api/teams` — List teams for captainToken
- `GET /api/teams/:id` — Get team
- `POST /api/teams` — Create team
- `PATCH /api/teams/:id` — Update team
- `DELETE /api/teams/:id` — Delete team
- `GET /api/teams/:teamId/squad` — List squad members
- `POST /api/teams/:teamId/squad` — Add squad member
- `POST /api/teams/:teamId/squad/bulk` — Bulk add squad members (from AI extraction)
- `PATCH /api/squad/:id` — Update squad member
- `DELETE /api/squad/:id` — Delete squad member

### Schedules & Fixtures
- `GET /api/teams/:teamId/schedules` — List season schedules
- `POST /api/teams/:teamId/schedules` — Create season schedule
- `GET /api/teams/:teamId/fixtures` — List all fixtures for team
- `POST /api/schedules/:scheduleId/fixtures` — Add fixture
- `POST /api/schedules/:scheduleId/fixtures/bulk` — Bulk add fixtures (from AI extraction)
- `PATCH /api/fixtures/:id` — Update fixture status/result

### Match Plans & Analyses
- `GET /api/fixtures/:fixtureId/plan` — Get pre-match plan
- `POST /api/fixtures/:fixtureId/plan` — Save/update pre-match plan (also sets status→planned)
- `GET /api/fixtures/:fixtureId/analysis` — Get post-match analysis
- `POST /api/fixtures/:fixtureId/analysis` — Save/update analysis + generate shareToken (status→completed)

### Public & Player
- `GET /api/analysis/:shareToken` — Public analysis data (no auth required)
- `POST /api/player-sessions` — Get or create player session (uses `x-user-token` header, not body)
- `PATCH /api/player-sessions/:id` — Update session (link conversation)

### Object Storage
- `POST /api/uploads/request-url` — Get presigned URL for image upload
- `GET /objects/*` — Serve uploaded files from object storage

## RAG Orchestration
The RAG layer (`server/rag.ts`) queries different data based on the active mode:
- **Pre-match mode**: Retrieves squad context (from request), reference match data, player profiles
- **Post-match mode**: Retrieves pre-match plan (from request) + reference match data for comparison
- **Player mode**: Retrieves player profiles, delivery data, match context (from request)

## AI Image Extraction
When a captain uploads a team sheet or schedule image:
1. Image is uploaded to Object Storage via presigned URL
2. `POST /api/extract` is called with `imageUrl` and `extractionType`
3. GPT-4o vision model reads the image and returns structured JSON
4. Structured data is bulk-created in the DB

## Multi-Turn Conversation System
- `<<FOLLOWUP>>...<<END_FOLLOWUP>>` tags for follow-up questions (exchanges 1-2)
- `<<CITATION>>...<<END_CITATION>>` tags for match reference cards (pre/post-match)
- Server-side enforcement in `server/rag.ts` ensures consistent tag presence

## WhatsApp Sharing
- Captain clicks "Share" in post-match → generates `shareToken` (UUID), saves to `match_analyses`
- Share link: `{origin}/analysis/{shareToken}`
- WhatsApp deep link: `https://wa.me/?text=Match analysis ready for review: {shareLink}`
- Players access public page → name modal → private coaching conversation

## Privacy Model
- `userToken` = UUID stored in `localStorage` as `cricketiq_user_token`
- Sent as `x-user-token` HTTP header on all API calls
- Conversations are scoped to `userToken`
- `captainToken` = same `userToken` (captain identifies themselves by their token)
- Player sessions: scoped by `analysisId + playerName + userToken`
- Player analysis pages are public (no token required to view/chat)

## Routing (wouter)
- `/` → redirects to `/teams`
- `/teams` → My Teams page
- `/teams/:id` → Team Detail (Squad + Schedule tabs)
- `/pre-match` → Pre-Match Planning
- `/post-match` → Post-Match Analysis + WhatsApp share
- `/analysis/:shareToken` → Public Player Analysis page (standalone, no sidebar)
