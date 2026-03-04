const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const { compareDocuments, getScanHistory } = require("../controllers/scanController");

const router = express.Router();

router.post("/compare", upload.array("files", 100), compareDocuments);
router.get("/history", getScanHistory);

module.exports = router;
