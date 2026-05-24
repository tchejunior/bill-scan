REPO     := /home/jarvis/recibo42
FRONTEND := $(REPO)/frontend
WEBROOT  := /var/www/recibo42

.PHONY: deploy pull build build-frontend migrate fix-perms restart

deploy: pull build build-frontend migrate fix-perms restart
	@echo "Deployment complete."

pull:
	git -C $(REPO) pull

build:
	cd $(REPO) && docker compose build api worker

build-frontend:
	cd $(FRONTEND) && npm ci --prefer-offline
	cd $(FRONTEND) && npm run build
	cp -r $(FRONTEND)/dist/. $(WEBROOT)/
	sudo systemctl reload nginx

migrate:
	cd $(REPO) && docker compose run --rm --no-deps api alembic upgrade head

fix-perms:
	sudo chown -R 1000:1000 /var/lib/docker/volumes/recibo42_receipt_images/_data

restart:
	cd $(REPO) && docker compose up -d api worker postgres redis
