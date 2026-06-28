# Graph Report - .  (2026-06-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 150 nodes · 193 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `34ddc65b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `scripts` - 7 edges
2. `api` - 6 edges
3. `requireAuth()` - 5 edges
4. `construirDataset()` - 4 edges
5. `exportarCsv()` - 4 edges
6. `calcularChurnLabel()` - 4 edges
7. `scripts` - 4 edges
8. `obtenerDetalle()` - 3 edges
9. `clientesFrecuentes()` - 3 edges
10. `dataset()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `obtenerDetalle()` --calls--> `calcularChurnLabel()`  [EXTRACTED]
  backend/src/controllers/clientes.controller.js → backend/src/utils/churn.js
- `exportarCsv()` --calls--> `arrayToCsv()`  [EXTRACTED]
  backend/src/controllers/reportes.controller.js → backend/src/utils/exportCsv.js

## Import Cycles
- None detected.

## Communities (15 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (11): api, setToken(), LoginForm(), Navbar(), CANALES, Pantalla1Registro(), CANALES, Pantalla2Historial() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, morgan, @prisma/client (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (13): { arrayToCsv }, { calcularChurnLabel }, clientesFrecuentes(), construirDataset(), dataset(), exportarCsv(), prisma, {
  clientesFrecuentes,
  dataset,
  exportarCsv,
} (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (11): prisma, { PrismaClient }, cerrar(), crear(), prisma, jwt, requireAuth(), { crear, cerrar } (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (14): dependencies, react, react-dom, description, devDependencies, vite, @vitejs/plugin-react, name (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (11): bcrypt, jwt, login(), prisma, registrar(), requireRole(), express, { login, registrar } (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (11): actualizar(), buscar(), { calcularChurnLabel }, crear(), obtenerDetalle(), prisma, {
  buscar,
  crear,
  obtenerDetalle,
  actualizar,
}, express (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (11): app, errorHandler(), notFound(), authRoutes, clientesRoutes, cors, { errorHandler, notFound }, express (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (7): scripts, dev, prisma:generate, prisma:migrate, prisma:studio, seed, start

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (3): bcrypt, prisma, { PrismaClient }

## Knowledge Gaps
- **80 isolated node(s):** `bcrypt`, `{ PrismaClient }`, `prisma`, `express`, `cors` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAuth()` connect `Community 3` to `Community 2`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `scripts` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `bcrypt`, `{ PrismaClient }`, `prisma` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._