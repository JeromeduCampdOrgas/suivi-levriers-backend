// src/services/icadExtractor.service.ts

/**
 * Extraction des données ICAD à partir d'un texte OCR.
 *
 * Principe :
 *
 * OCR
 *  ↓
 * normalisation
 *  ↓
 * recherche des libellés
 *  ↓
 * extraction contextualisée
 *  ↓
 * validation de plausibilité
 *  ↓
 * score de confiance
 *  ↓
 * validation humaine
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
  nom: ["NOM DU CHIEN", "NOM DE L ANIMAL", "NOM"],

  prenom: ["PRENOM", "PRÉNOM"],

  sexe: ["SEXE"],

  dateNaissance: ["DATE DE NAISSANCE", "DATE NAISSANCE"],

  race: [
    "RACE/APPARENCE RACIALE",
    "RACE / APPARENCE RACIALE",
    "APPARENCE RACIALE",
    "ESPECE / RACE",
    "ESPECE RACE",
    "RACE",
  ],

  couleur: ["COULEUR", "COULEUR ROBE", "ROBE"],

  paysNaissance: ["PAYS DE NAISSANCE", "PAYS NAISSANCE"],

  numeroIdentification: [
    "NUMERO D IDENTIFICATION",
    "NUMERO IDENTIFICATION",
    "NUMERO DE IDENTIFICATION",
    "N IDENTIFICATION",
    "NO IDENTIFICATION",
    "N° IDENTIFICATION",
  ],

  dateIdentification: [
    "DATE D IDENTIFICATION",
    "DATE IDENTIFICATION",
    "DATE DE L IDENTIFICATION",
  ],
} as const;

/**
 * Signatures OCR inversées / très déformées observées
 * dans les cartes précédentes.
 */
const REVERSED_LABELS: Partial<Record<keyof typeof LABELS, readonly string[]>> =
  {
    nom: ["YNALN213G N3IHD"],

    sexe: ["J1VH 3X3S", "J1VH3X3S"],

    dateNaissance: [
      "OTOZ/VO/ET ZONVSSIVN 39 3LVG",
      "OTOZ VO ET ZONVSSIVN 39 3LVG",
    ],

    numeroIdentification: ["YVT1350 INOTIVIOVUYL 3WNW", "NOILVIIHILN3GI"],

    paysNaissance: ["EUSEDS3 JINVSSIVN 30 SAVD"],
  };

/* ============================================================
 * LIBELLÉS DE BORDURE DE CHAMP
 * ========================================================== */

/**
 * Ces libellés servent uniquement à déterminer où une valeur
 * doit s'arrêter.
 *
 * Il est volontairement plus large que LABELS.
 *
 * Exemple :
 *
 * NOM TRABALLONI NOM D'USAGE DIEGO
 *
 * La valeur du champ NOM doit être :
 *
 * TRABALLONI
 *
 * et non :
 *
 * TRABALLONI NOM D'USAGE DIEGO
 */
const FIELD_BOUNDARIES = [
  "CIVILITE",
  "CIVILITÉ",

  "PRENOM",
  "PRÉNOM",

  "NOM DU CHIEN",
  "NOM DE L ANIMAL",
  "NOM D USAGE",
  "NOM",

  "ADRESSE",

  "SEXE",

  "DATE DE NAISSANCE",
  "DATE NAISSANCE",

  "PAYS DE NAISSANCE",
  "PAYS NAISSANCE",

  "RACE/APPARENCE RACIALE",
  "RACE / APPARENCE RACIALE",
  "APPARENCE RACIALE",
  "ESPECE / RACE",
  "ESPECE RACE",
  "RACE",

  "CODE POSTAL",
  "CODEPOSTAL",

  "PAYS",

  "TELEPHONE",
  "TÉLÉPHONE",

  "ROBE",
  "COULEUR",
  "COULEUR ROBE",

  "COURRIEL",

  "NUMERO D IDENTIFICATION",
  "NUMERO IDENTIFICATION",
  "NUMERO DE IDENTIFICATION",
  "N IDENTIFICATION",
  "NO IDENTIFICATION",

  "DATE D IDENTIFICATION",
  "DATE IDENTIFICATION",
  "DATE DE L IDENTIFICATION",

  "EMPLACEMENT",
  "STERILISE",
  "STÉRILISÉ",
  "INSCRIT AU LIVRE DES ORIGINES",
];

/* ============================================================
 * NORMALISATION
 * ========================================================== */

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
 * Recherche exacte puis approximative d'un libellé.
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

    const words = normalizedText.split(" ");

    for (let i = 0; i < words.length; i++) {
      for (let size = 1; size <= 6 && i + size <= words.length; size++) {
        const candidate = words.slice(i, i + size).join(" ");

        const score = similarity(candidate, normalizedLabel);

        if (score >= 0.82 && (!bestMatch || score > bestMatch.confidence)) {
          const candidateIndex = normalizedText.indexOf(candidate);

          bestMatch = {
            label: candidate,
            index: candidateIndex,
            confidence: score,
          };
        }
      }
    }
  }

  return bestMatch;
}

function isValidIdentificationLabel(match: LabelMatch): boolean {
  const label = normalizeOcrLabel(match.label);

  return (
    label.startsWith("NUMERO ") ||
    label.startsWith("N IDENTIFICATION") ||
    label.startsWith("NO IDENTIFICATION")
  );
}

/* ============================================================
 * LIBELLÉS INVERSÉS
 * ========================================================== */

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

      if (!normalizedLabel) {
        continue;
      }

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

      if (score >= 0.75 && (!bestMatch || score > bestMatch.confidence)) {
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

  return bestMatch;
}

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

    const score = similarity(normalizedText, normalizedLabel);

    if (score >= 0.75 && (!bestMatch || score > bestMatch.confidence)) {
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
      // Faux positif ignoré.
    } else {
      return normalMatch;
    }
  }

  const reversedLabels = REVERSED_LABELS[field];

  if (!reversedLabels) {
    return null;
  }

  const reversedLineMatch = findReversedLabelOnLines(text, reversedLabels);

  if (reversedLineMatch) {
    return reversedLineMatch;
  }

  return findReversedLabel(text, reversedLabels);
}

/* ============================================================
 * NETTOYAGE / VALIDATION DES VALEURS
 * ========================================================== */

function cleanValue(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,\-|]+/, "")
    .replace(/[\s:;,\-|]+$/, "")
    .trim();
}

/**
 * Vérifie qu'une valeur ne contient pas plusieurs libellés
 * ICAD qui auraient été accidentellement capturés.
 */
function isPlausibleTextValue(value: string, maxLength = 80): boolean {
  const cleaned = cleanValue(value);

  if (!cleaned) {
    return false;
  }

  if (cleaned.length > maxLength) {
    return false;
  }

  const normalized = normalizeForComparison(cleaned);

  const suspiciousLabels = [
    "PAYS DE NAISSANCE",
    "NOM D USAGE",
    "DATE DE NAISSANCE",
    "DATE D IDENTIFICATION",
    "NUMERO D IDENTIFICATION",
    "CODE POSTAL",
    "TELEPHONE",
    "COURRIEL",
    "RACE",
    "APPARENCE RACIALE",
    "SEXE",
    "ROBE",
  ];

  const labelCount = suspiciousLabels.filter((label) =>
    normalized.includes(normalizeForComparison(label))
  ).length;

  return labelCount === 0;
}

/* ============================================================
 * EXTRACTION DE TEXTE PAR LIBELLÉ
 * ========================================================== */

/**
 * Retourne la portion située après un libellé et avant
 * le prochain libellé ICAD.
 *
 * Exemple :
 *
 * NOM TRABALLONI NOM D'USAGE DIEGO
 *
 * retourne :
 *
 * TRABALLONI
 */
function extractTextAfterLabel(
  text: string,
  match: LabelMatch,
  maxLength = 80
): string | undefined {
  if (match.reversed) {
    return undefined;
  }

  const normalized = normalizeText(text);
  const label = normalizeText(match.label);

  const index = normalized.indexOf(label);

  if (index === -1) {
    return undefined;
  }

  let value = normalized.slice(index + label.length).trim();

  const boundaries = FIELD_BOUNDARIES.map(normalizeText).filter(
    (boundary) => boundary && boundary !== label
  );

  let endIndex = value.length;

  for (const boundary of boundaries) {
    const boundaryIndex = value.indexOf(boundary);

    if (boundaryIndex !== -1 && boundaryIndex < endIndex) {
      endIndex = boundaryIndex;
    }
  }

  value = cleanValue(value.slice(0, endIndex));

  if (!isPlausibleTextValue(value, maxLength)) {
    return undefined;
  }

  return value;
}

function extractTextField(text: string, field: keyof typeof LABELS): IcadField {
  const match = findIcadLabel(text, field);

  if (!match) {
    return {
      confidence: 0,
    };
  }

  if (match.reversed) {
    /*
     * Une signature inversée peut indiquer la présence
     * du champ mais ne permet pas toujours de connaître
     * sa valeur avec suffisamment de fiabilité.
     */
    return {
      confidence: Math.min(match.confidence, 0.55),
    };
  }

  const value = extractTextAfterLabel(text, match);

  if (!value) {
    return {
      confidence: 0,
    };
  }

  /*
   * Une correspondance exacte du libellé donne une bonne
   * confiance, mais jamais 1.
   *
   * La confiance finale doit rester compatible avec
   * la validation humaine.
   */
  return {
    value,
    confidence: Math.min(0.92, match.confidence),
  };
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

function extractDate(text: string): string | undefined {
  const match = text.match(
    /\b(\d{1,2})\s*[\/.\- ]\s*(\d{1,2})\s*[\/.\- ]\s*(\d{4})\b/
  );

  if (!match) {
    return undefined;
  }

  return normalizeDate(`${match[1]}/${match[2]}/${match[3]}`);
}

/**
 * Recherche uniquement une date située APRÈS un libellé.
 */
function extractDateAfterLabel(text: string, match: LabelMatch): IcadField {
  if (match.reversed) {
    return {
      confidence: 0,
    };
  }

  const normalized = normalizeText(text);

  const label = normalizeText(match.label);

  const index = normalized.indexOf(label);

  if (index === -1) {
    return {
      confidence: 0,
    };
  }

  const after = normalized.slice(
    index + label.length,
    index + label.length + 80
  );

  const date = extractDate(after);

  if (!date) {
    return {
      confidence: 0,
    };
  }

  return {
    value: date,
    confidence: Math.min(0.95, match.confidence),
  };
}

/* ============================================================
 * NUMÉRO ICAD
 * ========================================================== */

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

function extractIdentificationNumber(text: string): string | undefined {
  const normalized = normalizeText(text);

  const candidates = extractIdentificationCandidates(text);

  if (candidates.length === 0) {
    return undefined;
  }

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

  if (bestCandidate) {
    return bestCandidate.value;
  }

  /*
   * Aucun contexte :
   * on conserve le candidat comme possibilité,
   * mais la couche supérieure lui attribuera
   * une confiance faible.
   */
  return candidates[0].value;
}

/* ============================================================
 * SEXE
 * ========================================================== */

function extractSexe(text: string): IcadField {
  const normalized = normalizeText(text);

  const match = findIcadLabel(text, "sexe");

  /*
   * Cas normal :
   *
   * SEXE MÂLE
   * SEXE FEMELLE
   */
  if (match && !match.reversed) {
    const label = normalizeText(match.label);

    const index = normalized.indexOf(label);

    if (index !== -1) {
      const after = normalized.slice(
        index + label.length,
        index + label.length + 30
      );

      if (/\bFEMELLE\b/.test(after) || /\bFEMEL\b/.test(after)) {
        return {
          value: "F",
          confidence: 0.95,
        };
      }

      if (/\bMALE\b/.test(after) || /\bMAL\b/.test(after)) {
        return {
          value: "M",
          confidence: 0.95,
        };
      }

      /*
       * Autorise un M/F isolé uniquement s'il est
       * immédiatement associé au champ SEXE.
       */
      const token = after.match(/^(M|F)\b/);

      if (token) {
        return {
          value: token[1],
          confidence: 0.85,
        };
      }
    }
  }

  /*
   * Signature OCR inversée :
   * elle prouve éventuellement que le champ SEXE
   * existe, mais pas sa valeur.
   */
  if (normalized.includes("J1VH 3X3S") || normalized.includes("J1VH3X3S")) {
    return {
      confidence: 0,
    };
  }

  /*
   * IMPORTANT :
   *
   * On ne cherche plus simplement "M" ou "F"
   * dans tout le document.
   *
   * Cela évite notamment de transformer une lettre
   * quelconque de l'OCR en sexe.
   */
  return {
    confidence: 0,
  };
}

/* ============================================================
 * PAYS DE NAISSANCE
 * ========================================================== */

function extractPaysNaissance(text: string): IcadField {
  const match = findIcadLabel(text, "paysNaissance");

  if (!match) {
    return {
      confidence: 0,
    };
  }

  if (match.reversed) {
    return {
      confidence: Math.min(match.confidence, 0.45),
    };
  }

  const value = extractTextAfterLabel(text, match, 40);

  if (!value) {
    return {
      confidence: 0,
    };
  }

  /*
   * Un pays est généralement court.
   */
  if (value.length > 40 || value.split(/\s+/).length > 5) {
    return {
      confidence: 0,
    };
  }

  return {
    value,
    confidence: Math.min(0.92, match.confidence),
  };
}

/* ============================================================
 * EXTRACTION PRINCIPALE
 * ========================================================== */
function extractStructuredIcadName(text: string): IcadField {
  const lines = normalizeLines(text);

  for (const line of lines) {
    const match = line.match(
      /(?<![A-Z])NOM\s+([A-Z][A-Z' -]*?)(?=\s+NOM\s*D(?:'| )USAGE\b|$)/
    );

    if (match) {
      const value = cleanValue(match[1]);

      if (value && isPlausibleTextValue(value, 80)) {
        return {
          value,
          confidence: 0.95,
        };
      }
    }
  }

  return {
    confidence: 0,
  };
}

function extractStructuredIcadPrenom(text: string): IcadField {
  const lines = normalizeLines(text);

  for (const line of lines) {
    const match = line.match(
      /\bPRENOM\s+([A-Z][A-Z' -]*?)(?=\s*;|\s+PAYS\b|$)/
    );

    if (match) {
      const value = cleanValue(match[1]);

      if (value && isPlausibleTextValue(value, 40)) {
        return {
          value,
          confidence: 0.95,
        };
      }
    }
  }

  return {
    confidence: 0,
  };
}

function extractStructuredIcadRace(text: string): IcadField {
  const lines = normalizeLines(text);

  for (const line of lines) {
    const match = line.match(/\bRACE\s*\/\s*APPARENCE\s+RACIALE\s+(.+)$/);

    if (!match) {
      continue;
    }

    let value = match[1];

    /*
     * Le OCR ajoute parfois un caractère parasite
     * isolé en fin de ligne.
     */
    value = value.replace(/\s+[A-Z]$/, "");

    value = cleanValue(value);

    if (value && isPlausibleTextValue(value, 80)) {
      return {
        value,
        confidence: 0.95,
      };
    }
  }

  return {
    confidence: 0,
  };
}
function extractStructuredIcadColor(text: string): IcadField {
  const lines = normalizeLines(text);

  for (const line of lines) {
    const match = line.match(/\bROBE\s+([A-Z]+)/);

    if (!match) {
      continue;
    }

    const value = cleanValue(match[1]);

    if (value && isPlausibleTextValue(value, 40)) {
      return {
        value,
        confidence: 0.95,
      };
    }
  }

  return {
    confidence: 0,
  };
}
function hasStrongIcadNumberContext(text: string): boolean {
  const lines = normalizeLines(text);

  for (const line of lines) {
    /*
     * INSERT est le libellé réellement présent sur la carte ICAD
     * devant le numéro électronique.
     *
     * On exige que INSERT soit sur la même ligne que le numéro.
     */
    if (/\bINSERT\b/.test(line) && /\b\d{15}\b/.test(line)) {
      return true;
    }
  }

  return false;
}
export function extractIcadData(rawText: string): IcadExtractionResult {
  const normalizedText = normalizeText(rawText);

  /*
   * ==========================================================
   * NOM
   * ==========================================================
   */

  let nom = extractStructuredIcadName(rawText);

  /*
   * Fallback vers l'ancien extracteur pour conserver
   * la compatibilité avec les OCR plus anciens.
   */
  if (!nom.value) {
    nom = extractTextField(rawText, "nom");
  }

  /*
   * Ancien comportement V3.1 ter :
   *
   * libellé inversé
   *      ↓
   * ligne suivante
   *      ↓
   * valeur
   */
  const nomLabel = findIcadLabel(rawText, "nom");

  if (!nom.value && nomLabel?.reversed && nomLabel.lineIndex !== undefined) {
    const lines = normalizeLines(rawText);

    const candidate = lines[nomLabel.lineIndex + 1];

    if (candidate && isPlausibleTextValue(candidate, 80)) {
      nom = {
        value: cleanValue(candidate),
        confidence: Math.min(0.85, nomLabel.confidence),
      };
    }
  }

  /*
   * ==========================================================
   * PRÉNOM
   * ==========================================================
   */

  let prenom = extractStructuredIcadPrenom(rawText);

  /*
   * Fallback vers l'ancien extracteur.
   */
  if (!prenom.value) {
    prenom = extractTextField(rawText, "prenom");
  }
  /*
   * ==========================================================
   * SEXE
   * ==========================================================
   */

  let sexe = extractSexe(rawText);

  /*
   * Si le libellé SEXE est inversé, on regarde uniquement
   * la ligne associée / la ligne suivante.
   *
   * On ne cherche surtout PAS un M ou F dans tout l'OCR.
   */
  const sexeLabel = findIcadLabel(rawText, "sexe");

  if (sexeLabel?.reversed && sexeLabel.lineIndex !== undefined) {
    const lines = normalizeLines(rawText);

    const associatedLines = [
      lines[sexeLabel.lineIndex],
      lines[sexeLabel.lineIndex + 1],
    ].filter(Boolean);

    for (const line of associatedLines) {
      if (/\bFEMELLE\b/.test(line) || /\bFEMEL\b/.test(line)) {
        sexe = {
          value: "F",
          confidence: Math.min(0.95, sexeLabel.confidence),
        };

        break;
      }

      if (/\bMALE\b/.test(line) || /\bMAL\b/.test(line)) {
        sexe = {
          value: "M",
          confidence: Math.min(0.95, sexeLabel.confidence),
        };

        break;
      }

      /*
       * M ou F isolé uniquement dans la ligne
       * associée au libellé.
       */
      const isolatedSex = line.match(/(?:^|\s)([MF])(?:\s|$)/);

      if (isolatedSex) {
        sexe = {
          value: isolatedSex[1],
          confidence: Math.min(0.75, sexeLabel.confidence),
        };

        break;
      }
    }
  }

  /*
   * ==========================================================
   * DATE DE NAISSANCE
   * ==========================================================
   */

  let dateNaissance: IcadField = {
    confidence: 0,
  };

  const dateNaissanceLabel = findIcadLabel(rawText, "dateNaissance");

  if (
    dateNaissanceLabel?.reversed &&
    dateNaissanceLabel.lineIndex !== undefined
  ) {
    const lines = normalizeLines(rawText);

    /*
     * On regarde la ligne du libellé puis les deux lignes
     * suivantes.
     */
    const context = [
      lines[dateNaissanceLabel.lineIndex],
      lines[dateNaissanceLabel.lineIndex + 1],
      lines[dateNaissanceLabel.lineIndex + 2],
    ]
      .filter(Boolean)
      .join(" ");

    const date = extractDate(context);

    if (date) {
      dateNaissance = {
        value: date,
        confidence: Math.min(0.8, dateNaissanceLabel.confidence),
      };
    }
  } else if (dateNaissanceLabel) {
    /*
     * Cas normal :
     * DATE DE NAISSANCE 05/07/2022
     */
    dateNaissance = extractDateAfterLabel(rawText, dateNaissanceLabel);
  }

  /*
   * ==========================================================
   * RACE
   * ==========================================================
   */

  let race = extractStructuredIcadRace(rawText);

  /*
   * Fallback vers l'ancien extracteur.
   */
  if (!race.value) {
    race = extractTextField(rawText, "race");
  }
  /*
   * ==========================================================
   * COULEUR / ROBE
   * ==========================================================
   */

  let couleur = extractStructuredIcadColor(rawText);

  if (!couleur.value) {
    couleur = extractTextField(rawText, "couleur");
  }

  /*
   * ==========================================================
   * PAYS DE NAISSANCE
   * ==========================================================
   */

  let paysNaissance = extractStructuredIcadPaysNaissance(rawText);

  if (!paysNaissance.value) {
    paysNaissance = extractPaysNaissance(rawText);
  }

  function extractStructuredIcadPaysNaissance(text: string): IcadField {
    const lines = normalizeLines(text);

    for (const line of lines) {
      const match = line.match(/\bPAYS\s*DE\s*NAISSANCE\s+([A-Z]+)/);

      if (!match) {
        continue;
      }

      const value = cleanValue(match[1]);

      if (value && isPlausibleTextValue(value, 40)) {
        return {
          value,
          confidence: 0.95,
        };
      }
    }

    return {
      confidence: 0,
    };
  }
  /*
   * ==========================================================
   * NUMÉRO D'IDENTIFICATION ICAD
   * ==========================================================
   */

  let numeroIdentification: IcadField = {
    confidence: 0,
  };

  const identificationLabel = findIcadLabel(rawText, "numeroIdentification");

  const identification = extractIdentificationNumber(rawText);

  const strongIdentificationContext = hasStrongIcadNumberContext(rawText);

  if (identification && identificationLabel) {
    numeroIdentification = {
      value: identification,
      confidence: Math.min(0.95, identificationLabel.confidence),
    };
  } else if (identification && strongIdentificationContext) {
    numeroIdentification = {
      value: identification,
      confidence: 0.95,
    };
  } else if (identification) {
    numeroIdentification = {
      value: identification,
      confidence: 0.55,
    };
  }

  /*
   * ==========================================================
   * DATE D'IDENTIFICATION
   * ==========================================================
   */

  let dateIdentification: IcadField = {
    confidence: 0,
  };

  const dateIdentificationLabel = findIcadLabel(rawText, "dateIdentification");

  if (
    dateIdentificationLabel?.reversed &&
    dateIdentificationLabel.lineIndex !== undefined
  ) {
    const lines = normalizeLines(rawText);

    const context = [
      lines[dateIdentificationLabel.lineIndex],
      lines[dateIdentificationLabel.lineIndex + 1],
      lines[dateIdentificationLabel.lineIndex + 2],
    ]
      .filter(Boolean)
      .join(" ");

    const date = extractDate(context);

    if (date) {
      dateIdentification = {
        value: date,
        confidence: Math.min(0.8, dateIdentificationLabel.confidence),
      };
    }
  } else if (dateIdentificationLabel) {
    dateIdentification = extractDateAfterLabel(
      rawText,
      dateIdentificationLabel
    );
  }

  /*
   * ==========================================================
   * RÉSULTAT
   * ==========================================================
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
