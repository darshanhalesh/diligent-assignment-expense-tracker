# Smart Expense Tracker API

A clean, production-style REST API for tracking personal expenses — built with Node.js and Express, using a local JSON file as storage (no database). Built as a take-home assignment for **Diligent Corporation**.

## Overview

The API lets a client create expenses, list them (optionally filtered by category), view a spend summary, and delete an expense. It follows a layered **MVC-style** architecture (routes → controllers → services → data layer) so that HTTP concerns, business logic, and persistence are cleanly separated and easy to test.

## Features

- **REST API** for expense management: create, list, filter, summarize, delete
- **JSON file persistence** via `fs/promises`, with a write queue + atomic rename to prevent corruption from concurrent writes
- **Input validation** with `express-validator` (required fields, `amount > 0`, ISO 8601 dates)
- **Centralized error handling** with consistent JSON error responses and correct HTTP status codes
- **Layered architecture**: routes, controllers, services, middleware, utils
- **Swagger / OpenAPI docs** at `/api/docs`
- **Request logging** via `morgan`
- **Automated tests** with Jest + Supertest (11 tests covering happy paths, validation, and error cases)

## Folder Structure

```
your-repo/
│
├── README.md
├── AI_NOTES.md
├── package.json
├── .gitignore
├── src/
│   ├── app.js              # Express app assembly (middleware, routes, error handlers)
│   ├── server.js           # Entry point — starts the HTTP server
│   ├── routes/              # Route definitions + Swagger JSDoc annotations
│   ├── controllers/         # Thin HTTP layer — parses req, calls services, shapes res
│   ├── services/            # Business logic (validation-independent) + persistence calls
│   ├── middleware/          # express-validator rules + centralized error handler
│   ├── utils/                # JSON file helper, custom ApiError class
│   ├── data/
│   │      expenses.json     # Local JSON "database"
│   └── config/               # Environment config + Swagger spec setup
│
└── tests/
      expense.test.js         # Jest + Supertest integration tests
```

## Installation

```bash
npm install
```

Optionally copy `.env.example` to `.env` to override the default port:

```bash
cp .env.example .env
```

## Running

**Development** (auto-restarts on file changes via nodemon):

```bash
npm run dev
```

**Production:**

```bash
npm start
```

The server starts on `http://localhost:3000` by default (configurable via `PORT` in `.env`).

## Running Tests

```bash
npm test
```

Tests run against an isolated JSON file (`tests/test-expenses.json`), so they never touch your real `src/data/expenses.json`.

## API Documentation

Interactive Swagger UI is available once the server is running:

```
http://localhost:3000/api/docs
```

### Expense Object

```json
{
  "id": "df5825b1-6dd2-4278-bb40-f115be7cae40",
  "title": "Groceries",
  "amount": 250.75,
  "category": "Food",
  "date": "2026-07-30"
}
```

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/expenses` | Create a new expense |
| GET | `/api/expenses` | Get all expenses |
| GET | `/api/expenses?category=Food` | Filter expenses by category |
| GET | `/api/expenses/summary` | Get total spend + spend by category |
| DELETE | `/api/expenses/:id` | Delete an expense by id |

---

#### `POST /api/expenses`

Create a new expense.

**Request:**

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Groceries",
    "amount": 250.75,
    "category": "Food",
    "date": "2026-07-30"
  }'
```

**Response — `201 Created`:**

```json
{
  "success": true,
  "data": {
    "id": "df5825b1-6dd2-4278-bb40-f115be7cae40",
    "title": "Groceries",
    "amount": 250.75,
    "category": "Food",
    "date": "2026-07-30"
  }
}
```

**Validation error — `400 Bad Request`:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "amount", "message": "amount must be a number greater than 0" }
  ]
}
```

---

#### `GET /api/expenses`

Get all expenses.

**Request:**

```bash
curl http://localhost:3000/api/expenses
```

**Response — `200 OK`:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    { "id": "...", "title": "Groceries", "amount": 250.75, "category": "Food", "date": "2026-07-30" },
    { "id": "...", "title": "Flight", "amount": 400, "category": "Travel", "date": "2026-07-15" }
  ]
}
```

---

#### `GET /api/expenses?category=Food`

Filter expenses by category (case-insensitive).

**Request:**

```bash
curl "http://localhost:3000/api/expenses?category=Food"
```

**Response — `200 OK`:**

```json
{
  "success": true,
  "count": 1,
  "data": [
    { "id": "...", "title": "Groceries", "amount": 250.75, "category": "Food", "date": "2026-07-30" }
  ]
}
```

---

#### `GET /api/expenses/summary`

Get total spend and spend broken down by category.

**Request:**

```bash
curl http://localhost:3000/api/expenses/summary
```

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "total": 1200,
    "byCategory": {
      "Food": 500,
      "Travel": 400,
      "Shopping": 300
    }
  }
}
```

---

#### `DELETE /api/expenses/:id`

Delete an expense by id.

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/expenses/df5825b1-6dd2-4278-bb40-f115be7cae40
```

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "id": "df5825b1-6dd2-4278-bb40-f115be7cae40",
    "title": "Groceries",
    "amount": 250.75,
    "category": "Food",
    "date": "2026-07-30"
  }
}
```

**Not found — `404 Not Found`:**

```json
{
  "success": false,
  "message": "Expense with id 'df5825b1-6dd2-4278-bb40-f115be7cae40' not found"
}
```

### Status Codes Used

| Code | Meaning |
|---|---|
| 200 | Successful GET / DELETE |
| 201 | Successful POST (resource created) |
| 400 | Validation error (bad input) |
| 404 | Resource or route not found |
| 500 | Unexpected server error |

## Design Notes

- **Why a JSON file and not a database:** the assignment scope explicitly calls for no database. To keep this safe under concurrent requests, `src/utils/jsonFileHelper.js` serializes all reads/writes on an internal promise queue and writes atomically (write to a temp file, then `rename` over the real file), so two near-simultaneous requests can't corrupt `expenses.json` or silently lose an update.
- **Why services are separate from controllers:** controllers only translate HTTP ↔ domain calls. All business rules (filtering, totals, "not found" checks) live in `src/services/expenseService.js`, which makes them independently testable and reusable if this API ever grew a second interface (e.g., a CLI or a GraphQL layer).
- **Why validation is middleware, not in controllers:** `express-validator` chains run before the controller is ever invoked, so controllers can assume `req.body`/`req.query`/`req.params` are already well-formed.
