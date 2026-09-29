#!/usr/bin/env bash
# Exit immediately if any command returns a non-zero exit code
set -o errexit

echo "=========================================="
echo "Step 1: Building React Vite Frontend"
echo "=========================================="
cd frontend
npm install
npm run build
cd ..

echo "=========================================="
echo "Step 2: Installing Python Backend Dependencies"
echo "=========================================="
cd backend
pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "=========================================="
echo "Build Finished Successfully!"
echo "=========================================="
