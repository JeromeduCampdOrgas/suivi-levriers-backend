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
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1_000_000
    )}${extension}`;

    cb(null, uniqueName);
  },
});

/**
 * Types MIME autorisés.
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

  // Certains navigateurs / systèmes peuvent envoyer Excel
  // avec un MIME type générique.
  "application/octet-stream",
];

/**
 * Extensions autorisées.
 */
const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".xls",
  ".xlsx",
];

/**
 * Vérification du type de fichier.
 *
 * On vérifie à la fois :
 * - le MIME type fourni par le navigateur
 * - l'extension réelle du fichier
 *
 * Cela évite de bloquer certains fichiers Excel lorsque
 * le navigateur fournit un MIME type générique.
 */
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  const mimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);
  const extensionAllowed = allowedExtensions.includes(extension);

  if (!mimeTypeAllowed || !extensionAllowed) {
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
 * Limite : 10 Mo par fichier.
 */
export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
