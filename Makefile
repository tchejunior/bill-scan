REPO := /home/jarvis/recibo42

.PHONY: deploy pull build migrate restart

deploy: pull build migrate fix-perms restart
	@echo "Deployment complete."

pull:
	git -C $(REPO) pull

build:
	cd $(REPO) && docker compose build api worker

migrate:
	cd $(REPO) && docker compose run --rm --no-deps api alembic upgrade head

fix-perms:
	sudo chown -R 1000:1000 /var/lib/docker/volumes/recibo42_receipt_images/_data

restart:
	cd $(REPO) && docker compose up -d api worker postgres redis
