import { describe, it, expect } from "vitest";

import { extractIcadData, extractIcadValues } from "./icadExtractor.service";

/* ============================================================
 * OCR #1
 * ============================================================ */

const OCR_CARD_1 = `
! OTOZ/vO/ET | ZONVSSIVN 39 3LVG
J1VH 3X3s
| HIMNOLLYVd INDIS
| JgO%
manon orzze O91Y5 Z0va
NVHOIW SJdd SIC3NUS IrJODALVD
YVT1350 INOTIVIOVUYL 3WNW _609£9SCOOOOTT86 NOILVIIHILN3GI
| YNaLN213G N3IHD
`;

/* ============================================================
 * OCR #2
 * ============================================================ */

const OCR_CARD_2 = `
vw A ne A a rene dti a du ru ét 0 1 Le 41 A7 JA EL
_ | ‘ . "en a“. k4% _ .
-
- .
A3
"
P
à g |
ä
;
ans ;
UON S3INIDINO S30 FYAN NV LIYIS ‘
.
»
ES |
di ‘
m ;
euseds3 JINVSSIVN 30 SAVd ER ‘ |
: BlJjo) HNONIJUd SUIEpew 3LMIANI
> Frog wz TETE SAUVE GOTTCESTS AUTONET SERV At SE Pr VAS
Too ciecenx K Pres AE ER NE ER EC CA NE TE SANT CA LE TTL D EE INSEE S LOT A AI VE ES m3i4 |
éterise : Saut: CAE DEA SRE ANR ON x JSPES AA Ces CIEL OP EE SEE ER UE DAS ASE [OISE ONE IA GA NIE ADR CO DAS REED EN ARESOPTIS SCAN dE FSUE E ç |
ES 20 ‘ =+4143 sv Et FASSENT A ASE RE OLA VER A PS NE ET A PI pe de NS CALE TES se PTS NES 2 F0 DE EDS Le CEE ERA AE AT GE Ney ae 7æ à a ‘ |
= sm Va ‘ ne ANS UD AE ARE TEE REINE OO SCT ES EN Eire RS PERS RTE * ; Ps£ y, a VS ELEC AE SO RIT PNR LE te LS AE
N IESANS VESTES PT Tes PES ENONCE NOUS ON AN OS CET OS NN EN ÉNN D A  PSS, ‘ = ï eu VE TEE AE
j pren EME ENN 4, RTE OE CE PER CMS NO NC tte a Et OT A PSS, ‘ =+4143 sv Et FASSENT A ASE RE OLA VER A PS NE ET A PI pe de NS CALE TES se PTS NES 2 F0 DE EDS Le CEE ERA AE AT GE Ney ae 7æ à a
v=2n AE FA ES cs PE A re ME dem amqes bi dolce ré es ES Lebr PUS TES EE « A ven. { 7 … ; TA ‘ ALIEN NEA NE A EE PL ae tt pat 06 pes 5
en er 5e Le SOON seu ee 4 JS A Seb. sx Vs aie ES ae 1
:$ (Es ; 2 PE 2 EFNIEITREES SEEN CORAN RATE SN OMS RE ; a. - ‘ . Ÿ ad vtde remet res nencamme ts ;
SAR cas 838 ares USE AASERSS > EX AR AIR EE F5 EX AR AIR EE LA EESTI ed ETS, ‘ ; ; 945 retemntesr——l rendit saute af x LTD AE A AE AT AA STAR 18 NE Nm Rs è
RH pt CATD = SA ON NA ie STE NE EE AAT EN Eire RS PERS RTE * ; a. - ‘ . 
20 Rere 3 ; ! Sp CES , ENVOIE EN OES 54 Ge » QU A EE AR TEE AE EE NE sta rc 6
TAN PER > | | | |
" pce os ttes >}
- « - set 27 RE UC ar" 4
-F ac rie te "0
À ru S RTE Mase => oO à
‘ 4 IENSER ‘{ | |
SREGP SU VI230 13 |
A PS ‘
; ' BG ; ‘ rider Ace _ ; ka f
; see
; - ; - ;
JHVANIHITY césries
A PS ‘
SREGP SU VI230 13 |
A PS ‘
; 
; 
IS
ee ‘
I -
> ‘
r Li" ‘
er “
- = ;
`;

/* ============================================================
 * OCR #1
 * ============================================================ */

describe("ICAD OCR - carte 1", () => {
  it("ne doit pas planter sur un OCR fortement bruité", () => {
    expect(() => extractIcadData(OCR_CARD_1)).not.toThrow();
  });

  it("doit retourner le texte brut", () => {
    const result = extractIcadData(OCR_CARD_1);

    expect(result.rawText).toBe(OCR_CARD_1);
  });

  it("doit produire un texte normalisé", () => {
    const result = extractIcadData(OCR_CARD_1);

    expect(result.normalizedText).toBeTruthy();
    expect(typeof result.normalizedText).toBe("string");
  });

  it("doit retourner tous les champs ICAD attendus", () => {
    const result = extractIcadData(OCR_CARD_1);

    expect(result.data).toHaveProperty("nom");
    expect(result.data).toHaveProperty("prenom");
    expect(result.data).toHaveProperty("sexe");
    expect(result.data).toHaveProperty("dateNaissance");
    expect(result.data).toHaveProperty("race");
    expect(result.data).toHaveProperty("couleur");
    expect(result.data).toHaveProperty("paysNaissance");
    expect(result.data).toHaveProperty("numeroIdentification");
    expect(result.data).toHaveProperty("dateIdentification");
  });

  it("doit toujours fournir un score de confiance", () => {
    const result = extractIcadData(OCR_CARD_1);

    for (const field of Object.values(result.data)) {
      expect(typeof field.confidence).toBe("number");
      expect(field.confidence).toBeGreaterThanOrEqual(0);
      expect(field.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("doit pouvoir utiliser extractIcadValues()", () => {
    const result = extractIcadValues(OCR_CARD_1);

    expect(result).toHaveProperty("nom");
    expect(result).toHaveProperty("prenom");
    expect(result).toHaveProperty("sexe");
    expect(result).toHaveProperty("dateNaissance");
    expect(result).toHaveProperty("race");
    expect(result).toHaveProperty("couleur");
    expect(result).toHaveProperty("paysNaissance");
    expect(result).toHaveProperty("numeroIdentification");
    expect(result).toHaveProperty("dateIdentification");
  });
});

/* ============================================================
 * OCR #2
 * ============================================================ */

describe("ICAD OCR - carte 2", () => {
  it("ne doit pas planter sur un OCR extrêmement bruité", () => {
    expect(() => extractIcadData(OCR_CARD_2)).not.toThrow();
  });

  it("doit produire un résultat exploitable", () => {
    const result = extractIcadData(OCR_CARD_2);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.normalizedText).toBeTruthy();
  });

  it("doit analyser le contexte de naissance", () => {
    const result = extractIcadData(OCR_CARD_2);

    expect(result.data.paysNaissance).toHaveProperty("confidence");
  });

  it("doit reconnaître la présence du contexte ICAD", () => {
    const result = extractIcadData(OCR_CARD_2);

    expect(
      result.normalizedText.includes("ICAD") ||
        result.normalizedText.includes("CATD")
    ).toBe(true);
  });

  it("ne doit pas produire de date avec un format invalide", () => {
    const result = extractIcadData(OCR_CARD_2);

    const dateFields = [
      result.data.dateNaissance,
      result.data.dateIdentification,
    ];

    for (const field of dateFields) {
      if (field.value) {
        expect(field.value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      }
    }
  });

  it("ne doit pas retourner un numéro d'identification invalide", () => {
    const result = extractIcadData(OCR_CARD_2);

    if (result.data.numeroIdentification.value) {
      expect(result.data.numeroIdentification.value).toMatch(/^\d{15}$/);
    }
  });
});

/* ============================================================
 * TESTS AVEC UN OCR PROPRE
 * ============================================================ */

describe("ICAD OCR - texte propre", () => {
  const CLEAN_OCR = `
    NOM : LUNA
    PRENOM : MARIE
    SEXE : FEMELLE
    DATE DE NAISSANCE : 12/05/2021
    RACE : GALGO ESPAGNOL
    COULEUR : BRINGEE
    PAYS DE NAISSANCE : ESPAGNE
    NUMERO D IDENTIFICATION : 250123456789012
    DATE D IDENTIFICATION : 20/06/2021
  `;

  it("doit détecter un numéro d'identification de 15 chiffres", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");

    expect(result.data.numeroIdentification.confidence).toBeGreaterThanOrEqual(
      0.9
    );
  });

  it("doit détecter le sexe femelle", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.sexe.value).toBe("F");
  });

  it("doit détecter la date de naissance", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.dateNaissance.value).toBe("12/05/2021");
  });

  it("doit détecter la date d'identification", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.dateIdentification.value).toBe("20/06/2021");
  });

  it("doit détecter le nom", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.nom.value).toBe("LUNA");
  });

  it("doit détecter le prénom", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.prenom.value).toBe("MARIE");
  });

  it("doit détecter la race", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.race.value).toContain("GALGO");
  });

  it("doit détecter la couleur", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.couleur.value).toContain("BRINGEE");
  });

  it("doit détecter le pays de naissance", () => {
    const result = extractIcadData(CLEAN_OCR);

    expect(result.data.paysNaissance.value).toContain("ESPAGNE");
  });
});

/* ============================================================
 * TESTS DE TOLÉRANCE OCR
 * ============================================================ */

describe("ICAD OCR - tolérance aux erreurs", () => {
  it("doit accepter une date avec des tirets", () => {
    const OCR = `
      DATE DE NAISSANCE : 12-05-2021
    `;

    const result = extractIcadData(OCR);

    expect(result.data.dateNaissance.value).toBe("12/05/2021");
  });

  it("doit accepter une date avec des espaces", () => {
    const OCR = `
      DATE DE NAISSANCE : 12 05 2021
    `;

    const result = extractIcadData(OCR);

    expect(result.data.dateNaissance.value).toBe("12/05/2021");
  });

  it("doit accepter un numéro d'identification groupé", () => {
    const OCR = `
      NUMERO D IDENTIFICATION :
      250 1234 5678 9012
    `;

    const result = extractIcadData(OCR);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");
  });

  it("doit accepter le libellé sans accent", () => {
    const OCR = `
      DATE DE NAISSANCE : 12/05/2021
    `;

    const result = extractIcadData(OCR);

    expect(result.data.dateNaissance.value).toBe("12/05/2021");
  });

  it("doit retourner une confiance nulle lorsqu'aucune donnée n'est trouvée", () => {
    const result = extractIcadData(`
      Ceci est un texte quelconque.
      Aucun champ ICAD ici.
    `);

    expect(result.data.numeroIdentification.confidence).toBe(0);

    expect(result.data.dateNaissance.confidence).toBe(0);
  });
});

/* ============================================================
 * DIAGNOSTIC DES EXTRACTIONS RÉELLES
 * ============================================================ */

describe("V3.1 - extraction sécurisée du numéro ICAD", () => {
  it("détecte un numéro ICAD de 15 chiffres", () => {
    const result = extractIcadData(`
      NUMERO D IDENTIFICATION : 250123456789012
    `);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");
  });

  it("détecte un numéro ICAD avec des espaces", () => {
    const result = extractIcadData(`
      NUMERO D IDENTIFICATION : 250 1234 5678 9012
    `);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");
  });

  it("détecte un numéro ICAD avec des tirets", () => {
    const result = extractIcadData(`
      NUMERO D IDENTIFICATION : 250-1234-5678-9012
    `);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");
  });

  it("ne concatène pas des nombres provenant de zones différentes", () => {
    const result = extractIcadData(`
      DATE DE NAISSANCE : 12/05/2021
      DATE D IDENTIFICATION : 20/06/2021
      NUMERO : 250
      AUTRE NUMERO : 123456
      AUTRE DONNEE : 789
    `);

    expect(result.data.numeroIdentification.value).toBeUndefined();
  });

  it("ignore une chaîne contenant des lettres OCR mélangées aux chiffres", () => {
    const result = extractIcadData(`
      NUMERO D IDENTIFICATION : _609£9SCOOOOTT86
    `);

    expect(result.data.numeroIdentification.value).toBeUndefined();
  });

  it("ignore un nombre de 14 chiffres", () => {
    const result = extractIcadData(`
      NUMERO D IDENTIFICATION : 25012345678901
    `);

    expect(result.data.numeroIdentification.value).toBeUndefined();
  });

  it("ignore un nombre de 16 chiffres", () => {
    const result = extractIcadData(`
      NUMERO D IDENTIFICATION : 2501234567890123
    `);

    expect(result.data.numeroIdentification.value).toBeUndefined();
  });
});
describe("V3.1 bis - confiance du numéro ICAD", () => {
  it("doit avoir une confiance élevée avec le libellé d'identification", () => {
    const text = `
      NOM : LUNA
      NUMERO D IDENTIFICATION : 250123456789012
    `;

    const result = extractIcadData(text);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");

    expect(result.data.numeroIdentification.confidence).toBeGreaterThanOrEqual(
      0.9
    );
  });

  it("doit avoir une confiance faible pour un numéro isolé", () => {
    const text = `
      NOM : LUNA
      RACE : GALGO
      250123456789012
    `;

    const result = extractIcadData(text);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");

    expect(result.data.numeroIdentification.confidence).toBe(0.55);
  });

  it("ne doit pas donner une confiance élevée sans libellé d'identification", () => {
    const text = `
      DATE DE NAISSANCE : 12/05/2021
      RACE : GALGO ESPAGNOL
      250123456789012
      DATE D IDENTIFICATION : 20/06/2021
    `;

    const result = extractIcadData(text);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");

    expect(result.data.numeroIdentification.confidence).toBeLessThan(0.9);
  });

  it("ne doit pas concaténer plusieurs zones numériques", () => {
    const text = `
      NUMERO D IDENTIFICATION :
      2501234567
      89012
    `;

    const result = extractIcadData(text);

    expect(result.data.numeroIdentification.value).toBeUndefined();
  });
});
describe("V3.1 ter - structure des lignes OCR", () => {
  const carte1 = `
! OTOZ/vO/ET | ZONVSSIVN 39 3LVG
J1VH 3X3s
| HIMNOLLYVd INDIS
| JgO%
manon orzze O91Y5 Z0va
NVHOIW SJdd SIC3NUS IrJODALVD
YVT1350 INOTIVIOVUYL 3WNW _609£9SCOOOOTT86 NOILVIIHILN3GI
| YNaLN213G N3IHD
`;

  it("doit conserver la structure des lignes OCR", () => {
    const result = extractIcadData(carte1);

    expect(result.rawText).toContain("OTOZ/vO/ET | ZONVSSIVN 39 3LVG");

    expect(result.rawText).toContain("J1VH 3X3s");

    expect(result.rawText).toContain("YVT1350 INOTIVIOVUYL 3WNW");
  });

  it("doit reconnaître le libellé inversé de la date de naissance", () => {
    const result = extractIcadData(carte1);

    expect(result.normalizedText).toContain("OTOZ/VO/ET");
  });

  it("doit reconnaître le libellé inversé du sexe", () => {
    const result = extractIcadData(carte1);

    expect(result.normalizedText).toContain("J1VH 3X3S");
  });

  it("doit reconnaître le contexte inversé du numéro d'identification", () => {
    const result = extractIcadData(carte1);

    expect(result.normalizedText).toContain("YVT1350 INOTIVIOVUYL 3WNW");

    expect(result.normalizedText).toContain("NOILVIIHILN3GI");
  });

  it("ne doit pas considérer la chaîne OCR du numéro comme un numéro ICAD valide", () => {
    const result = extractIcadData(carte1);

    expect(result.data.numeroIdentification.value).toBeUndefined();
  });
});
describe("V3.1 ter - association par lignes", () => {
  it("doit prendre la date située après le libellé inversé", () => {
    const text = `
01/01/2020
OTOZ/VO/ET ZONVSSIVN 39 3LVG
12/05/2021
RACE : GALGO
`;

    const result = extractIcadData(text);

    expect(result.data.dateNaissance.value).toBe("12/05/2021");
  });
});
describe("V3.1 ter - association du numéro ICAD par lignes", () => {
  it("doit prendre le numéro ICAD situé après le libellé inversé", () => {
    const text = `
YVT1350 INOTIVIOVUYL 3WNW
250123456789012
NOM DU CHIEN
LUNA
`;

    const result = extractIcadData(text);

    expect(result.data.numeroIdentification.value).toBe("250123456789012");

    expect(result.data.numeroIdentification.confidence).toBeGreaterThanOrEqual(
      0.9
    );
  });
});
describe("V3.1 ter - association du sexe par lignes", () => {
  it("doit prendre le sexe situé après le libellé inversé", () => {
    const text = `
J1VH 3X3S
FEMELLE
RACE : GALGO
`;

    const result = extractIcadData(text);

    expect(result.data.sexe.value).toBe("F");
    expect(result.data.sexe.confidence).toBeGreaterThanOrEqual(0.9);
  });
});
describe("V3.1 ter - association du nom par lignes", () => {
  it("doit prendre le nom situé après le libellé inversé", () => {
    const text = `
YNaLN213G N3IHD
LUNA
SEXE
FEMELLE
`;

    const result = extractIcadData(text);

    expect(result.data.nom.value).toBe("LUNA");
    expect(result.data.nom.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
/*describe("V3.2 - inspection des lignes OCR carte 1", () => {
  it("doit afficher chaque ligne avec son index", () => {
    const text = `
! OTOZ/vO/ET | ZONVSSIVN 39 3LVG
J1VH 3X3s
| HIMNOLLYVd INDIS
| JgO%
manon orzze O91Y5 Z0va
NVHOIW SJdd SIC3NUS IrJODALVD
YVT1350 INOTIVIOVUYL 3WNW _609£9SCOOOOTT86 NOILVIIHILN3GI
| YNaLN213G N3IHD
`;

    console.log("\n========== LIGNES OCR CARTE 1 ==========");

    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, index) => {
        console.log(`${index} : ${line}`);
      });

    console.log("=========================================\n");

    expect(text).toBeTruthy();
  });
});
describe("V3.2 - diagnostic approfondi des libellés inversés carte 1", () => {
  it("doit comparer les lignes OCR avec plusieurs transformations", () => {
    const levenshtein = (a: string, b: string): number => {
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
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[b.length][a.length];
    };

    const normalize = (value: string): string =>
      value
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const reverseCharacters = (value: string): string =>
      value.split("").reverse().join("");

    const reverseWords = (value: string): string =>
      value.split(" ").reverse().join(" ");

    const similarity = (a: string, b: string): number => {
      const longueur = Math.max(a.length, b.length);

      if (longueur === 0) {
        return 0;
      }

      return 1 - levenshtein(a, b) / longueur;
    };

    const lignes = [
      "HIMNOLLYVd INDIS",
      "JgO%",
      "manon orzze O91Y5 Z0va",
      "NVHOIW SJdd SIC3NUS IrJODALVD",
    ];

    const labels = {
      nom: ["NOM", "NOM DU CHIEN", "NOM DE L ANIMAL"],
      prenom: ["PRENOM", "PRÉNOM"],
      race: ["RACE", "ESPECE RACE", "ESPÈCE RACE"],
      couleur: ["COULEUR", "ROBE"],
      paysNaissance: ["PAYS DE NAISSANCE", "PAYS NAISSANCE"],
      dateIdentification: ["DATE D IDENTIFICATION", "DATE IDENTIFICATION"],
    };

    console.log("\n========== DIAGNOSTIC APPROFONDI ==========");

    for (const [index, ligneBrute] of lignes.entries()) {
      const ligne = normalize(ligneBrute);

      console.log(`\nLigne ${index + 2} : ${ligneBrute}`);
      console.log(`Normalisée : ${ligne}`);
      console.log(`Inversée caractères : ${reverseCharacters(ligne)}`);
      console.log(`Mots inversés : ${reverseWords(ligne)}`);

      const resultats: Array<{
        champ: string;
        label: string;
        direct: number;
        caracteresInverses: number;
        motsInverses: number;
      }> = [];

      for (const [champ, champLabels] of Object.entries(labels)) {
        for (const labelBrut of champLabels) {
          const label = normalize(labelBrut);

          resultats.push({
            champ,
            label: labelBrut,
            direct: similarity(ligne, label),
            caracteresInverses: similarity(reverseCharacters(ligne), label),
            motsInverses: similarity(reverseWords(ligne), label),
          });
        }
      }

      resultats
        .sort(
          (a, b) =>
            Math.max(b.direct, b.caracteresInverses, b.motsInverses) -
            Math.max(a.direct, a.caracteresInverses, a.motsInverses)
        )
        .slice(0, 5)
        .forEach((resultat) => {
          console.log(
            `  ${resultat.champ.padEnd(20)} ` +
              `→ ${resultat.label.padEnd(25)} ` +
              `direct=${resultat.direct.toFixed(2)} ` +
              `inverse=${resultat.caracteresInverses.toFixed(2)} ` +
              `mots=${resultat.motsInverses.toFixed(2)}`
          );
        });
    }

    console.log("\n============================================\n");

    expect(lignes.length).toBe(4);
  });
});*/
