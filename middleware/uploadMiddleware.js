const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = new Set([".txt", ".pdf", ".docx"]);
const allowedMimeTypes = new Set([
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeValid = allowedMimeTypes.has(file.mimetype);
  const extensionValid = allowedExtensions.has(extension);

  if (!mimeValid && !extensionValid) {
    cb(new Error("Only TXT, PDF, and DOCX files are supported."));
    return;
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 100,
    fileSize: 15 * 1024 * 1024
  }
});

module.exports = upload;
