# CricketIQ - AI Cricket Intelligence Platform

## Overview
CricketIQ is an AI-powered cricket intelligence platform with three distinct modes:
1. **Captain's Strategy** - Tactical field placements, bowling changes, and match-winning strategies with real match citations
2. **Player's Skill Building** - Technique analysis, drills, performance improvement, and image-based technique feedback
3. **Equipment Review** - Expert reviews, comparisons, recommendations with pro player references and YouTube review links

## Architecture
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with streaming SSE for AI chat, no authentication required
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: None — app is open access, no login required
- **AI**: OpenAI via Replit AI Integrations (gpt-5-mini for text, gpt-4o for vision/image analysis)
- **RAG System**: Mode-based context retrieval from cricket database with scorecard URLs
- **File Storage**: Replit App Storage (Object Storage) for image uploads via presigned URLs

## Key Files
- `shared/schema.ts` - All data models, prompt pools with `getRandomPrompts()` for dynamic selection
- `server/routes.ts` - API endpoints including streaming chat with vision model and multi-image support
- `server/rag.ts` - RAG orchestration layer with mode-based context retrieval, citation/reference enforcement, output format rules
- `server/storage.ts` - Database CRUD operations
- `server/seed.ts` - Cricket data seeding
- `server/db.ts` - Database connection
- `server/replit_integrations/object_storage/` - File upload via presigned URLs
- `client/src/App.tsx` - Main app with auth gate and sidebar layout
- `client/src/pages/auth.tsx` - Registration and login page
- `client/src/pages/chat.tsx` - Chat interface with streaming, image upload, and context injection
- `client/src/components/chat-input.tsx` - Chat input with multi-image attachment (captain mode supports multiple scorecards)
- `client/src/components/chat-message.tsx` - Message rendering with image display, citations, references, follow-ups
- `client/src/components/context-panel.tsx` - Captain context (squad/opponent) and Skills profile (batting/bowling style, handedness) panels
- `client/src/components/prompt-suggestions.tsx` - Dynamic randomized prompt suggestions with refresh button

## Database Tables
- `matches` - Match scorecards (title, teams, venue, scores, result)
- `deliveries` - Ball-by-ball data (batter, bowler, runs, wickets, shot type, field positions)
- `players` - Player profiles (stats, strengths, weaknesses, styles)
- `equipment` - Cricket gear (reviews, ratings, specs)
- `conversations` - Chat conversations with mode
- `messages` - Chat messages (with optional imageUrl for attached images)

## API Routes
- `POST /api/auth/register` - Register with name + email, returns session cookie
- `POST /api/auth/login` - Login with email, returns session cookie
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/me` - Get current authenticated user
- `GET /api/conversations` - List conversations (filtered by authenticated user)
- `GET /api/conversations/:id` - Get conversation with messages (auth required, user-scoped)
- `POST /api/conversations` - Create conversation (auto-tagged to user)
- `DELETE /api/conversations/:id` - Delete conversation (auth required, user-scoped)
- `POST /api/chat/:conversationId/messages` - Send message with optional imageUrl/imageUrls (SSE streaming response, auth required)
- `POST /api/uploads/request-url` - Get presigned URL for image upload
- `GET /objects/*` - Serve uploaded files from object storage
- `GET /api/matches` - List matches
- `GET /api/players` - List players
- `GET /api/equipment` - List equipment

## RAG Orchestration
The RAG layer (`server/rag.ts`) queries different database sections based on the active mode:
- **Captain mode**: Retrieves match data, ball-by-ball analysis, bowling figures, field positions (fallback: returns all matches if keyword search fails)
- **Skills mode**: Retrieves player technique profiles, player images, delivery data filtered by shot/delivery types
- **Equipment mode**: Retrieves equipment reviews, specs, comparisons, and player profiles (fallback: returns all equipment if keyword search fails)

RAG context uses full conversation history (all user messages) for keyword extraction, so each follow-up response pulls progressively more relevant data.

## Dynamic Starter Prompts
- 12+ prompts per mode defined in `shared/schema.ts` (ALL_PROMPTS)
- `getRandomPrompts(mode, count)` shuffles and returns a subset each time
- PromptSuggestions component uses `useMemo` with a `refreshKey` state for re-randomization
- "Show different suggestions" button lets users refresh without page reload

## Context Panels (localStorage-backed)
- **Captain Context**: Squad details, opponent info, match format - stored in localStorage under `cricketiq_captain_context`
- **Skills Profile**: Handedness, role, batting style, bowling style, level - stored under `cricketiq_skills_profile`
- Context is automatically prepended to user messages as `[CAPTAIN CONTEXT]` or `[PLAYER PROFILE]` tags
- System prompts instruct AI to use this context for personalization without re-asking

## Multi-Scorecard Upload (Captain Mode)
- Captain mode allows multiple image uploads (file input has `multiple` attribute)
- All images uploaded via presigned URL flow in parallel
- Multiple `imageUrls` sent to server, which includes all as `image_url` content parts for the vision model
- System prompt includes scorecard analysis instructions for pattern identification across matches

## Output Format Rules
- All modes use short, actionable output format: "What's Working / What Needs Improvement / Next Steps"
- Users can ask for "more detail" to get longer responses
- Skills mode ALWAYS includes at least 2 specific drills with names, descriptions, and sets/reps

## Multi-Turn Conversation System
The AI provides useful advice in every response and asks follow-up questions for the first 2-3 exchanges to gather more context, then gives a final comprehensive answer:
- System prompts instruct AI to use `<<FOLLOWUP>>...<<END_FOLLOWUP>>` tags for follow-up questions
- Server-side enforcement (`enforceFollowUp()` in `server/rag.ts`) guarantees tags are present for exchanges 1-2 and stripped for exchange 3+, with mode-specific fallback questions
- `ChatMessage` component (`client/src/components/chat-message.tsx`) parses tags and renders follow-up questions in a visually distinct section with HelpCircle icon and primary-colored text

## Image Upload & Vision Analysis
- Users attach images via a paperclip button (single in skills/equipment, multiple scorecards in captain mode)
- Accepts JPEG, PNG, GIF, WebP up to 10MB each
- Files upload to Replit App Storage via presigned URL flow
- When images are present, backend switches from gpt-5-mini to gpt-4o (vision model)
- Images sent as multi-part content (text + image_url) to the OpenAI API

## Match Citations (Captain Mode)
- Server-side enforcement (`enforceCitations()`) injects fallback citations from RAG context if AI omits them
- ChatMessage parses `<<CITATION>>...<<END_CITATION>>` tags and renders styled cards

## Equipment References (Equipment Mode)
- Server-side enforcement (`enforceReferences()`) injects fallback YouTube search links if AI omits them
- ChatMessage parses `<<REFERENCE>>...<<END_REFERENCE>>` tags and renders clickable links
