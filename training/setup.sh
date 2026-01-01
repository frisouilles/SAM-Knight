#!/bin/bash

# Arrêt sur erreur
set -e

echo "🔧 Setup Python Virtual Environment..."

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ venv created."
fi

source venv/bin/activate

echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "🚀 Running Training Script..."
python train_model.py

echo "✅ Done."
