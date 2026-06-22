.PHONY: install dev db-init test docker-up docker-down

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
db-init:
	python scripts/init_db.py

test:
	pytest -v

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
