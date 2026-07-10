# BrainBlitz

BrainBlitz is a real-time multiplayer trivia game built for a shared host screen and phone-based player controllers. A host creates a room, players join with a room code or QR link, and the server decides who buzzed first.

## Features

- Host lobby with room codes and QR join links.
- Mobile-friendly player controller with display names and avatars.
- Jeopardy-style question board loaded from editable JSON.
- Server-authoritative buzzing so the first valid buzz received by the server wins.
- Host controls for opening/closing buzzing, marking answers, revealing answers, reopening buzzing, and returning to the board.
- Live leaderboard with manual score editing.
- Optional wrong-answer point deduction.
- Reconnect support for hosts and players within the same session.
- In-memory room state for simple local play and single-instance deployment.

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Express
- Socket.IO
- Node.js test runner

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open the host screen at:

```text
http://localhost:3000
```

Players can scan the QR code in the host lobby or open the join page directly:

```text
http://localhost:3000/join
```

For phone testing, make sure all devices are on the same network. If `localhost` is not reachable from phones, use the host machine's LAN address, for example:

```text
http://192.168.1.25:3000
```

## Available Scripts

```bash
npm run dev
```

Starts the Express server with Vite middleware for local development.

```bash
npm run build
```

Builds the React frontend into `dist/`.

```bash
npm start
```

Runs the production server. The production server serves the built frontend from `dist/`.

```bash
npm test
```

Runs the Node.js test suite.

## Configuration

Environment variables are read from the process environment. See `.env.example` for the basic values.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port used by the Express and Socket.IO server. |
| `NODE_ENV` | `development` | Use `production` to serve the built frontend from `dist/`. |
| `PUBLIC_URL` | request-derived | Optional base URL used when generating join links and QR codes. |

Example on PowerShell:

```powershell
$env:PORT=4000
npm run dev
```

## Question Data

Trivia content lives in:

```text
src/data/sampleQuestions.json
```

The file contains categories, point values, questions, and answers. Keep the same structure when editing:

```json
{
  "categories": [
    {
      "name": "Category Name",
      "questions": [
        {
          "value": 100,
          "question": "Question text?",
          "answer": "Answer text"
        }
      ]
    }
  ]
}
```

Restart the server after changing the question data.

## Project Structure

```text
BrainBlitz/
|-- src/
|   |-- components/          # React UI components
|   |-- data/                # Trivia question data
|   |-- server/              # Express, Socket.IO, and room state logic
|   |-- utils/               # Validation, scoring, and room code helpers
|   |-- App.jsx              # App routes and main screens
|   |-- config.js            # App name, tagline, and default settings
|   |-- main.jsx             # React entry point
|   `-- socket.js            # Socket.IO client setup
|-- test/                    # Node.js tests
|-- index.html               # Vite HTML entry
|-- package.json             # Scripts and dependencies
`-- vite.config.js           # Vite configuration
```

## Testing

Run:

```bash
npm test
```

The current tests cover:

- Duplicate player name handling.
- First-valid-buzz-wins behavior.
- Hidden answers for player clients before reveal.
- Host scoring and used-question tracking.

## Production Build

```bash
npm run build
npm start
```

Deployment notes:

- The app needs WebSocket support for Socket.IO.
- Run a single server instance unless room state is moved to shared storage.
- Rooms are stored in memory and reset when the server restarts.
- Set `PUBLIC_URL` in production if generated join links should use a specific public domain.

## Known Limitations

- No database persistence.
- No user authentication.
- No admin dashboard for editing questions.
- Rooms do not survive server restarts.
- Multi-instance deployments require shared state, such as Redis or a database.

## License

No license has been specified yet.
