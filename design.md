````markdown
# Beer Scramble
## Product & Technical Design Specification (MVP)

**Version:** 1.0
**Status:** MVP Design
**Target Platform:** Mobile-first Web Application
**Primary Users:** Golf tournament participants
**Deployment:** Vercel + Supabase

---

# 1. Overview

Beer Scramble is a real-time tournament management application built specifically for golf outings that combine competitive scramble golf with drinking rules.

The application allows multiple teams to:

- Record hole scores
- Track beers consumed
- Track birdie juice penalties
- View a live leaderboard
- View player drinking statistics
- Run a pre-round snake draft
- Persist tournament history

The application is designed primarily for iPhone users on a golf course, where interactions should require as few taps as possible.

---

# 2. Design Goals

## Primary Goals

- Extremely simple mobile UX
- Real-time synchronization across all devices
- Fast data entry
- Persistent tournament history
- Clean, modern UI
- Easy to extend with future tournament formats

---

# 3. Tournament Rules

## Scramble Format

- Teams play a standard 4-man scramble.
- Each team records one score per hole.

---

## Beer Bonus

Each standard beer consumed by any team member counts as:

```
-1 stroke
```

towards the team's final score.

Example

Gross Score

```
68
```

Beer Count

```
18
```

Net Score

```
50
```

---

## Birdie Rule

Whenever a team makes a birdie:

Birdie Debt += 1

Each Birdie Debt must be paid by drinking one Birdie Juice.

Birdie Juices are logged separately from regular beers.

---

## Disqualification Rule

If

```
Birdie Debt > 0
```

when the tournament is completed

the team is marked

```
DQ
```

and removed from competition.

---

# 4. Functional Requirements

## Tournament Management

Organizer can

- Create tournament
- Edit tournament
- Complete tournament
- Archive tournament

Tournament contains

- Name
- Date
- Course
- Tee Set
- Status

Status

- Draft
- Live
- Complete

---

## Course Management

Organizer can

- Select existing course
- Create custom course

Each course contains one or more tee sets.

---

## Tee Set

Contains

- Name
- Rating
- Slope
- Total Par

---

## Hole

Each hole stores

- Hole Number
- Par
- Yardage
- Handicap

Example

| Hole | Par | Yardage | Handicap |
|-------|------|----------|-----------|
| 1 | 4 | 392 | 11 |
| 2 | 5 | 527 | 3 |

---

## Player Management

Players contain

- Name
- Golf Handicap
- Beer Handicap
- Photo (optional)

Beer Handicap exists solely to aid the draft.

It has no effect on scoring.

---

## Team Management

Each team contains

- Name
- Captain
- Players

Maximum players

```
4
```

---

## Draft

Supports snake draft.

Organizer selects

- Number of teams
- Team captains

Draft proceeds

```
Round 1

A
B
C
D

Round 2

D
C
B
A
```

Players cannot be drafted twice.

Draft order is persisted.

---

# 5. Tournament Flow

```
Create Tournament

↓

Select Course

↓

Add Players

↓

Draft Teams

↓

Start Tournament

↓

Live Scoring

↓

Tournament Complete

↓

Statistics
```

---

# 6. Live Tournament

This is the primary application screen.

Each team always has a current hole.

The application automatically advances to the next hole after score submission.

Users should never need to manually choose a hole during normal play.

---

## Team Screen

Displays

Current Hole

Example

```
Hole 7

Par 5

548 yards

Handicap 2
```

Current Team Stats

- Gross Score
- Beer Bonus
- Birdie Debt
- Net Score

Large action buttons

- Record Score
- Log Beer
- Log Birdie Juice

---

## Record Score

User selects

```
2

3

4

5

6

7
```

Application automatically

- Saves score
- Determines birdie
- Advances current hole

Birdie logic

```
Score < Hole Par
```

---

## Beer Logging

One tap

```
+ Beer
```

Choose player

Done

Creates Beer Event

---

## Birdie Juice Logging

One tap

```
+ Birdie Juice
```

Choose player

Done

Creates Birdie Juice Event

---

# 7. Leaderboard

Real-time updates.

Columns

| Team | Hole | Gross | Beer Bonus | Birdies | Birdie Juice | Debt | Net |
|------|------|------|------|------|------|------|------|

If tournament completed

Status column becomes

- Active
- DQ

Sorting

Active teams

↓

Lowest Net Score

↓

DQ teams

---

# 8. Player Statistics

Beer Leaderboard

| Player | Beers |

Birdie Juice Leaderboard

| Player | Birdie Juice |

Combined Drinking Leaderboard

| Player | Total Drinks |

---

# 9. Tournament Summary

Displays final standings.

| Rank | Team | Gross | Beer Bonus | Birdies | Birdie Juice | Net | Status |

No "Longest Drinking Streak"

---

# 10. Data Model

## Course

```
id UUID

name

location

created_at
```

---

## TeeSet

```
id UUID

course_id

name

course_rating

slope_rating

par
```

---

## Hole

```
id UUID

tee_set_id

number

par

yardage

handicap
```

---

## Tournament

```
id UUID

join_code

name

date

course_id

tee_set_id

status

created_at
```

---

## Player

```
id UUID

name

golf_handicap

beer_handicap

photo_url
```

---

## Team

```
id UUID

tournament_id

name

captain_player_id
```

---

## TeamPlayer

```
team_id

player_id

draft_position
```

---

## HoleScore

```
id UUID

team_id

hole_id

strokes

created_at
```

Exactly one record per team per hole.

---

## BeerEvent

```
id UUID

team_id

player_id

hole_id

type

created_at
```

Type

```
NORMAL

BIRDIE_JUICE
```

---

# 11. Derived Calculations

No aggregate statistics should be persisted.

Everything is calculated from HoleScore and BeerEvent.

---

## Gross Score

```
SUM(strokes)
```

---

## Beer Bonus

```
COUNT(
BeerEvent
WHERE type = NORMAL
)
```

---

## Birdies

```
COUNT(
HoleScore.strokes < Hole.par
)
```

---

## Birdie Juice Consumed

```
COUNT(
BeerEvent.type = BIRDIE_JUICE
)
```

---

## Birdie Debt

```
Birdies
-
Birdie Juice Consumed
```

---

## Net Score

```
Gross Score
-
Beer Bonus
```

---

## Tournament Status

If

```
Birdie Debt > 0
```

Tournament Complete

↓

Team Status

```
DQ
```

---

# 12. Technology Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

---

## Backend

Supabase

- PostgreSQL
- Auth
- Storage
- Realtime
- Row Level Security

---

## Hosting

Frontend

Vercel

Backend

Supabase Cloud

---

# 13. Project Structure

```
beer-scramble/

app/
    (marketing)/
    tournament/
    leaderboard/
    draft/
    stats/

components/
    ui/
    leaderboard/
    scoring/
    draft/
    stats/

lib/
    scoring.ts
    leaderboard.ts
    birdieJuice.ts
    draft.ts
    courses.ts
    supabase.ts
    utils.ts

hooks/

services/

types/

supabase/
    migrations/

public/

README.md

SPEC.md

ARCHITECTURE.md

TODO.md
```

---

# 14. Business Logic Layer

Business logic should **not** live inside React components.

All calculations belong inside `/lib`.

Examples

```
calculateGrossScore()

calculateNetScore()

calculateBirdieDebt()

calculateLeaderboard()

generateSnakeDraft()

advanceCurrentHole()
```

React components should only render data and call business logic functions.

---

# 15. API Design

Although Supabase can be queried directly, the application should expose a clean service layer.

Examples

```
createTournament()

updateTournament()

getTournament()

createPlayer()

createTeam()

submitHoleScore()

logBeer()

logBirdieJuice()

calculateLeaderboard()

completeTournament()
```

---

# 16. UI Principles

Mobile-first.

Designed for one-handed use.

Large tap targets.

Minimal typing.

Large score buttons.

Bottom navigation.

Realtime updates.

No page refreshes.

Animations should be subtle.

Think

- PGA Tour
- ESPN
- Sleeper Fantasy

rather than an admin dashboard.

---

# 17. Realtime Requirements

The following should update automatically without refreshing:

- Leaderboard
- Team scores
- Beer counts
- Birdie debt
- Player statistics
- Tournament status

Use Supabase Realtime subscriptions.

---

# 18. Security

Authentication

- Anonymous guest participation for MVP
- Organizer authentication via Supabase Auth

Authorization

Organizer

- Create/edit tournament
- Manage players
- Run draft
- Complete tournament

Participants

- View tournament
- Submit scores
- Log beers
- Log birdie juice

Future versions may introduce finer-grained permissions (e.g., only a team's players can edit that team's data).

---

# 19. Future Enhancements (Post-MVP)

## Tournament Features

- Multiple rounds
- Skins
- Match play
- Ryder Cup
- Handicap-adjusted scoring
- Stableford
- Closest to the pin
- Long drive

---

## Statistics

- Lifetime player stats
- Beer averages
- Course history
- Team win percentages

---

## Social Features

- Team photos
- Comments
- Live activity feed
- Push notifications
- QR code tournament join
- AI-generated tournament recap

---

## Administration

- Reusable course library
- Import public golf courses
- Duplicate previous tournaments
- Tournament templates

---

# 20. MVP Milestones

## Milestone 1 — Foundation

- Initialize Next.js project
- Configure Tailwind
- Configure shadcn/ui
- Configure Supabase
- Create initial database schema
- Configure routing

Deliverable:

Project builds and connects to Supabase.

---

## Milestone 2 — Tournament Setup

- Create tournament
- Create/edit course
- Create tee set
- Create holes
- Add players
- Create teams

Deliverable:

A complete tournament can be configured.

---

## Milestone 3 — Live Tournament (Core MVP)

- Record hole scores
- Log beers
- Log birdie juice
- Auto-advance holes
- Live leaderboard
- Birdie debt tracking

Deliverable:

A tournament can be played entirely within the application.

---

## Milestone 4 — Snake Draft

- Select captains
- Snake draft interface
- Persist draft order

Deliverable:

Teams can be drafted inside the application.

---

## Milestone 5 — Statistics & Completion

- Complete tournament
- Final standings
- Player leaderboards
- Team statistics
- Tournament history

Deliverable:

Tournament lifecycle is fully supported from setup through completion.

---

# 21. Success Criteria

The MVP is considered complete when:

- A tournament can be created from scratch.
- A custom course with holes can be configured.
- Players can be added with golf and beer handicaps.
- Teams can be drafted using a snake draft.
- Teams can record scores hole-by-hole.
- Teams can log beers and birdie juices.
- Birdie debt is automatically tracked.
- A real-time leaderboard updates across all connected devices.
- Final standings correctly account for beer bonuses and disqualify teams with unpaid birdie juice debt.
- Individual player drinking statistics are available.
- The application is responsive, mobile-friendly, and usable throughout an 18-hole round with minimal interaction.
````
