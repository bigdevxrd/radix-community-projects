# Issue #58 — CV2 Phase 2: Self-Host dApp + Vote-Collector

> Docker deployment: React frontend, Hono vote-collector, PostgreSQL 17

## Problem Analysis

The Guild currently reads CV2 (Consultation V2) on-chain state via the Gateway API (`bot/services/consultation.js`), but the CV2 web interface and vote-collector are hosted externally. Self-hosting gives the Guild full control over the governance UI, reduces dependency on third-party infrastructure, and allows customisation.

### Current CV2 Integration

- `bot/services/consultation.js` — polls Gateway API every 5 min, caches to `cv2_proposals` SQLite table
- `CV2_COMPONENT_ADDRESS` env var controls enable/disable
- Bot: `/cv2`, `/cv2 <id>`, `/cv2 status`, `/cv2 sync`
- API: `/api/cv2/status`, `/api/cv2/proposals`, `/api/cv2/proposals/:id`, `/api/cv2/stats`
- Dashboard: proposals page displays CV2 temperature checks with vote TX manifests

### Target Architecture

```
                    Internet
                       │
                    ┌──┴──┐
                    │Caddy │  (reverse proxy, TLS)
                    └──┬──┘
           ┌───────────┼───────────┐
           │           │           │
    /gov/*  │    /gov-api/*  │    /api/*
           ▼           ▼           ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │CV2 React │ │Vote      │ │Guild Bot │
     │Frontend  │ │Collector │ │API       │
     │:3010     │ │(Hono)    │ │:3003     │
     └──────────┘ │:3011     │ └──────────┘
                  └─────┬────┘
                        │
                  ┌─────▼────┐
                  │PostgreSQL│
                  │17  :5432 │
                  └──────────┘
```

## Solution Design

### Docker Compose Setup

**File:** `cv2-selfhost/docker-compose.yml`

```yaml
version: "3.9"
services:
  cv2-frontend:
    build: ./frontend
    ports: ["3010:3000"]
    environment:
      - VITE_API_URL=https://radixguild.com/gov-api
      - VITE_CV2_COMPONENT=${CV2_COMPONENT_ADDRESS}
      - VITE_NETWORK_ID=1
    restart: unless-stopped
    mem_limit: 128m

  cv2-vote-collector:
    build: ./vote-collector
    ports: ["3011:3001"]
    environment:
      - DATABASE_URL=postgresql://cv2:${CV2_DB_PASSWORD}@cv2-db:5432/cv2
      - CV2_COMPONENT=${CV2_COMPONENT_ADDRESS}
      - GATEWAY_URL=https://mainnet.radixdlt.com
    depends_on:
      cv2-db:
        condition: service_healthy
    restart: unless-stopped
    mem_limit: 256m

  cv2-db:
    image: postgres:17-alpine
    environment:
      - POSTGRES_DB=cv2
      - POSTGRES_USER=cv2
      - POSTGRES_PASSWORD=${CV2_DB_PASSWORD}
    volumes:
      - cv2-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cv2"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    mem_limit: 128m

volumes:
  cv2-pgdata:
```

### Caddy Configuration

**Add to existing Caddyfile (`/etc/caddy/Caddyfile`):**

```caddy
radixguild.com {
    # Existing guild routes...
    handle /api/* {
        reverse_proxy localhost:3003
    }

    # CV2 self-hosted routes
    handle /gov-api/* {
        uri strip_prefix /gov-api
        reverse_proxy localhost:3011
    }

    handle /gov/* {
        uri strip_prefix /gov
        reverse_proxy localhost:3010
    }
}
```

### Directory Structure

```
cv2-selfhost/
├── docker-compose.yml
├── .env.example
├── frontend/
│   ├── Dockerfile
│   └── ... (CV2 React app source or pre-built)
├── vote-collector/
│   ├── Dockerfile
│   └── ... (Hono API source)
└── README.md
```

### Dockerfile: Frontend

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

### Dockerfile: Vote Collector

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

### Resource Requirements

| Service | RAM | CPU | Disk |
|---------|-----|-----|------|
| CV2 Frontend (nginx) | ~30MB | Minimal | ~10MB |
| Vote Collector (Hono) | ~100MB | Low | ~20MB |
| PostgreSQL 17 | ~128MB | Low | ~50MB |
| **Total Additional** | **~260MB** | Low | ~80MB |

Current VPS: 2GB RAM → ~500MB additional is within budget (issue says ~500MB).

### Integration with Existing Guild Infrastructure

**Bot sync update (`bot/services/consultation.js`):**
- Change Gateway polling to also check self-hosted vote-collector for vote tallies
- Or: Keep Gateway-only polling (on-chain source of truth), vote-collector handles off-chain pre-votes

**Dashboard integration:**
- Add "Governance Portal" link to nav → `/gov/`
- Or embed CV2 voting directly in proposals page (iframe or API-driven)
- Preferred: API-driven integration — dashboard calls `/gov-api/proposals` and renders natively

**Health monitoring:**
- Add CV2 Docker health to existing `/api/health` endpoint
- Check: `cv2-frontend` responding, `cv2-vote-collector` responding, `cv2-db` healthy
- Bot: `/cv2 status` shows self-hosted vs gateway status

### Deployment Steps

1. **Obtain CV2 source code** — fork/clone the CV2 dApp repository
2. **Configure environment** — set CV2_COMPONENT_ADDRESS, DB password, API URLs
3. **Build and test locally** — `docker compose up --build`
4. **Deploy to VPS** — `docker compose -f cv2-selfhost/docker-compose.yml up -d`
5. **Update Caddy** — add `/gov/` and `/gov-api/` routes, reload
6. **Verify** — test frontend loads, vote-collector accepts requests, DB stores votes
7. **Update bot** — point consultation.js at self-hosted endpoint as primary
8. **Monitor** — add to PM2/ecosystem.config.js or Docker health checks

### Rollback Plan

If self-hosted CV2 has issues:
- Vote-collector down → fall back to Gateway API polling (existing code)
- Frontend down → redirect `/gov/` to external CV2 URL
- DB corruption → PostgreSQL has WAL recovery; daily pg_dump backup cron

## Security Considerations

1. **PostgreSQL not exposed** — only accessible within Docker network
2. **CV2_DB_PASSWORD** — stored in `.env` file (not committed), generated with `openssl rand -hex 32`
3. **Vote validation** — vote-collector must verify TX signatures (no trust-the-client)
4. **Rate limiting** — Hono middleware: 30 req/min per IP on vote-collector
5. **CORS** — vote-collector only accepts requests from `radixguild.com`
6. **TLS** — Caddy auto-provisions Let's Encrypt certificates

## Effort Estimate

- Docker setup + Dockerfiles: 0.5 session
- CV2 source integration: 1-2 sessions (depends on CV2 codebase complexity)
- Caddy config + VPS deployment: 0.5 session
- Integration testing + monitoring: 0.5 session
- **Total: 2.5-3.5 sessions (~1 week)**

## Dependencies

- CV2 dApp source code (React frontend + Hono vote-collector)
- Docker + Docker Compose on VPS
- Caddy reverse proxy (already in use)
- PostgreSQL 17 (new — currently only SQLite in use)
- CV2_COMPONENT_ADDRESS on mainnet (already configured)
