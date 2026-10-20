# AGENTS.md - React Vite + TS + Tailwind

@awesome-design.md
@impeccable.md

## Project Stack
- Vite + React + TypeScript
- Tailwind CSS v4
- Path alias: @/ -> ./src/
- No Next.js, no server components

## CRITICAL UI RULES

### 1. Design System
- ALWAYS follow rules from awesome-design.md and impeccable.md
- No generic AI design (no purple gradient on white, no all-rounded cards)
- Use 8px spacing, lots of whitespace, modern minimal

### 2. React Bits is MANDATORY for animations
When user asks for ANY of these: hero, text effect, background, button hover, card effect, loading, particles:
- FIRST call react-bits MCP to list/fetch component
- NEVER write custom @keyframes or framer-motion from scratch if react-bits exists
- Install via jsrepo (Vite compatible):