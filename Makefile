.PHONY: dev down migrate seed test lint format

# Start all services
dev:
	docker-compose up --build

# Stop all services
down:
	docker-compose down

# Run database migrations
migrate:
	docker-compose exec api alembic upgrade head

# Seed database with demo data
seed:
	docker-compose exec api python -m app.db.seed

# Run backend tests
test:
	docker-compose exec api pytest tests/ -v

# Lint backend
lint:
	docker-compose exec api ruff check app/

# Format backend
format:
	docker-compose exec api ruff format app/

# Create a new migration
migration:
	docker-compose exec api alembic revision --autogenerate -m "$(msg)"

# Reset database (drop + recreate + migrate + seed)
reset-db:
	docker-compose exec api python -c "from app.core.database import engine; from app.db.base import Base; Base.metadata.drop_all(engine); print('Dropped all tables')"
	$(MAKE) migrate
	$(MAKE) seed

# View logs
logs:
	docker-compose logs -f

# View API logs only
logs-api:
	docker-compose logs -f api

# Shell into API container
shell-api:
	docker-compose exec api bash

# Shell into web container
shell-web:
	docker-compose exec web sh
