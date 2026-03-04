const multer = require("multer");

function errorMiddleware(err, req, res, next) {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError) {
    let message = "File upload failed.";

    if (err.code === "LIMIT_FILE_COUNT") {
      message = "Maximum 100 files can be uploaded at once.";
    }

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Each file must be smaller than 15 MB.";
    }

    res.status(400).json({ success: false, message });
    return;
  }

  res.status(400).json({ success: false, message: err.message || "Request failed." });
}

module.exports = errorMiddleware;
