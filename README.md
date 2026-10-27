# CampusLine

A college queue-management MVP with a React + Vite frontend and an Express API.

## Run locally

1. Install Node.js 20 or newer.
2. From this folder, run `npm install` once.
3. Run `npm run dev`.
4. Open [http://localhost:5178](http://localhost:5178).

The Vite frontend uses the API at `http://localhost:4000`. Stop both processes with Ctrl+C. The dev staff PIN is `2468`. Queue data is held in memory and resets when the server restarts.

## MVP features

- Five queues: Examination Cell, Admin Office, HOD Office, Library, and Canteen.
- Students can request a numbered ticket and see their position and estimated wait.
- Queue status refreshes automatically every five seconds.
- Staff can unlock controls with a PIN, then call the next student or complete the current visit.
- A student's ticket is remembered in that browser with local storage.
- Public queue status omits student names.

This is a classroom demo: it uses seeded sample queues and in-memory data, so queues reset when the service restarts. It does not send push notifications. Set a private `STAFF_PIN` environment variable before hosting; the dev PIN is only for local use. Add a persistent database and real staff accounts before using real student data.

## Deploy a cloud preview on Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New → Blueprint** and connect that repository.
3. Render reads `render.yaml` and builds the React site and Express API as one web service.
4. Set a strong, private value for `STAFF_PIN` when Render asks for it, then deploy.

The service is configured for a free preview. Render's free web services may sleep when idle, and this app's queue data resets whenever its in-memory server restarts. Free Render Postgres databases currently expire after 30 days, so use a persistent database plan before relying on the queue for real operations.

## Other commands

- `npm run build` creates the production frontend in `dist/`.
- `npm start` runs the API server only; the frontend is served by Vite during development.

## API

- `GET /api/health`
- `GET /api/offices`
- `GET /api/offices/:id`
- `POST /api/offices/:id/tokens` with `{ "name": "Student name" }`
- `POST /api/offices/:id/next`
- `POST /api/offices/:id/complete`

