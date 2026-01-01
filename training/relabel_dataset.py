import pandas as pd
import re

# Fichier
DATASET_FILE = "training/stripchat_training_data.csv"

# --- LISTES DE MOTS-CLÉS ---

# TOXIC : Insultes, hard, racisme, violence
TOXIC_KEYWORDS = [
    "pute", "salope", "chienne", "conne", "connasse", "grognasse", "pétasse", "truie", 
    "moche", "thon", "grosse", "vache", 
    "bite", "chatte", "queue", "zizi", "fesse", "cul", "anal", "sodomie", 
    "suce", "avale", "gorge", "bouche", "enculé", "baise", "baiser", "levrette",
    "viol", "violer", "tuer", "meurtre", "crève", "suicide", "mort",
    "nègre", "négro", "bougnoule", "bicot", "youpin", "feuj", "pd", "pédale", "tapette", "gouine",
    "scato", "pisse", "urine", "caca", "merde",
    "bitch", "slut", "whore", "cunt", "fuck", "dick", "cock", "pussy", "asshole"
]

# NEUTRAL : Spam soft, réseaux sociaux, demandes privées, infos persos, fétichisme soft
NEUTRAL_KEYWORDS = [
    "snap", "insta", "whatsapp", "skype", "telegram", "kik", "facebook", "twitter", "onlyfans", "mym",
    "pv", "privé", "prive", "message", "dm", "mp",
    "numéro", "numero", "tel", "téléphone", "telephone", "06", "07",
    "combien", "prix", "tarif", "coute", "coûte", "payant", "gratuit", "free", "jetons", "tokens", "argent", "euros",
    "ville", "habites", "departement", "région", "pays", "d'où", "dou", "viens tu",
    "age", "âge", "vieille", "jeune", "mineur", "ecole", "lycée", "college",
    "montre", "voir", "fais voir", "enleve", "retire", "bas", "haut",
    "pieds", "feet", "aisselles", "nombril", "doigts", "mains",
    "rencontre", "rdv", "voir en vrai", "réel", "reel",
    "tu as un copain", "mari", "seule", "celibataire",
    "cam", "webcam", "show"
]

def normalize(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    # Remplacements basiques pour leetspeak
    text = text.replace("0", "o").replace("1", "i").replace("3", "e").replace("@", "a").replace("$", "s")
    return text

def classify_message(row):
    text = normalize(row['text'])
    original_label = row['label']
    
    # 1. Vérification TOXIC (Priorité absolue)
    for word in TOXIC_KEYWORDS:
        # Recherche mot entier ou partiel significatif
        if word in text:
            # Petite exception pour éviter les faux positifs (ex: "anal" dans "analyse" -> non, ici on fait simple)
            # Pour l'instant on bourrine un peu, c'est du pre-labeling
            return "toxic"
            
    # 2. Vérification NEUTRAL
    for word in NEUTRAL_KEYWORDS:
        if word in text:
            return "neutral"
            
    # 3. Fallback : On garde l'original, sauf si c'était "toxic" mais qu'on a rien trouvé de flagrant
    # (Optionnel : on pourrait dégrader "toxic" en "neutral" si pas de mot clé, mais risqué)
    # On va assumer que si c'était marqué "toxic" manuellement, ça le reste.
    # Si c'était "clean" et qu'on a rien trouvé, ça reste "clean".
    
    return original_label

def main():
    print(f"🔄 Chargement de {DATASET_FILE}...")
    try:
        df = pd.read_csv(DATASET_FILE)
    except FileNotFoundError:
        print("❌ Fichier introuvable.")
        return

    print("📊 Statistiques avant :")
    print(df['label'].value_counts())

    print("⚙️ Re-classification en cours...")
    df['new_label'] = df.apply(classify_message, axis=1)
    
    # On compare
    changes = df[df['label'] != df['new_label']]
    print(f"📝 {len(changes)} labels modifiés.")
    
    if len(changes) > 0:
        print("\nExemples de changements :")
        print(changes[['text', 'label', 'new_label']].head(10))

    # Application
    df['label'] = df['new_label']
    df = df.drop(columns=['new_label'])

    # Sauvegarde
    df.to_csv(DATASET_FILE, index=False)
    print("\n✅ Fichier sauvegardé avec les nouveaux labels.")
    print("📊 Statistiques après :")
    print(df['label'].value_counts())

if __name__ == "__main__":
    main()
