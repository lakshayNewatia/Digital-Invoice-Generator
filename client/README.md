# Digital Invoice Generator — Client

This folder contains the **primary frontend** for the project.

It is a premium, UI-first React + Vite + Tailwind + Framer Motion app designed to work with the existing backend in `../server`.

## Stack

- React + Vite
- Tailwind CSS
- Framer Motion
- React Router

## Backend connection

The backend is expected to run locally at:

- `http://localhost:5000`

During development, `client` proxies the following to the backend via Vite:

- `/api/*` -> `http://localhost:5000/api/*`
- `/uploads/*` -> `http://localhost:5000/uploads/*`

## Run (development)

In one terminal:

- `cd server`
- `npm start`

In another terminal:

- `cd client`
- `npm run dev`

## Routes

- `/` Landing
- `/login` Login
- `/register` Register
- `/dashboard` Dashboard (protected)
- `/invoices/new` Create Invoice (protected)
- `/invoices/:id` Invoice Detail (protected)
- `/clients` Clients (protected)
- `/reports` Reports (protected)
- `/settings` Settings (protected)

## API expectations (high-level)

- Auth:
  - `POST /api/users` (register)
  - `POST /api/users/login`
  - `GET /api/users/me`
  - `PUT /api/users/profile` (multipart form: `companyName`, `companyLogo`)
- Invoices:
  - `GET/POST /api/invoices`
  - `PUT/DELETE /api/invoices/:id`
  - `GET /api/pdf/:id/generate`
  - `POST /api/email/:id/send`
- Clients:
  - `GET/POST /api/clients`
  - `PUT/DELETE /api/clients/:id`
- Items:
  - `GET/POST /api/items`
  - `PUT/DELETE /api/items/:id`
