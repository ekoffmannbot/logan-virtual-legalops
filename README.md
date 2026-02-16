# Logan Virtual - LegalOps OS

Sistema operativo interno para estudios juridicos. Estandariza operaciones legales: intake de clientes, propuestas, contratos, documentos notariales, revision de causas, cobranza, correos con SLA y asistente IA.

## Quick Start

### Requisitos
- Docker & Docker Compose
- Git

### Setup

```bash
# 1. Clonar y configurar
cp .env.example .env

# 2. Levantar todos los servicios
make dev
# o: docker-compose up --build

# 3. Ejecutar migraciones (en otro terminal)
make migrate

# 4. Cargar datos de demo
make seed
```

### Acceso

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Mailpit (email) | http://localhost:8025 |
| Health Check | http://localhost:8000/health |

### Cuentas Demo

| Email | Password | Rol |
|-------|----------|-----|
| admin@logan.cl | logan2024 | Gerente Legal |
| abogado.jefe@logan.cl | logan2024 | Abogado Jefe |
| abogado@logan.cl | logan2024 | Abogado |
| procurador@logan.cl | logan2024 | Procurador |
| secretaria@logan.cl | logan2024 | Secretaria |
| admin.op@logan.cl | logan2024 | Administracion |
| cobranza@logan.cl | logan2024 | Jefe Cobranza |
| comercial@logan.cl | logan2024 | Agente Comercial |

## Arquitectura

```
logan-virtual/
  apps/
    api/          # Backend: FastAPI + SQLAlchemy + Celery
    web/          # Frontend: Next.js + TypeScript + Tailwind
  project_assets/ # Insumos del proyecto (diagramas, docs)
  storage/        # Archivos subidos (solo dev)
```

### Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Celery
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Base de datos**: PostgreSQL 16
- **Cola**: Redis 7 + Celery Beat
- **Email**: Mailpit (captura SMTP en dev)
- **IA**: Proveedor mock por defecto (sin API key necesaria)

### Modulos

| Modulo | Descripcion |
|--------|-------------|
| Auth | Login JWT + refresh tokens + RBAC |
| Leads | Intake telefonico y visita |
| Clients | Directorio de clientes + vista 360 |
| Matters | Casos legales (civil, JPL) |
| Proposals | Pipeline comercial con seguimiento 72h |
| Contracts | Flujo contrato + mandato |
| Notary | Documentos notariales con intentos 10/13/17 |
| Case Review | Revision diaria de causas (procurador/abogado) |
| Collections | Facturacion + cobranza + escalamiento |
| Email Tickets | Correos con SLA 24h/48h |
| Scraper | LegalBOT: busqueda de keywords en sitios web |
| AI Assistant | Borradores y resumenes (modo mock) |
| Dashboards | KPIs y metricas por rol |

### Roles RBAC

- SECRETARIA
- ADMINISTRACION
- ABOGADO
- ABOGADO_JEFE
- PROCURADOR
- GERENTE_LEGAL
- JEFE_COBRANZA
- AGENTE_COMERCIAL

### Jobs Programados (Celery Beat)

- Cada 15 min: Verificacion SLA correos (24h/48h)
- Cada hora: Expiracion de propuestas vencidas
- Diario 07:00: Recordatorios de cobranza (5 dias antes)
- Diario 09:00: Tareas de contacto notarial (10:00, 13:00, 17:00)

## Comandos

```bash
make dev          # Levantar servicios
make down         # Detener servicios
make migrate      # Ejecutar migraciones
make seed         # Cargar datos demo
make test         # Ejecutar tests
make lint         # Lint backend
make logs         # Ver logs
make shell-api    # Shell en container API
make shell-web    # Shell en container web
make reset-db     # Reset completo de BD
```

## Variables de Entorno

Ver `.env.example` para todas las variables disponibles. Las principales:

- `DATABASE_URL`: Conexion PostgreSQL
- `REDIS_URL`: Conexion Redis
- `JWT_SECRET_KEY`: Clave secreta JWT (cambiar en produccion)
- `AI_PROVIDER`: mock | openai | anthropic
- `SCRAPER_MODE`: mock | live

## Project Assets

La carpeta `/project_assets/` contiene documentacion del proyecto:
- `/processes/`: Diagramas BPMN y flujos
- `/screenshots/`: Capturas de referencia
- `/docs/`: PDFs y documentacion adicional
- `/templates_samples/`: Ejemplos de contratos y propuestas
- `/branding/`: Logos y paleta de colores

En desarrollo es una carpeta local. En produccion se usaria un bucket o drive.

Los insumos originales del proyecto se encuentran en `/insumos/` (diagramas Bizagi de los 9 flujos de trabajo).

## Supuestos

Ver [ASSUMPTIONS.md](./ASSUMPTIONS.md) para todos los supuestos del MVP.

## Seguridad

Ver [SECURITY.md](./SECURITY.md) para detalles de autenticacion, RBAC y auditoria.
