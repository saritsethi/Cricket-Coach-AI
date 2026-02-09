# CricketIQ - AI Cricket Intelligence Platform

## Overview
CricketIQ is an AI-powered cricket intelligence platform with three distinct modes:
1. **Captain's Strategy** - Tactical field placements, bowling changes, and match-winning strategies
2. **Player's Skill Building** - Technique analysis, drills, and performance improvement
3. **Equipment Review** - Expert reviews, comparisons, and recommendations for cricket gear

## Architecture
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with streaming SSE for AI chat
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5-mini for chat)
- **RAG System**: Mode-based context retrieval from cricket database

## Key Files
- `shared/schema.ts` - All data models (matches, deliveries, players, equipment, conversations, messages)
- `server/routes.ts` - API endpoints including streaming chat
- `server/rag.ts` - RAG orchestration layer with mode-based context retrieval
- `server/storage.ts` - Database CRUD operations
- `server/seed.ts` - Cricket data seeding
- `server/db.ts` - Database connection
- `client/src/App.tsx` - Main app with sidebar layout
- `client/src/pages/chat.tsx` - Chat interface with streaming
- `client/src/components/` - UI components (mode selector, chat, prompts, sidebar)

## Database Tables
- `matches` - Match scorecards (title, teams, venue, scores, result)
- `deliveries` - Ball-by-ball data (batter, bowler, runs, wickets, shot type, field positions)
- `players` - Player profiles (stats, strengths, weaknesses, styles)
- `equipment` - Cricket gear (reviews, ratings, specs)
- `conversations` - Chat conversations with mode
- `messages` - Chat messages

## API Routes
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `POST /api/conversations` - Create conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/chat/:conversationId/messages` - Send message (SSE streaming response)
- `GET /api/matches` - List matches
- `GET /api/players` - List players
- `GET /api/equipment` - List equipment

## RAG Orchestration
The RAG layer (`server/rag.ts`) queries different database sections based on the active mode:
- **Captain mode**: Retrieves match data, ball-by-ball analysis, bowling figures, field positions
- **Skills mode**: Retrieves player technique profiles, player images, delivery data filtered by shot/delivery types
- **Equipment mode**: Retrieves equipment reviews, specs, and comparisons

RAG context uses full conversation history (all user messages) for keyword extraction, so each follow-up response pulls progressively more relevant data.

## Multi-Turn Conversation System
The AI provides useful advice in every response and asks follow-up questions for the first 2-3 exchanges to gather more context, then gives a final comprehensive answer:
- System prompts instruct AI to use `<<FOLLOWUP>>...<<END_FOLLOWUP>>` tags for follow-up questions
- Server-side enforcement (`enforceFollowUp()` in `server/rag.ts`) guarantees tags are present for exchanges 1-2 and stripped for exchange 3+, with mode-specific fallback questions
- `ChatMessage` component (`client/src/components/chat-message.tsx`) parses tags and renders follow-up questions in a visually distinct section with HelpCircle icon and primary-colored text
- Exchange count is tracked per conversation based on the number of user messages
- Client optimistically adds the final streamed content to the query cache before clearing streaming state, ensuring seamless follow-up rendering
