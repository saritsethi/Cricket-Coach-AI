# CricketIQ - AI Cricket Intelligence Platform

## Overview
CricketIQ is an AI-powered cricket intelligence platform with three distinct modes:
1. **Captain's Strategy** - Tactical field placements, bowling changes, and match-winning strategies with real match citations
2. **Player's Skill Building** - Technique analysis, drills, performance improvement, and image-based technique feedback
3. **Equipment Review** - Expert reviews, comparisons, recommendations with pro player references and YouTube review links

## Architecture
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with streaming SSE for AI chat
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5-mini for text, gpt-4o for vision/image analysis)
- **RAG System**: Mode-based context retrieval from cricket database
- **File Storage**: Replit App Storage (Object Storage) for image uploads via presigned URLs

## Key Files
- `shared/schema.ts` - All data models (matches, deliveries, players, equipment, conversations, messages with imageUrl)
- `server/routes.ts` - API endpoints including streaming chat with vision model support
- `server/rag.ts` - RAG orchestration layer with mode-based context retrieval, citation/reference enforcement
- `server/storage.ts` - Database CRUD operations
- `server/seed.ts` - Cricket data seeding
- `server/db.ts` - Database connection
- `server/replit_integrations/object_storage/` - File upload via presigned URLs
- `client/src/App.tsx` - Main app with sidebar layout
- `client/src/pages/chat.tsx` - Chat interface with streaming and image upload support
- `client/src/components/chat-input.tsx` - Chat input with image attachment (paperclip button)
- `client/src/components/chat-message.tsx` - Message rendering with image display, citations, references, follow-ups

## Database Tables
- `matches` - Match scorecards (title, teams, venue, scores, result)
- `deliveries` - Ball-by-ball data (batter, bowler, runs, wickets, shot type, field positions)
- `players` - Player profiles (stats, strengths, weaknesses, styles)
- `equipment` - Cricket gear (reviews, ratings, specs)
- `conversations` - Chat conversations with mode
- `messages` - Chat messages (with optional imageUrl for attached images)

## API Routes
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `POST /api/conversations` - Create conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/chat/:conversationId/messages` - Send message with optional imageUrl (SSE streaming response)
- `POST /api/uploads/request-url` - Get presigned URL for image upload
- `GET /objects/*` - Serve uploaded files from object storage
- `GET /api/matches` - List matches
- `GET /api/players` - List players
- `GET /api/equipment` - List equipment

## RAG Orchestration
The RAG layer (`server/rag.ts`) queries different database sections based on the active mode:
- **Captain mode**: Retrieves match data, ball-by-ball analysis, bowling figures, field positions
- **Skills mode**: Retrieves player technique profiles, player images, delivery data filtered by shot/delivery types
- **Equipment mode**: Retrieves equipment reviews, specs, comparisons, and player profiles for equipment context

RAG context uses full conversation history (all user messages) for keyword extraction, so each follow-up response pulls progressively more relevant data.

## Multi-Turn Conversation System
The AI provides useful advice in every response and asks follow-up questions for the first 2-3 exchanges to gather more context, then gives a final comprehensive answer:
- System prompts instruct AI to use `<<FOLLOWUP>>...<<END_FOLLOWUP>>` tags for follow-up questions
- Server-side enforcement (`enforceFollowUp()` in `server/rag.ts`) guarantees tags are present for exchanges 1-2 and stripped for exchange 3+, with mode-specific fallback questions
- `ChatMessage` component (`client/src/components/chat-message.tsx`) parses tags and renders follow-up questions in a visually distinct section with HelpCircle icon and primary-colored text
- Exchange count is tracked per conversation based on the number of user messages
- Client optimistically adds the final streamed content to the query cache before clearing streaming state, ensuring seamless follow-up rendering

## Image Upload & Vision Analysis
- Users attach images via a paperclip button in the chat input (accepts JPEG, PNG, GIF, WebP up to 10MB)
- Files upload to Replit App Storage via presigned URL flow (POST metadata to /api/uploads/request-url, then PUT file to presigned URL)
- When images are present in a conversation, the backend switches from gpt-5-mini to gpt-4o (vision model)
- Images are sent as multi-part content (text + image_url) to the OpenAI API
- System prompt adds detailed technique analysis instructions when images are detected
- ChatMessage renders user-attached images inline above message text

## Match Citations (Captain Mode)
- System prompt instructs AI to include `<<CITATION>>...<<END_CITATION>>` tags when referencing match data
- Server-side enforcement (`enforceCitations()`) injects fallback citations from RAG context if the AI omits them
- ChatMessage parses citation tags and renders them as styled cards with match name, teams, and result details
- Citations appear in a "Match References" section with BookOpen icon

## Equipment References (Equipment Mode)
- System prompt instructs AI to reference pro player equipment choices and include YouTube review links
- Equipment RAG now also retrieves player profiles for equipment context (what pros use)
- System prompt instructs AI to include `<<REFERENCE>>...<<END_REFERENCE>>` tags with markdown links
- Server-side enforcement (`enforceReferences()`) injects fallback YouTube search links from RAG equipment data if the AI omits them
- ChatMessage parses reference tags and renders clickable links with YouTube (Play icon) or article (ExternalLink icon) styling
