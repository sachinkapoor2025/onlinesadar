.PHONY: build-ApiFunction build-ReviewEmailsCronFunction api-deps api-bundle

api-deps:
	npm ci
	npm run build -w @hr-ecom/shared

api-bundle: api-deps
	npx esbuild apps/api/src/index.ts \
		--bundle \
		--platform=node \
		--target=es2022 \
		--minify \
		--outfile=$(ARTIFACTS_DIR)/index.js \
		--external:@aws-sdk/client-dynamodb \
		--external:@aws-sdk/lib-dynamodb \
		--external:@aws-sdk/client-s3 \
		--external:@aws-sdk/s3-request-presigner
	npx esbuild apps/api/src/scheduled.ts \
		--bundle \
		--platform=node \
		--target=es2022 \
		--minify \
		--outfile=$(ARTIFACTS_DIR)/scheduled.js \
		--external:@aws-sdk/client-dynamodb \
		--external:@aws-sdk/lib-dynamodb \
		--external:@aws-sdk/client-s3 \
		--external:@aws-sdk/s3-request-presigner

build-ApiFunction: api-bundle

build-ReviewEmailsCronFunction: api-bundle
