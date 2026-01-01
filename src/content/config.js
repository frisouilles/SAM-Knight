export const VERSION = "1.0.0";
export const CONFIRM_KEYWORDS = ["Mute", "Exclure", "Confirm", "Yes", "Désactiver"];
export const ACTIVE_LEAGUES = ["color-league-grey"];
export const LEAGUES = [
  { id: "color-league-grey", label: "Gry", color: "#aaaaaa" },
  { id: "color-league-bronze", label: "Brz", color: "#cd7f32" },
  { id: "color-league-silver", label: "Sil", color: "#c9e7fe" },
  { id: "color-league-gold", label: "Gld", color: "#ffd700" },
  { id: "color-league-diamond", label: "Dia", color: "#d424ff" },
  { id: "color-league-royal", label: "Ryl", color: "#e54500" },
];

export const LEAGUE_TOLERANCE = {
  "color-league-grey": 0.75,
  "color-league-bronze": 0.82,
  "color-league-silver": 0.85,
  "color-league-gold": 0.90,
  "color-league-diamond": 0.95,
  "color-league-royal": 0.99,
  "default": 0.80
};

export const DEFAULT_NEUTRAL_THRESHOLD = 0.50;
export const DEFAULT_NEUTRAL_ACTION = 'highlight';

export const DEFAULT_WHITELIST = ["petite",
  "bonne", "donne", "sonne", "tonne", "canne", "panne", "vanne", "passe", "basse", "casse", "fasse", "lisse", "masse", "tasse", "lasse", "classe", "pure", "pate", "pote", "rate", "date", "gate", "hote", "note", "vote", "cote", "cure", "mure", "dure", "bure", "sure", "elle", "meme", "pere", "mere", "frere", "assis", "assez", "aussi", "ainsi", "pass", "bass", "mass", "grass", "glass", "class", "duck", "clock", "sock", "rock", "lock", "block", "dock", "beach", "peach", "teach", "reach", "sheet", "shirt", "shot", "shut", "hello", "help", "hell",
];

const BAD_EMOJIS = ["\uD83D\uDD95", "\uD83E\uDD2E", "\uD83E\uDD22", "\uD83D\uDCA9", "\uD83D\uDC80", "\u2620", "\uD83E\uDE78", "\uD83D\uDC89", "\uD83E\uDD21", "\uD83E\uDD2C"];
const BAD_WORDS_FR = ["pute", "salope", "chienne", "conne", "grognasse", "pétasse", "truie", "moche", "thon", "grosse", "bite", "beurette", "suce", "viol", "violer", "avorte", "femelle", "26", "drome", "nègre", "négro", "bougnoule", "niacoué", "bicot", "raton", "babtou", "sale noir", "sale arabe", "sale juif", "yolf", "feuj", "pd", "pédale", "tapette", "enculé", "goudou", "tranny", "travelo", "sodomite", "origine", "pedo", "pedophile", "pédophile", "cp", "enfant", "gamine", "mineur", "mineure", "lolita", "preteen", "collegienne", "jeunette", "scato", "pisse", "urine", "uriner", "caca", "chiotte", "toilette", "wc", "golden", "shower", "bouse", "prout", "pet", "zoo", "zoophilie", "animal", "chien", "cheval", "bestialité", "sang", "torture", "snuff", "tuer", "meurtre", "cadavre", "decapitation", "necro", "necrophilie", "tu suces", "tu avales", "montre tes seins", "montre ta chatte", "montre tes pieds", "montre tes fesses", "a poil", "tout nu", "toute nue", "enleve tout", "enleve le bas", "enleve le haut", "enleve ta culotte", "baisse ta culotte", "ecarte", "ecarte les jambes", "ecarte tes fesses", "doigte toi", "touche toi", "branle toi", "vibre", "joue avec", "cam privee", "skype", "whatsapp", "snapchat", "meet", "hangout", "ton num", "ton numero", "ton insta", "ton snap", "rencontre", "baise", "plan cul", "combien pour", "tarifs", "gratos", "gratuit", "free", "fais voir", "montre moi", "allez montre", "sois pas timide", "bouge tes fesses", "penches toi", "tourne toi", "plus bas", "plus haut", "gode", "anal", "sodomie", "gorge profonde", "avale tout", "connard", "fdp", "tg", "abruti", "débile", "mongol", "creve", "mort", "suicide"];
const BAD_WORDS_EN = ["bitch", "slut", "whore", "cunt", "fuck", "fucking", "motherfucker", "asshole", "dick", "cock", "suck", "blowjob", "bastard", "idiot", "stupid", "retard", "show tits", "show boobs", "show bobs", "show pussy", "show ass", "show feet", "naked", "nude", "strip", "take off", "open legs", "spread", "finger", "dildo", "toy", "vibrate", "masturbate", "cum", "squirt", "lower", "turn around", "bend over", "doggy", "anal", "deepthroat", "rape", "blood", "kill", "die", "dead", "murder", "snuff", "animal", "dog", "horse", "child", "kid", "teen", "underage", "minor", "cp"];

export const DEFAULT_BAD_WORDS = BAD_EMOJIS.concat(BAD_WORDS_FR, BAD_WORDS_EN);
export const MUTE_BUTTON_SELECTOR = ".mute-button.mute-button-iconified";
