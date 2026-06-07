# ProTrack - Wealth Manager Productivity Application

ProTrack is a native macOS desktop productivity tracking application designed for financial advisors, wealth managers, and private bankers. It follows a structured daily scoring methodology across four core pillars of business growth.

---

## 🛠️ Tech Stack

- **Framework**: Electron + React (TypeScript)
- **Data storage**: Local SQLite database via WebAssembly-compiled SQLite (`sql.js`) with debounced local file persistence
- **Charts**: Recharts
- **State Management**: Zustand
- **Export Formats**: CSV and PDF reports

---

## ⚙️ Core Data Model & Score Categories

Points are tracked daily across 4 Pillars:

1. **Client Activities (Section A)**:
   - New Client Meeting (5 pts)
   - Client Review Meeting (3 pts)
   - Client Reference / Connect (2 pts)
   - Client Follow-Up Call (2 pts)
   - Client Onboarding (10 pts)

2. **Business Development (Section B)**:
   - Financial Plan Writing (15 pts)
   - Investor Awareness Program (10 pts)
   - SIP Book Addition (10 pts)
   - Cross-Sell Product (5 pts)
   - Lead Generation (2 pts)

3. **Knowledge & Learning (Section C)**:
   - Reading / Self-Learning (5 pts)
   - Certification Progress (5 pts)
   - Market Research (5 pts)
   - Team / Peer Training (5 pts)

4. **Brand & Digital Presence (Section D)**:
   - LinkedIn / Social Post (1 pt)
   - WhatsApp Broadcast (2 pts)
   - Google Maps / Reviews (2 pts)
   - Website Content Update (2 pts)
   - Team Player (2 pts)
   - New Certification (5 pts)

### Performance Thresholds
- **Excellent**: $\ge 90$ points
- **Productive**: $70 - 89$ points
- **Average**: $50 - 69$ points
- **Poor**: $< 50$ points

**Daily target baseline**: 70 points.

---

## 🚀 Keyboard Shortcuts

Keyboard shortcuts allow quick navigations across logging:
- `Cmd+D` / `Ctrl+D` &rarr; Go to today's Daily Log entry
- `Cmd+S` / `Ctrl+S` &rarr; Save current day
- `Cmd+,` / `Ctrl+,` &rarr; Open Settings
- `Cmd+Left` / `Ctrl+Left` &rarr; Go to previous day (while in Daily Log)
- `Cmd+Right` / `Ctrl+Right` &rarr; Go to next day (while in Daily Log)

---

## 🛠️ Local Development & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` or `yarn`

### Setup Instructions
1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Run in development mode (spawns Vite server & Electron concurrently):
   ```bash
   npm run dev
   ```
3. Compile & bundle the application:
   ```bash
   npm run build
   ```
4. Package the native installer (generates `.dmg` for macOS under `dist-package/`):
   ```bash
   npm run package
   ```
