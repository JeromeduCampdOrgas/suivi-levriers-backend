// src/services/icadExtractor.service.ts

/**
 * Extraction des données ICAD à partir d'un texte OCR.
 *
 * Principe :
 * OCR → normalisation → recherche des libellés → extraction des valeurs
 * → score de confiance → validation humaine avant enregistrement.
 *
 * IMPORTANT :
 * Les données OCR ne doivent jamais être enregistrées directement
 * en base sans validation humaine.
 */

export interface IcadField<T = string> {
  value?: T;
  confidence: number;
}

export interface IcadData {
  nom: IcadField;
  prenom: IcadField;
  sexe: IcadField;
  dateNaissance: IcadField;
  race: IcadField;
  couleur: IcadField;
  paysNaissance: IcadField;
  numeroIdentification: IcadField;
  dateIdentification: IcadField;
}

export interface IcadExtractionResult {
  data: IcadData;
  rawText: string;
  normalizedText: string;
}

/* ============================================================
 * LIBELLÉS ICAD
 * ========================================================== */

const LABELS = {
  nom: ["NOM", "NOM DU CHIEN", "NOM DE L ANIMAL"],

  prenom: ["PRENOM", "PRÉNOM"],

  sexe: ["SEXE"],

  dateNaissance: ["DATE DE NAISSANCE", "DATE NAISSANCE"],

  race: ["RACE", "ESPECE RACE", "ESPÈCE RACE"],

  couleur: ["COULEUR", "ROBE"],

  paysNaissance: ["PAYS DE NAISSANCE", "PAYS NAISSANCE"],

  numeroIdentification: [
    "NUMERO D IDENTIFICATION",
    "NUMÉRO D IDENTIFICATION",
    "N IDENTIFICATION",
    "NO IDENTIFICATION",
    "N° IDENTIFICATION",
  ],

  dateIdentification: ["DATE D IDENTIFICATION", "DATE IDENTIFICATION"],
} as const;

/**
 * Fragments observés directement dans les OCR fournis.
 *
 * Certains textes sont tellement déformés par l'OCR qu'il est
 * impossible de retrouver le libellé français classique.
 *
 * On conserve donc quelques signatures connues.
 */
const REVERSED_LABELS: Partial<Record<keyof typeof LABELS, readonly string[]>> =
  {
    nom: ["YNALN213G N3IHD", "YNALN213G N3IHD"],

    sexe: ["J1VH 3X3S", "J1VH3X3S"],

    dateNaissance: [
      "OTOZ/VO/ET ZONVSSIVN 39 3LVG",
      "OTOZ VO ET ZONVSSIVN 39 3LVG",
    ],

    numeroIdentification: [
      "YVT1350 INOTIVIOVUYL 3WNW",
      "YVT1350 INOTIVIOVUYL 3WNW",
      "NOILVIIHILN3GI",
    ],

    paysNaissance: ["EUSEDS3 JINVSSIVN 30 SAVD", "EUSEDS3 JINVSSIVN 30 SAVD"],
  };

/* ============================================================
 * NORMALISATION
 * ========================================================== */

/**
 * Normalisation générale du texte OCR.
 *
 * Objectifs :
 * - uniformiser les accents
 * - passer en majuscules
 * - uniformiser les apostrophes
 * - supprimer les caractères parasites
 * - réduire les espaces multiples
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[’`´]/g, "'")
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ")
    .trim();
}
function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
}
/**
 * Normalisation destinée aux comparaisons approximatives.
 */
function normalizeForComparison(text: string): string {
  return normalizeText(text)
    .replace(/['".,:;!?()[\]{}<>]/g, " ")
    .replace(/[-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================================================
 * DISTANCE / SIMILARITÉ
 * ========================================================== */

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const normalizedA = normalizeForComparison(a);
  const normalizedB = normalizeForComparison(b);

  if (!normalizedA || !normalizedB) {
    return 0;
  }

  if (normalizedA === normalizedB) {
    return 1;
  }

  const distance = levenshtein(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  if (maxLength === 0) {
    return 1;
  }

  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Nettoie un libellé OCR avant comparaison.
 */
function normalizeOcrLabel(text: string): string {
  return normalizeForComparison(text);
}

/* ============================================================
 * RECHERCHE DE LIBELLÉS
 * ========================================================== */

interface LabelMatch {
  label: string;
  index: number;
  confidence: number;
  reversed?: boolean;
  lineIndex?: number;
}

/**
 * Recherche d'un libellé classique.
 */
function findLabel(text: string, labels: readonly string[]): LabelMatch | null {
  const normalizedText = normalizeOcrLabel(text);

  let bestMatch: LabelMatch | null = null;

  for (const label of labels) {
    const normalizedLabel = normalizeOcrLabel(label);

    if (!normalizedLabel) {
      continue;
    }

    const exactIndex = normalizedText.indexOf(normalizedLabel);

    if (exactIndex !== -1) {
      return {
        label: normalizedLabel,
        index: exactIndex,
        confidence: 1,
      };
    }

    /*
     * Recherche approximative par fenêtres.
     *
     * Cela permet de reconnaître par exemple :
     * "PREN0M", "PRENOMM", etc.
     */
    const words = normalizedText.split(" ");

    for (let i = 0; i < words.length; i++) {
      for (let size = 1; size <= 6 && i + size <= words.length; size++) {
        const candidate = words.slice(i, i + size).join(" ");

        const score = similarity(candidate, normalizedLabel);

        if (score >= 0.82) {
          const candidateIndex = normalizedText.indexOf(candidate);

          if (!bestMatch || score > bestMatch.confidence) {
            bestMatch = {
              label: candidate,
              index: candidateIndex,
              confidence: score,
            };
          }
        }
      }
    }
  }

  return bestMatch;
}
function isValidIdentificationLabel(match: LabelMatch): boolean {
  const label = normalizeOcrLabel(match.label);

  /*
   * Un vrai libellé de numéro d'identification doit contenir
   * explicitement une référence au numéro :
   *
   * NUMERO D IDENTIFICATION
   * NUMERO IDENTIFICATION
   * N IDENTIFICATION
   * NO IDENTIFICATION
   *
   * On refuse notamment :
   * D IDENTIFICATION
   * DATE D IDENTIFICATION
   *
   * afin d'éviter les faux positifs liés à la recherche
   * approximative.
   */
  return (
    label.startsWith("NUMERO ") ||
    label.startsWith("N IDENTIFICATION") ||
    label.startsWith("NO IDENTIFICATION")
  );
}
/**
 * Recherche d'un libellé correspondant aux signatures OCR inversées.
 */
function findReversedLabel(
  text: string,
  labels: readonly string[]
): LabelMatch | null {
  const normalizedText = normalizeOcrLabel(text);

  let bestMatch: LabelMatch | null = null;

  for (const label of labels) {
    const normalizedLabel = normalizeOcrLabel(label);

    if (!normalizedLabel) {
      continue;
    }

    const exactIndex = normalizedText.indexOf(normalizedLabel);

    if (exactIndex !== -1) {
      return {
        label: normalizedLabel,
        index: exactIndex,
        confidence: 0.92,
        reversed: true,
      };
    }

    /*
     * Pour les libellés très déformés, on utilise une recherche
     * approximative plus tolérante.
     */
    const score = similarity(normalizedText, normalizedLabel);

    if (score >= 0.75) {
      bestMatch = {
        label: normalizedLabel,
        index: 0,
        confidence: Math.min(score, 0.9),
        reversed: true,
      };
    }
  }

  return bestMatch;
}

/**
 * Recherche classique + signatures OCR connues.
 */
function findIcadLabel<K extends keyof typeof LABELS>(
  text: string,
  field: K
): LabelMatch | null {
  const normalMatch = findLabel(text, LABELS[field]);

  if (normalMatch) {
    if (
      field === "numeroIdentification" &&
      !isValidIdentificationLabel(normalMatch)
    ) {
      // On ignore les faux positifs.
    } else {
      return normalMatch;
    }
  }

  const reversedLabels = REVERSED_LABELS[field];

  if (reversedLabels) {
    const reversedLineMatch = findReversedLabelOnLines(text, reversedLabels);

    if (reversedLineMatch) {
      return reversedLineMatch;
    }

    return findReversedLabel(text, reversedLabels);
  }

  return null;
}

/* ============================================================
 * NETTOYAGE DES VALEURS
 * ========================================================== */

function cleanValue(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,\-|]+/, "")
    .replace(/[\s:;,\-|]+$/, "")
    .trim();
}

/* ============================================================
 * DATES
 * ========================================================== */

function normalizeDate(value: string): string | undefined {
  const cleaned = value.replace(/\s+/g, "").replace(/[.\-]/g, "/");

  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return undefined;
  }

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];

  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return undefined;
  }

  return `${day}/${month}/${year}`;
}

/**
 * Recherche d'une date dans un texte.
 */
function extractDate(text: string): string | undefined {
  /*
   * Formats acceptés :
   *
   * 12/05/2021
   * 12 / 05 / 2021
   * 12-05-2021
   * 12 - 05 - 2021
   * 12.05.2021
   * 12 05 2021
   */
  const match = text.match(
    /\b(\d{1,2})\s*[\/.\- ]\s*(\d{1,2})\s*[\/.\- ]\s*(\d{4})\b/
  );

  if (!match) {
    return undefined;
  }

  return normalizeDate(`${match[1]}/${match[2]}/${match[3]}`);
}

/* ============================================================
 * NUMÉRO D'IDENTIFICATION ICAD
 * ========================================================== */

/**
 * Un numéro ICAD comporte normalement 15 chiffres.
 *
 * On accepte aussi :
 * 250 1234 5678 9012
 * 250-1234-5678-9012
 * etc.
 */
function extractIdentificationCandidates(text: string): Array<{
  value: string;
  originalNormalized: string;
}> {
  const matches = text.match(
    /(?<!\d)(?:\d[\d .\-]{13,25}\d)(?!\d)|(?<!\d)\d{15}(?!\d)/g
  );

  if (!matches) {
    return [];
  }

  const candidates: Array<{
    value: string;
    originalNormalized: string;
  }> = [];

  for (const match of matches) {
    const digits = match.replace(/\D/g, "");

    if (digits.length !== 15) {
      continue;
    }

    candidates.push({
      value: digits,
      originalNormalized: normalizeText(match),
    });
  }

  return candidates;
}

/**
 * Extraction sécurisée du numéro ICAD.
 *
 * V3.1 bis :
 *
 * - recherche de séquences contenant exactement 15 chiffres ;
 * - priorité aux numéros proches d'un libellé d'identification ;
 * - aucune concaténation de nombres provenant de zones différentes ;
 * - si aucun contexte n'est trouvé, le premier candidat est conservé.
 *
 * La confiance est calculée dans extractIcadData().
 */
function extractIdentificationNumber(text: string): string | undefined {
  const normalized = normalizeText(text);

  const candidates = extractIdentificationCandidates(text);

  if (candidates.length === 0) {
    return undefined;
  }

  /*
   * Libellés pouvant indiquer une zone d'identification.
   *
   * Les signatures OCR inversées observées sur les cartes
   * sont également prises en compte.
   */
  const identificationContexts = [
    "NUMERO D IDENTIFICATION",
    "NUMERO IDENTIFICATION",
    "NUMERO DE IDENTIFICATION",
    "NUMERO DIDENTIFICATION",
    "N IDENTIFICATION",
    "NO IDENTIFICATION",
    "YVT1350 INOTIVIOVUYL 3WNW",
    "NOILVIIHILN3GI",
  ];

  /*
   * Recherche du candidat le plus proche d'un contexte
   * d'identification.
   */
  let bestCandidate:
    | {
        value: string;
        distance: number;
      }
    | undefined;

  for (const candidate of candidates) {
    const candidateIndex = normalized.indexOf(candidate.originalNormalized);

    if (candidateIndex === -1) {
      continue;
    }

    for (const context of identificationContexts) {
      const contextIndex = normalized.indexOf(context);

      if (contextIndex === -1) {
        continue;
      }

      const distance = Math.abs(candidateIndex - contextIndex);

      if (!bestCandidate || distance < bestCandidate.distance) {
        bestCandidate = {
          value: candidate.value,
          distance,
        };
      }
    }
  }

  /*
   * Un candidat associé à un contexte d'identification
   * est prioritaire.
   */
  if (bestCandidate) {
    return bestCandidate.value;
  }

  /*
   * Aucun contexte identifié.
   *
   * On conserve le candidat pour permettre à la couche
   * supérieure de décider de son niveau de confiance.
   */
  return candidates[0].value;
}

/* ============================================================
 * SEXE
 * ========================================================== */

function extractSexe(text: string): IcadField {
  const normalized = normalizeText(text);

  if (/\bFEMELLE\b/.test(normalized) || /\bFEMEL\b/.test(normalized)) {
    return {
      value: "F",
      confidence: 0.95,
    };
  }

  if (/\bMALE\b/.test(normalized) || /\bMAL\b/.test(normalized)) {
    return {
      value: "M",
      confidence: 0.95,
    };
  }

  /*
   * Cas où l'OCR produit directement F ou M.
   */
  const tokens = normalized.split(/\s+/);

  if (tokens.includes("F")) {
    return {
      value: "F",
      confidence: 0.95,
    };
  }

  if (tokens.includes("M")) {
    return {
      value: "M",
      confidence: 0.95,
    };
  }

  /*
   * Signature OCR connue sur la première carte.
   * Le libellé SEXE semble avoir été fortement déformé,
   * mais il ne permet pas à lui seul de déterminer F ou M.
   */
  if (normalized.includes("J1VH 3X3S") || normalized.includes("J1VH3X3S")) {
    return {
      confidence: 0,
    };
  }

  return {
    confidence: 0,
  };
}

/* ============================================================
 * EXTRACTION DE CHAMPS TEXTE
 * ========================================================== */

/**
 * Extraction du texte situé après un libellé.
 *
 * Cette fonction est conservée pour compatibilité et peut être
 * utilisée pour les champs classiques.
 */
function extractAfterLabel(
  text: string,
  match: LabelMatch,
  maxLength = 80
): string | undefined {
  const normalized = normalizeText(text);

  /*
   * On recherche le libellé normalisé dans le texte normalisé.
   */
  const index = normalized.indexOf(normalizeText(match.label));

  if (index === -1) {
    return undefined;
  }

  const start = index + normalizeText(match.label).length;

  const value = normalized
    .slice(start, start + maxLength)
    .split(/\n/)
    .shift();

  if (!value) {
    return undefined;
  }

  return cleanValue(value);
}

/**
 * Extraction d'un champ texte avec arrêt lorsqu'on rencontre
 * un autre libellé ICAD connu.
 */
function extractTextField(text: string, field: keyof typeof LABELS): IcadField {
  const normalized = normalizeText(text);

  const match = findIcadLabel(text, field);

  if (!match) {
    return {
      confidence: 0,
    };
  }

  /*
   * Les signatures OCR inversées ne permettent pas toujours
   * d'identifier précisément la position de la valeur.
   *
   * On ne tente l'extraction automatique que pour les libellés
   * classiques.
   */
  if (match.reversed) {
    return {
      confidence: Math.min(match.confidence, 0.55),
    };
  }

  const label = normalizeText(match.label);

  const index = normalized.indexOf(label);

  if (index === -1) {
    return {
      confidence: 0,
    };
  }

  let value = normalized.slice(index + label.length).trim();

  /*
   * Retirer séparateurs courants.
   */
  value = value.replace(/^[\s:;,\-|]+/, "");

  /*
   * Arrêt sur les prochains champs connus.
   */
  const nextLabels: string[] = [];

  for (const fieldLabels of Object.values(LABELS)) {
    for (const item of fieldLabels) {
      nextLabels.push(normalizeText(item));
    }
  }

  let endIndex = value.length;

  for (const nextLabel of nextLabels) {
    if (!nextLabel || nextLabel === label) {
      continue;
    }

    const nextIndex = value.indexOf(nextLabel);

    if (nextIndex !== -1 && nextIndex < endIndex) {
      endIndex = nextIndex;
    }
  }

  value = value.slice(0, endIndex).trim();

  /*
   * Évite de récupérer plusieurs centaines de caractères
   * lorsque l'OCR est mauvais.
   */
  if (value.length > 100) {
    value = value.slice(0, 100);
  }

  value = cleanValue(value);

  if (!value) {
    return {
      confidence: 0,
    };
  }

  return {
    value,
    confidence: match.confidence,
  };
}

/* ============================================================
 * PAYS DE NAISSANCE
 * ========================================================== */

function extractPaysNaissance(text: string): IcadField {
  const normalized = normalizeText(text);

  /*
   * Recherche du libellé classique.
   */
  const match = findLabel(normalized, LABELS.paysNaissance);

  if (match) {
    const label = normalizeText(match.label);
    const index = normalized.indexOf(label);

    if (index !== -1) {
      let value = normalized.slice(index + label.length).trim();

      /*
       * Arrêt sur un prochain champ connu.
       */
      const nextLabels = [
        ...LABELS.nom,
        ...LABELS.prenom,
        ...LABELS.sexe,
        ...LABELS.dateNaissance,
        ...LABELS.race,
        ...LABELS.couleur,
        ...LABELS.numeroIdentification,
        ...LABELS.dateIdentification,
      ].map(normalizeText);

      let endIndex = value.length;

      for (const nextLabel of nextLabels) {
        const nextIndex = value.indexOf(nextLabel);

        if (nextIndex !== -1 && nextIndex < endIndex) {
          endIndex = nextIndex;
        }
      }

      value = cleanValue(value.slice(0, endIndex));

      if (value) {
        return {
          value,
          confidence: match.confidence,
        };
      }
    }
  }

  /*
   * Signature OCR connue sur la carte 2.
   *
   * Le texte contient bien une référence à "PAYS DE NAISSANCE",
   * mais la valeur qui suit n'est pas suffisamment fiable.
   *
   * On retourne donc seulement une confiance faible sans inventer
   * le pays.
   */
  if (normalized.includes("EUSEDS3 JINVSSIVN 30 SAVD")) {
    return {
      confidence: 0.45,
    };
  }

  return {
    confidence: 0,
  };
}

/* ============================================================
 * EXTRACTION PRINCIPALE
 * ========================================================== */

export function extractIcadData(rawText: string): IcadExtractionResult {
  const normalizedText = normalizeText(rawText);

  /*
   * Nom
   */
  let nom: IcadField = extractTextField(normalizedText, "nom");

  const nomLabel = findIcadLabel(rawText, "nom");

  if (nomLabel?.reversed && nomLabel.lineIndex !== undefined) {
    const lines = normalizeLines(rawText);
    const valueLine = lines[nomLabel.lineIndex + 1];

    if (valueLine) {
      nom = {
        value: valueLine,
        confidence: Math.min(0.95, nomLabel.confidence),
      };
    }
  }

  /*
   * Prénom
   */
  const prenom = extractTextField(normalizedText, "prenom");

  /*
   * Sexe
   */
  const sexe = extractSexe(normalizedText);

  /*
   * Date de naissance
   *
   * On privilégie la date située dans le contexte du libellé.
   * Si elle n'est pas identifiable, on cherche une date globale.
   */
  let dateNaissance: IcadField = { confidence: 0 };
  const dateNaissanceLabel = findIcadLabel(rawText, "dateNaissance");

  if (dateNaissanceLabel) {
    let context = normalizedText;

    if (dateNaissanceLabel.lineIndex !== undefined) {
      const lines = normalizeLines(rawText);
      const start = Math.max(0, dateNaissanceLabel.lineIndex);
      const end = Math.min(lines.length, dateNaissanceLabel.lineIndex + 3);

      context = lines.slice(start, end).join(" ");
    } else if (dateNaissanceLabel.index !== -1) {
      context = normalizedText.slice(
        dateNaissanceLabel.index,
        dateNaissanceLabel.index + 100
      );
    }

    const date = extractDate(context);

    if (date) {
      dateNaissance = {
        value: date,
        confidence: Math.min(0.95, dateNaissanceLabel.confidence),
      };
    }
  }

  /*
   * Fallback : première date trouvée.
   */
  if (!dateNaissance.value) {
    const date = extractDate(normalizedText);

    if (date) {
      dateNaissance = {
        value: date,
        confidence: 0.55,
      };
    }
  }

  /*
   * Race
   */
  const race = extractTextField(normalizedText, "race");

  /*
   * Couleur
   */
  const couleur = extractTextField(normalizedText, "couleur");

  /*
   * Pays de naissance
   */
  const paysNaissance = extractPaysNaissance(normalizedText);

  /*
   * ==========================================================
   * Numéro d'identification
   *
   * V3.1 bis
   *
   * La fiabilité dépend du contexte dans lequel le numéro
   * de 15 chiffres est trouvé.
   *
   * - Libellé + numéro dans le contexte → confiance élevée
   * - Numéro trouvé sans libellé → confiance faible
   *
   * Un numéro trouvé seul ne doit jamais être considéré comme
   * une identification ICAD fiable.
   * ==========================================================
   */
  let numeroIdentification: IcadField = {
    confidence: 0,
  };

  const identificationLabel = findIcadLabel(rawText, "numeroIdentification");

  if (identificationLabel) {
    const identification = extractIdentificationNumber(rawText);

    if (identification) {
      numeroIdentification = {
        value: identification,
        confidence: Math.min(0.95, identificationLabel.confidence),
      };
    }
  }

  /*
   * ==========================================================
   * FALLBACK
   *
   * Un numéro de 15 chiffres existe dans le document,
   * mais aucun contexte d'identification fiable n'a été trouvé.
   *
   * On conserve éventuellement la valeur comme candidat,
   * mais avec une confiance faible.
   * ==========================================================
   */
  if (!numeroIdentification.value) {
    const identification = extractIdentificationNumber(rawText);

    if (identification) {
      numeroIdentification = {
        value: identification,
        confidence: 0.55,
      };
    }
  }

  /*
   * Date d'identification
   */
  let dateIdentification: IcadField = {
    confidence: 0,
  };

  const dateIdentificationLabel = findIcadLabel(rawText, "dateIdentification");

  if (dateIdentificationLabel) {
    const labelIndex = dateIdentificationLabel.index;

    if (labelIndex !== -1) {
      const context = normalizedText.slice(labelIndex, labelIndex + 100);

      const date = extractDate(context);

      if (date) {
        dateIdentification = {
          value: date,
          confidence: dateIdentificationLabel.confidence,
        };
      }
    }
  }

  /*
   * Retour final.
   */
  return {
    data: {
      nom,
      prenom,
      sexe,
      dateNaissance,
      race,
      couleur,
      paysNaissance,
      numeroIdentification,
      dateIdentification,
    },

    rawText,

    normalizedText,
  };
}

/* ============================================================
 * VERSION SIMPLIFIÉE
 * ========================================================== */

/**
 * Retourne uniquement les valeurs utiles.
 *
 * Cette fonction est conservée pour simplifier l'utilisation
 * du service dans les contrôleurs/routes.
 */
export function extractIcadValues(rawText: string) {
  const result = extractIcadData(rawText);

  return {
    nom: result.data.nom.value,

    prenom: result.data.prenom.value,

    sexe: result.data.sexe.value,

    dateNaissance: result.data.dateNaissance.value,

    race: result.data.race.value,

    couleur: result.data.couleur.value,

    paysNaissance: result.data.paysNaissance.value,

    numeroIdentification: result.data.numeroIdentification.value,

    dateIdentification: result.data.dateIdentification.value,
  };
}
function findReversedLabelOnLines(
  text: string,
  labels: readonly string[]
): (LabelMatch & { lineIndex: number }) | null {
  const lines = normalizeLines(text);

  let bestMatch: (LabelMatch & { lineIndex: number }) | null = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    for (const label of labels) {
      const normalizedLabel = normalizeOcrLabel(label);
      if (!normalizedLabel) continue;

      const index = line.indexOf(normalizedLabel);

      if (index !== -1) {
        return {
          label: normalizedLabel,
          index,
          confidence: 0.92,
          reversed: true,
          lineIndex,
        };
      }

      const score = similarity(line, normalizedLabel);

      if (score >= 0.75) {
        if (!bestMatch || score > bestMatch.confidence) {
          bestMatch = {
            label: normalizedLabel,
            index,
            confidence: Math.min(score, 0.9),
            reversed: true,
            lineIndex,
          };
        }
      }
    }
  }

  return bestMatch;
}
function getLinesAround(text: string, lineIndex: number, radius = 1): string[] {
  const lines = normalizeLines(text);

  const start = Math.max(0, lineIndex - radius);
  const end = Math.min(lines.length, lineIndex + radius + 1);

  return lines.slice(start, end);
}
