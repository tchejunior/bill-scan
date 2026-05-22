REPO := /home/jarvis/recibo42

.PHONY: deploy pull build migrate restart

deploy: pull build migrate restart
	@echo "Deployment complete."

pull:
	git -C $(REPO) pull

build:
	cd $(REPO) && docker compose build api worker

migrate:
	cd $(REPO) && docker compose run --rm --no-deps api alembic upgrade head

restart:
	cd $(REPO) && docker compose up -d api worker postgres redis
