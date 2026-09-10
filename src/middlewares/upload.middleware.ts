import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * Répertoire temporaire de réception des fichiers.
 *
 * Les fichiers seront ensuite déplacés vers leur emplacement
 * définitif après vérification.
 */
const uploadDir = path.join(process.cwd(), "uploads", "documents");

// Création automatique du répertoire s'il n'existe pas.
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Stockage temporaire des fichiers.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1_000_000
    )}${extension}`;

    cb(null, uniqueName);
  },
});

/**
 * Types de fichiers autorisés.
 */
const allowedMimeTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",

  // PDF
  "application/pdf",

  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * Vérification du type de fichier.
 */
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Type de fichier non autorisé. Formats acceptés : JPG, PNG, WEBP, PDF, XLS et XLSX."
      )
    );
  }

  cb(null, true);
};

/**
 * Configuration générale de l'upload.
 *
 * Limite actuelle : 10 Mo par fichier.
 */
export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
