# AI Notes

Honest notes on how AI was used to build this take-home assignment.

## What AI helped generate

- The initial project scaffold: folder structure, `package.json`, and the boilerplate wiring for Express, `morgan`, `dotenv`, and `swagger-ui-express`/`swagger-jsdoc`.
- The first draft of every file: `app.js`/`server.js`, the route/controller/service/middleware split, the `express-validator` rules, the centralized error handler, and the Jest + Supertest test suite.
- The Swagger/OpenAPI JSDoc annotations on the routes — I wouldn't have written the full schema definitions by hand for a take-home this size, so I let AI generate them and then checked them against the actual request/response shapes.
- The README structure and example curl requests/responses.

## What I manually reviewed

- **The JSON persistence layer (`utils/jsonFileHelper.js`).** This was the part I was most suspicious of, since "don't corrupt the file under concurrent writes" is the one place a JSON-file-as-database design can quietly break. I read through the queueing logic line by line and traced through what happens when two `DELETE` requests hit at nearly the same time.
- **Route ordering.** I checked that `GET /api/expenses/summary` is registered before `DELETE /api/expenses/:id` matters — actually in this API there's no `GET /:id` route at all, but I still wanted to make sure `/summary` couldn't ever get accidentally shadowed by a future param route, so I left an explicit comment there.
- **Validation edge cases.** I manually tested `amount: 0`, `amount: -5`, missing fields, and a garbage date string against the running server with `curl` to confirm the 400 responses and field-level error messages actually matched what the spec asked for, rather than trusting the code by inspection alone.
- **The summary endpoint's floating-point math.** I specifically checked what `0.1 + 0.2`-style rounding errors would do to `total` after many expenses, since JS floating point addition can produce things like `299.9999999999998`.

## Changes I made

1. **Fixed a concurrency bug in the write queue.** The first AI-generated version of `mutate()`/`write()` chained every operation directly onto `this.queue` with `.then()`. That works fine when nothing throws — but `deleteExpense()` needs to throw a 404 `ApiError` when the id doesn't exist, and once a `.then()` in that chain rejects, every *future* `.then()` chained onto the same promise short-circuits and rejects too. In practice that meant: delete a nonexistent id once, and the JSON file would become permanently unwritable for the rest of the process's lifetime — a single bad request would silently break the whole API. I changed it so the queue itself always resolves (via an internal `.catch(() => {})`), while the actual result/error is still returned to the caller through a separate promise. I wrote this fix myself after tracing the bug by hand, not by asking AI to "fix a bug" — I wanted to understand exactly why it happened.
2. **Removed `.toDate()` from the date validator.** The generated `express-validator` chain originally called `.isISO8601().toDate()`, which converts the validated string into a JS `Date` object. That meant `JSON.stringify` would later serialize it as a full timestamp (`"2026-07-30T00:00:00.000Z"`) instead of the plain `"2026-07-30"` shown in the spec's example expense object. I dropped `.toDate()` so the original date string is stored and returned as-is.
3. **Rounded the summary totals to 2 decimal places.** Related to the floating-point check above — I added explicit rounding in `getSummary()` after noticing that repeated `amount` additions could otherwise return values like `1200.0000000000002`.
4. **Reordered the `/summary` route above any future `/:id`-style routes** and added a comment explaining why, after double-checking Express's route-matching behavior (first match wins, and `/:id` would otherwise treat `"summary"` as an id if it were registered first).
5. **Isolated test data.** The generated test file initially pointed straight at `src/data/expenses.json`. I changed it to set `DATA_FILE_PATH` to a dedicated `tests/test-expenses.json` file before requiring the app, and added `afterAll` cleanup, so running `npm test` never wipes or pollutes real data.

## One suggestion I rejected

The AI's first pass suggested adding a simple in-memory cache in front of `expenseService.getExpenses()`/`getSummary()` to "avoid re-reading the JSON file on every request." I rejected this. For a JSON-file-backed API with no database and no other process writing to the file, the cost of `fs.readFile` on a small file is negligible, and a cache adds real risk: it's another thing that can go stale relative to what's actually on disk, especially since writes already go through an async queue. Adding cache-invalidation logic here would have increased complexity for a performance problem that doesn't exist at this scale — so I kept reads simple and direct from the file.
