# Amphibian Academy - Hackathon Product Spec

## 1) Product Goal
Build a polished, playful educational web experience where players complete math mini-games to earn flies and unlock frog cosmetics.

## 2) Core Experience
1. Player lands on home page and selects a subject.
2. Player plays mini-games (starting with math).
3. Correct answers earn flies (currency).
4. Perfect completion grants bonus flies and unlockable items.
5. Player equips unlocked cosmetics on a 2D frog avatar.

## 3) Scope and Priorities

### P0 - Must Have (Hackathon MVP)
- Strong front page with branding (title/logo, subject buttons, about/info).
- One complete and polished math game: **Make 10** drag-and-drop.
- Functional frog customization screen with drag-and-drop equip.
- Fly currency, score feedback, and reward animation.
- Progress persistence using `localStorage`.
- End-to-end playable flow:
  - Home -> Game -> Results/Rewards -> Frog Customization.

### P1 - Should Have
- 1 to 2 total math mini-games.
- Difficulty levels (easy/medium/hard).
- Subject/game hub page with visual game cards.
- 100% completion cosmetic per each game.

### P2 - Stretch Goals
- AI battle mode (timed competitive math + health system).
- Five full games (one per target module/subject area).
- Online multiplayer battle mode.

## 4) Game Specifications

### Game 1: Make 10 (MVP)
- Prompt format: `__ + __ = 10`.
- Player drags blocks of certain size (block: 2) onto another block to get the answer the blocks combine to get the size of the new block and hpefully the answer.
- Immediate feedback after blocks combine.
- Session length: 10 rounds.
- Scoring:
  - +1 per correct round.
  - Flies reward per correct round.
- Perfect session (10/10):
  - 2x flies for that session.
  - Cosmetic unlock after 5 perfect rounds.

### Reward Rules (Initial Values)
- Base flies: `5` per correct answer.
- Perfect bonus: `+50` flies.
- First-time perfect on a game: unlock one cosmetic item.

### Frog Customization
- Avatar: 2D frog sprite.
- Equipment slots: hat, glasses, shirt, accessory.
- Closet/inventory panel shows unlocked items.
- Drag item onto slot frog avatar to equip drag item off to unequip.
- Equipped and unlocked states persist in `localStorage`.

## 5) UX and Visual Direction
- Theme: pond/frogs/flies, playful but clean.
- Prioritize high visual polish and clear feedback.
- Requirements:
  - Responsive layout for mobile + desktop.
  - Distinct visual hierarchy and strong typography.
  - Motion feedback (tile drop, success burst, reward count-up).
  - Accessibility baseline (focus states, contrast, readable sizing).

## 6) Information Architecture
- `/` Home page
  - Title/logo
  - Subject buttons (Math first)
  - Quick-access games section (optional for MVP)
  - Info/About section
- `/math` Subject page (or section)
  - Game cards
  - Progress indicators
- `/game/make-10`
  - Round gameplay
  - Timer (optional for initial MVP)
  - Score + flies
- `/frog`
  - Avatar + inventory + equip interactions

## 7) Data Model (Simple)
Persist in `localStorage` under one key, e.g. `amphibianAcademyState`:
- `flies: number`
- `unlockedItems: string[]`
- `equipped: { hat, glasses, shirt, accessory }`
- `gameProgress: { [gameId]: { bestScore, perfectCompleted } }`
- `settings: { difficulty }`

## 8) Engineering Plan

### Milestone 1 - Foundation
- Build shared layout, theme tokens, and reusable button/card styles.
- Add basic routing strategy (single-page sections or multi-page HTML).

### Milestone 2 - Core Gameplay
- Implement Make 10 drag/drop/combine logic and scoring.
- Add round loop (10 rounds) and result summary.

### Milestone 3 - Rewards + Avatar
- Connect score to flies.
- Implement unlock logic.
- Implement frog equip UI + persistence.

### Milestone 4 - Polish + Demo
- Add transitions, audio cues (optional), and onboarding hints.
- Cross-device QA and bug fixes.
- Final demo flow rehearsal.

## 9) Team Task Split (Suggested)
1. UI/UX Lead
- Visual system, home page, cards, animations, responsive tuning.

2. Gameplay Lead
- Make 10 mechanics, round generation, scoring, difficulty tuning.

3. Systems/Integration Lead
- State management, reward logic, inventory/equipment, persistence, QA.

## 10) Definition of Done (MVP)
- A new user can finish one full game session and receive flies.
- Perfect score unlocks at least one item.
- User can equip unlocked item on frog.
- Refreshing the page preserves flies, unlocks, and equipped gear.
- UI is stable and readable on mobile and desktop.

## 11) Hackathon Demo Script (60-90 seconds)
1. Show branded home page and select Math.
2. Complete Make 10 rounds with a perfect score.
3. Show flies reward and item unlock.
4. Open frog screen and equip unlocked item.
5. Refresh page to prove persistence.

## 12) Progress Tracker

### Backlog
- Finalize logo and art assets.
- Add game card thumbnails.

### In Progress
- Build Make 10 game loop.
- Build frog customization interactions.

### QA Queue
- Mobile layout pass.
- Reward/unlock edge-case testing.
- Persistence regression test.

### Done
- (Fill as completed)
