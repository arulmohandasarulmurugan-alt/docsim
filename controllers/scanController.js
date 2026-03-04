const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { pool } = require("../config/db");

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function calculateJaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersectionSize = [...setA].filter((word) => setB.has(word)).length;
  const unionSize = new Set([...setA, ...setB]).size;

  if (unionSize === 0) {
    return 0;
  }

  return intersectionSize / unionSize;
}

async function extractFileText(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".txt") {
    return fs.readFile(file.path, "utf8");
  }

  if (extension === ".pdf") {
    const buffer = await fs.readFile(file.path);
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  if (extension === ".docx") {
    const parsed = await mammoth.extractRawText({ path: file.path });
    return parsed.value || "";
  }

  throw new Error(`Unsupported file extension: ${extension}`);
}

async function removeTemporaryFiles(files) {
  await Promise.allSettled(files.map((file) => fs.unlink(file.path)));
}

async function compareDocuments(req, res) {
  const uploadedFiles = req.files || [];

  if (uploadedFiles.length < 2) {
    await removeTemporaryFiles(uploadedFiles);
    res.status(400).json({
      success: false,
      message: "Please upload at least 2 files."
    });
    return;
  }

  if (uploadedFiles.length > 100) {
    await removeTemporaryFiles(uploadedFiles);
    res.status(400).json({
      success: false,
      message: "Maximum allowed files are 100."
    });
    return;
  }

  try {
    const extractedFiles = await Promise.all(
      uploadedFiles.map(async (file) => {
        const text = await extractFileText(file);
        return {
          originalname: file.originalname,
          tokens: tokenize(text)
        };
      })
    );

    const results = [];
    const insertValues = [];

    for (let i = 0; i < extractedFiles.length; i += 1) {
      for (let j = i + 1; j < extractedFiles.length; j += 1) {
        const firstFile = extractedFiles[i];
        const secondFile = extractedFiles[j];
        const similarity = calculateJaccardSimilarity(firstFile.tokens, secondFile.tokens);
        const percentage = Number((similarity * 100).toFixed(2));

        results.push({
          file_name_1: firstFile.originalname,
          file_name_2: secondFile.originalname,
          similarity_percentage: percentage
        });

        insertValues.push([firstFile.originalname, secondFile.originalname, percentage]);
      }
    }

    if (insertValues.length > 0) {
      await pool.query(
        "INSERT INTO scan_results (file_name_1, file_name_2, similarity) VALUES ?",
        [insertValues]
      );
    }

    res.status(200).json({
      success: true,
      total_files: uploadedFiles.length,
      total_pairs: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process scan request.",
      error: error.message
    });
  } finally {
    await removeTemporaryFiles(uploadedFiles);
  }
}

async function getScanHistory(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, file_name_1, file_name_2, similarity, created_at FROM scan_results ORDER BY created_at DESC, id DESC"
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      history: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch scan history.",
      error: error.message
    });
  }
}

module.exports = {
  compareDocuments,
  getScanHistory
};
