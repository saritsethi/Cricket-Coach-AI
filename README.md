CricketIQ — AI Cricket Intelligence Platform
CricketIQ is an AI-powered cricket coaching assistant with three specialist modes, giving players, captains, and enthusiasts expert-level guidance on demand.

Features
🏏 Captain's Strategy
Tactical advice for match situations — field placements, bowling changes, powerplay decisions, and run-chase planning. Responses are grounded in real match data with ESPNcricinfo scorecard citations.

🎯 Player's Skill Building
Technique analysis and personalized coaching for batters and bowlers. Upload images of your stance or action for visual feedback. Every response includes specific named drills with sets and reps.

🛒 Equipment Review
Expert bat, ball, and gear recommendations with pro player references and curated YouTube review links to help you make informed buying decisions.

Tech Stack
Frontend: React + TypeScript + Vite, Tailwind CSS, shadcn/ui
Backend: Express.js with Server-Sent Events (SSE) for real-time streaming AI responses
Database: PostgreSQL with Drizzle ORM — stores matches, players, equipment, and conversation history
AI: OpenAI GPT (text) and GPT-4o (vision/image analysis) via API
RAG System: Mode-aware retrieval from a cricket knowledge base to ground AI responses in real data
File Storage: Cloud object storage for image uploads
How It Works
Select your mode from the sidebar — Captain, Skills, or Equipment
Ask a question or describe your situation
For image feedback, attach a photo using the paperclip icon
The AI retrieves relevant match data, player profiles, or gear reviews before responding
Follow-up questions refine the advice over a multi-turn conversation
Getting Started
npm install
npm run db:push
npm run dev
The app can be accessed at https://cricket-coach-ai.replit.app/

Feel free to swap in your own screenshots or add a demo link at the top.
