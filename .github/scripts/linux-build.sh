#!/bin/bash
set -e

cd /app

npm install
npm run build -- --linux --config.productName="$BUILD_PRODUCT_NAME"
