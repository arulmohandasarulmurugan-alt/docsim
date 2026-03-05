const fs = require("fs/promises");
const path = require("path");
const pdfParseModule = require("pdf-parse");
const mammoth = require("mammoth");
const { pool } = require("../config/db");

let scanSchemaCache = null;

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

function pickColumn(availableColumns, candidates) {
  return candidates.find((candidate) => availableColumns.has(candidate)) || null;
}

function parseDecimalType(typeString) {
  const match = /^decimal\((\d+),\s*(\d+)\)$/i.exec(String(typeString || "").trim());
  if (!match) {
    return null;
  }
  return {
    precision: Number(match[1]),
    scale: Number(match[2])
  };
}

function fitNumericValue(value, columnMeta) {
  if (!columnMeta) {
    return value;
  }

  const decimalInfo = parseDecimalType(columnMeta.type);
  if (!decimalInfo) {
    return value;
  }

  const { precision, scale } = decimalInfo;
  const maxAbs = Math.pow(10, precision - scale) - Math.pow(10, -scale);
  let adjusted = Number(value);

  // Legacy "score" columns are often fractional (0 to 1), while app similarity is 0 to 100.
  if (columnMeta.name === "score" && adjusted > maxAbs && adjusted <= 100 && maxAbs <= 1.9999) {
    adjusted = adjusted / 100;
  }

  if (Math.abs(adjusted) > maxAbs) {
    adjusted = adjusted < 0 ? -maxAbs : maxAbs;
  }

  return Number(adjusted.toFixed(scale));
}

async function resolveScanResultsSchema() {
  if (scanSchemaCache) {
    return scanSchemaCache;
  }

  const [columns] = await pool.query("SHOW COLUMNS FROM scan_results");
  const normalizedColumns = columns.map((column) => ({
    name: String(column.Field).toLowerCase(),
    nullable: String(column.Null).toUpperCase() === "YES",
    hasDefault: column.Default !== null,
    isAutoIncrement: String(column.Extra || "").toLowerCase().includes("auto_increment"),
    type: String(column.Type || "")
  }));

  const available = new Set(normalizedColumns.map((col) => col.name));
  const columnMeta = Object.fromEntries(normalizedColumns.map((col) => [col.name, col]));

  scanSchemaCache = {
    columns: normalizedColumns,
    columnMeta,
    id: pickColumn(available, ["id", "scan_id"]),
    file1: pickColumn(available, ["file_name_1", "file_a", "file1", "file_1", "document_1", "doc_1"]),
    file2: pickColumn(available, ["file_name_2", "file_b", "file2", "file_2", "document_2", "doc_2"]),
    similarity: pickColumn(available, ["similarity", "similarity_score", "score"]),
    createdAt: pickColumn(available, ["created_at", "scan_date", "createdon", "created_on", "timestamp", "createdat"])
  };

  return scanSchemaCache;
}

function resolveColumnValue(columnName, firstFileName, secondFileName, percentage, schema) {
  const file1Names = new Set(["file_name_1", "file_a", "file1", "file_1", "document_1", "doc_1"]);
  const file2Names = new Set(["file_name_2", "file_b", "file2", "file_2", "document_2", "doc_2"]);
  const similarityNames = new Set(["similarity", "similarity_score", "score"]);
  const dateNames = new Set(["created_at", "scan_date", "createdon", "created_on", "timestamp", "createdat"]);

  if (file1Names.has(columnName)) {
    return firstFileName;
  }

  if (file2Names.has(columnName)) {
    return secondFileName;
  }

  if (similarityNames.has(columnName)) {
    return fitNumericValue(percentage, schema.columnMeta[columnName]);
  }

  if (dateNames.has(columnName)) {
    return new Date();
  }

  return undefined;
}

async function extractFileText(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".txt") {
    return fs.readFile(file.path, "utf8");
  }

  if (extension === ".pdf") {
    const buffer = await fs.readFile(file.path);
    if (typeof pdfParseModule === "function") {
      const parsed = await pdfParseModule(buffer);
      return parsed.text || "";
    }

    if (pdfParseModule && typeof pdfParseModule.PDFParse === "function") {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText();
        if (typeof parsed === "string") {
          return parsed;
        }
        return parsed?.text || "";
      } finally {
        if (typeof parser.destroy === "function") {
          await parser.destroy();
        }
      }
    }

    throw new Error("Unsupported pdf-parse API version.");
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
    const schema = await resolveScanResultsSchema();

    if (!schema.file1 || !schema.file2 || !schema.similarity) {
      throw new Error(
        "scan_results table is missing required columns. Expected file_name_1/file_name_2/similarity (or compatible aliases)."
      );
    }

    const extractedFiles = [];
    const skippedFiles = [];

    for (const file of uploadedFiles) {
      try {
        const text = await extractFileText(file);
        extractedFiles.push({
          originalname: file.originalname,
          tokens: tokenize(text)
        });
      } catch (error) {
        skippedFiles.push({
          file: file.originalname,
          reason: error.message
        });
      }
    }

    if (extractedFiles.length < 2) {
      const reason = skippedFiles.length
        ? `Only ${extractedFiles.length} readable file(s). Skipped: ${skippedFiles.map((x) => x.file).join(", ")}`
        : "Need at least 2 readable files.";
      throw new Error(reason);
    }

    const requiredColumns = schema.columns
      .filter((column) => !column.nullable && !column.hasDefault && !column.isAutoIncrement)
      .map((column) => column.name);

    const insertColumnSet = new Set([schema.file1, schema.file2, schema.similarity].filter(Boolean));
    requiredColumns.forEach((requiredColumn) => insertColumnSet.add(requiredColumn));
    const insertColumns = [...insertColumnSet];

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

        const rowValues = insertColumns.map((columnName) => {
          const value = resolveColumnValue(
            columnName,
            firstFile.originalname,
            secondFile.originalname,
            percentage,
            schema
          );

          if (value === undefined) {
            throw new Error(`Unsupported required column "${columnName}" in scan_results.`);
          }

          return value;
        });

        insertValues.push(rowValues);
      }
    }

    if (insertValues.length > 0) {
      const escapedColumns = insertColumns.map((column) => `\`${column}\``).join(", ");
      await pool.query(
        `INSERT INTO scan_results (${escapedColumns}) VALUES ?`,
        [insertValues]
      );
    }

    res.status(200).json({
      success: true,
      total_files: extractedFiles.length,
      total_pairs: results.length,
      skipped_files: skippedFiles,
      results
    });
  } catch (error) {
    console.error("Scan processing failed:", error);
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
    const schema = await resolveScanResultsSchema();

    if (!schema.file1 || !schema.file2 || !schema.similarity) {
      throw new Error(
        "scan_results table is missing required columns. Expected file_name_1/file_name_2/similarity (or compatible aliases)."
      );
    }

    const idSelect = schema.id ? `\`${schema.id}\` AS id` : "NULL AS id";
    const createdSelect = schema.createdAt ? `\`${schema.createdAt}\` AS created_at` : "CURRENT_TIMESTAMP AS created_at";
    const orderBy = schema.createdAt
      ? `ORDER BY \`${schema.createdAt}\` DESC`
      : schema.id
        ? `ORDER BY \`${schema.id}\` DESC`
        : "";

    const [rows] = await pool.query(
      `SELECT ${idSelect}, \`${schema.file1}\` AS file_name_1, \`${schema.file2}\` AS file_name_2, \`${schema.similarity}\` AS similarity, ${createdSelect} FROM scan_results ${orderBy}`
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
