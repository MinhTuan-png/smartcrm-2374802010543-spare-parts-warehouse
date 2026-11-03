# Deployment Guide

System: **Spare-parts warehouse (flow L5) of Smart CRM – Mekong Mobile.** Three containers: PostgreSQL (`db`), Node.js API (`api`), and the React web app served by nginx (`web`).

Everything below was run from an empty folder on a machine that had only Docker (Linux, Docker 29.9.2, Compose v5.6.1) and the commands are copy-pasteable. The same two commands work on Windows PowerShell, macOS and Linux.

## 1. Environment requirements

| Item | Requirement |
|---|---|
| Operating system | Windows 10/11 (with Docker Desktop and WSL 2), macOS 12+, or Linux. Tested on Linux x86-64 |
| Docker | Docker Engine 24+ or Docker Desktop 4.x **with Compose v2** (`docker compose version` must work; it does not need the old `docker-compose` command). Tested with Docker 29.9.2 and Compose 5.6.1 |
| Git | Any recent version, to clone the repository |
| Free disk space | At least 2 GB (images `postgres:16-alpine`, `node:22-alpine`, `nginx-unprivileged:1.27-alpine`, plus build cache) |
| Free memory | At least 2 GB available to Docker |
| Free TCP ports | **3000** (API), **8080** (web), **5433** (PostgreSQL published to the host). If a port is busy, change `APP_PORT`, `WEB_PORT` or `DB_PUBLISH_PORT` in `.env` (section 3) |
| Internet access | Needed on the first build to pull images and run `npm ci` |
| Node.js / PostgreSQL | **Not needed** when you use Docker. Only needed for the optional non-Docker run in README section 3.2 (Node.js 22, PostgreSQL 16) |

## 2. Steps to build the system

Run these in a terminal. Each step is one command.

1. Clone the repository at the submission tag into an empty folder:

   ```bash
   git clone --branch v1.0 https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse.git
   ```

2. Enter the folder:

   ```bash
   cd smartcrm-2374802010543-spare-parts-warehouse
   ```

3. **Command 1 of 2.** Create the configuration file from the template (the template values work as they are for a local run):

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell use `Copy-Item .env.example .env`.

4. **Command 2 of 2.** Build and start everything:

   ```bash
   docker compose up -d --build
   ```

   The first build takes a few minutes. Compose starts the services in this order: `db` (waits until PostgreSQL accepts connections) → `api` (waits for `db`, creates the tables, loads the sample data, starts the server) → `web` (waits until `api` is healthy).

5. Check that the system is running (section 5). Run the automated tests (section 5, step 6).

To stop: `docker compose down` (keeps the data) or `docker compose down -v` (also deletes the database volume, so the next `up` starts from scratch).

## 3. Environment variables

All variables live in `.env` (copied from `.env.example`). `.env` is ignored by git and must never be committed.

| Variable | Meaning | Sample value | Required? |
|---|---|---|---|
| `DB_NAME` | Name of the application database; the `db` container creates it | `smartcrm` | Yes |
| `DB_USER` | PostgreSQL user; the `db` container creates it | `smartcrm_app` | Yes |
| `DB_PASSWORD` | Password of that user. Use letters, digits and `_` only (no `@ : / # ?`) | `doi_mat_khau_nay` | Yes |
| `SECRET_KEY` | Key that signs login tokens (JWT). A random string of at least 32 characters. The API refuses to start without it | `doi-chuoi-nay-thanh-chuoi-ngau-nhien-it-nhat-32-ky-tu` | Yes |
| `DEMO_PASSWORD` | Password of the 12 demo accounts (`ktv1`…`ktv6`, `quanly1`…`quanly6`) created by the seed step | `matkhau-demo-2026` | Yes |
| `APP_PORT` | Host port of the API | `3000` | No (default 3000) |
| `WEB_PORT` | Host port of the web app | `8080` | No (default 8080) |
| `DB_PUBLISH_PORT` | Host port of PostgreSQL (for pgAdmin or `psql`); 5433 avoids a local PostgreSQL on 5432 | `5433` | No (default 5433) |
| `DB_CONNECT_TIMEOUT_MS` | How long the API waits for a database connection before answering `503` | `5000` | No (default 5000) |
| `LOG_LEVEL` | Log verbosity: `debug`, `info`, `warn`, `error` | `info` | No (default `info`) |
| `LOCAL_DATA_DIR` | Folder with the CSV files that the seed step loads (mounted read-only into `api`). `./data-mau` is the small sample set that is committed to the repository | `./data-mau` | No (default `./data-mau`) |
| `TEST_DB_NAME` | Separate database used by the tests; it must end with `_test` because every test wipes it | `smartcrm_test` | No (default `smartcrm_test`) |
| `CORS_ORIGIN` | Browser origins allowed to call the API, comma separated. Only needed when the web app runs outside Docker (Vite dev server) | `http://localhost:5173,http://localhost:5174` | No in Docker |
| `DB_HOST`, `DB_PORT`, `DATA_DIR`, `DB_WAIT_RETRIES`, `DB_WAIT_INTERVAL_MS` | Used only when you run the API directly with Node (no Docker): database address, seed folder, and how long the API waits for the database at start | `localhost`, `5432`, empty, `15`, `2000` | No in Docker (Compose sets the Docker values itself) |

## 4. Sample data

The sample data set is in `data-mau/` (committed to the repository) and is **loaded automatically** when the `api` container starts (`migrate` → `seed`), so the system never starts empty. Both steps can be run again safely: they do not duplicate rows.

After a normal start the database must contain:

| Table | Rows |
|---|---|
| `service_center` | 6 |
| `part` | 180 |
| `part_stock` | 717 |
| `ticket` (read-only copy of flow L2 tickets) | 360 |
| `part_transaction` | 174 |
| `app_user` | 12 |

Check it:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) AS part_stock FROM part_stock;"'
```

Expected: `part_stock = 717`. Demo accounts: `ktv<center id>` (technician) and `quanly<center id>` (manager) for centers 1 to 6, for example `ktv2` and `quanly2`, password = `DEMO_PASSWORD`. To load the full course data set instead, copy the five CSV files into `data/`, set `LOCAL_DATA_DIR=./data` in `.env`, then run `docker compose down -v` and `docker compose up -d --build`.

## 5. How to check that the system works

Run these in order. Each line gives the expected result.

1. All services are healthy:

   ```bash
   docker compose ps
   ```

   Expected: `db`, `api` and `web` all show `(healthy)` in the STATUS column. (Wait up to one minute after `up`.)

2. The API answers and the database is reachable:

   ```bash
   curl http://localhost:3000/health
   ```

   Expected: `{"status":"ok","db":"ok"}`. On Windows PowerShell use `curl.exe`.

3. Log in through the web server's proxy (this also proves nginx → API works):

   ```bash
   curl -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"ktv2","password":"matkhau-demo-2026"}'
   ```

   Expected: HTTP 200 with a JSON body that contains `"access_token"`, `"role":"TECHNICIAN"` and `"center_id":2`. (If you changed `DEMO_PASSWORD`, use your value.)

4. Open `http://localhost:8080` in a browser and log in as `ktv2`. Expected: the stock table of center 2 appears; searching for `pin` shows 14 rows, 3 of them marked `SẮP HẾT`.

5. The seed step is repeatable (no duplicated rows):

   ```bash
   docker compose exec api node db/seed/seed.js
   ```

   Expected: the log lines still report `part_stock` 717, `ticket` 360, `app_user` 12.

6. Run the automated tests (needs only Docker):

   ```bash
   docker compose --profile test run --rm test
   ```

   Expected: it ends with `# tests 83`, `# pass 83`, `# fail 0`, `# skipped 0` and exit code 0. To re-run one test case, for example `TC-05`: `docker compose --profile test run --rm test sh -c "node scripts/create-test-db.js && npm test -- TC-05"`.

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `port is already allocated` | Another program uses 3000, 8080 or 5433. Change `APP_PORT`, `WEB_PORT` or `DB_PUBLISH_PORT` in `.env`, then run `docker compose up -d` again |
| `api` stays `unhealthy` or restarts | Read the log: `docker compose logs api`. A missing `SECRET_KEY` or a wrong `DB_PASSWORD` is reported there |
| You changed `DB_PASSWORD` and get `password authentication failed` | PostgreSQL keeps the old password in its volume: `docker compose down -v`, then `docker compose up -d --build` |
| Login says "Tên đăng nhập hoặc mật khẩu không đúng" | The accounts were created with another `DEMO_PASSWORD`. Run `docker compose down -v` then `docker compose up -d --build` |
| `docker compose --profile test run` is unknown | Update Docker Compose to v2 or later |

Security notes for a real deployment: change `SECRET_KEY`, `DB_PASSWORD` and `DEMO_PASSWORD`, do not publish the database port, and put the web server behind HTTPS (see [`checklist-bao-mat.md`](checklist-bao-mat.md) for known limits).
