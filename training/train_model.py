import os
import pandas as pd
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
from optimum.onnxruntime import ORTModelForSequenceClassification
from optimum.exporters.onnx import export
from pathlib import Path
import shutil

# --- CONFIGURATION ---
MODEL_NAME = "prajjwal1/bert-tiny" # Modèle ultra-léger (<20 Mo), idéal pour extension
DATASET_FILE = "stripchat_training_data.csv"
OUTPUT_DIR = "./output_model"
FINAL_ONNX_DIR = "../public/model"

def train():
    print("📂 Chargement du dataset...")
    df = pd.read_csv(DATASET_FILE).dropna()
    
    # Conversion labels: clean -> 0, neutral -> 1, toxic -> 2
    # On gère le cas où "neutral" n'existe pas encore dans le CSV en utilisant fillna ou une map robuste
    label_map = {'clean': 0, 'neutral': 1, 'toxic': 2}
    df['label'] = df['label'].map(label_map)
    
    # Suppression des lignes dont le label n'a pas été reconnu (sécurité)
    df = df.dropna(subset=['label'])
    df['label'] = df['label'].astype(int)
    
    # Conversion en format Hugging Face
    dataset = Dataset.from_pandas(df)
    dataset = dataset.train_test_split(test_size=0.1)

    print(f"🔤 Initialisation du tokenizer ({MODEL_NAME})...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)

    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    print("🧠 Début du Fine-Tuning intensif (3 classes)...")
    # On définit explicitement les labels pour Transformers.js
    id2label = {0: "clean", 1: "neutral", 2: "toxic"}
    label2id = {"clean": 0, "neutral": 1, "toxic": 2}
    
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME, 
        num_labels=3,
        id2label=id2label,
        label2id=label2id
    )

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        eval_strategy="epoch", # Corrigé
        learning_rate=5e-5, # Augmenté
        per_device_train_batch_size=16,
        num_train_epochs=10, # Augmenté
        weight_decay=0.01,
        logging_steps=10,
        save_strategy="no" # On ne sauvegarde que le résultat final
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["test"],
    )

    trainer.train()
    
    # SAUVEGARDE DU MODELE ENTRAINE
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    print("💾 Exportation au format ONNX pour l'extension...")
    
    # Nettoyage du dossier de destination
    if os.path.exists(FINAL_ONNX_DIR):
        shutil.rmtree(FINAL_ONNX_DIR)
    os.makedirs(FINAL_ONNX_DIR)

    # Export ONNX à partir du modèle QUE NOUS AVONS ENTRAÎNÉ (OUTPUT_DIR)
    onnx_model = ORTModelForSequenceClassification.from_pretrained(OUTPUT_DIR, export=True)
    
    # Création de la structure attendue par Transformers.js
    onnx_path = Path(FINAL_ONNX_DIR) / "onnx"
    onnx_path.mkdir(parents=True, exist_ok=True)
    
    onnx_model.save_pretrained(FINAL_ONNX_DIR)
    # Déplacement manuel du fichier onnx s'il n'est pas au bon endroit
    generated_onnx = Path(FINAL_ONNX_DIR) / "model.onnx"
    if generated_onnx.exists():
        generated_onnx.rename(onnx_path / "model.onnx")
        
    tokenizer.save_pretrained(FINAL_ONNX_DIR)

    # Renommage spécifique pour Transformers.js si nécessaire (souvent model.onnx)
    print(f"\n✅ IA experte déployée dans : {FINAL_ONNX_DIR}")
    print("👉 Vous pouvez maintenant relancer le build de l'extension.")

if __name__ == "__main__":
    train()