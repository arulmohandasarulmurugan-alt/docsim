package com.apple.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class TextExtractorService {

    /**
     * Extracts plain text from a MultipartFile based on its extension.
     */
    public String extract(MultipartFile file) throws IOException {
        String name = file.getOriginalFilename();
        if (name == null) throw new IllegalArgumentException("File has no name");

        String ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase();

        return switch (ext) {
            case "txt", "java", "html", "csv", "json" -> extractPlainText(file);
            case "pdf"  -> extractPdf(file);
            case "docx" -> extractDocx(file);
            default -> throw new IllegalArgumentException("Unsupported file type: ." + ext);
        };
    }

    /* ── Plain text (txt, java, html, csv, json) ── */
    private String extractPlainText(MultipartFile file) throws IOException {
        return new String(file.getBytes(), StandardCharsets.UTF_8);
    }

    /* ── PDF via Apache PDFBox 3.x ── */
    private String extractPdf(MultipartFile file) throws IOException {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(doc);
        }
    }

    /* ── DOCX via Apache POI ── */
    private String extractDocx(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(is)) {
            StringBuilder sb = new StringBuilder();
            List<XWPFParagraph> paragraphs = doc.getParagraphs();
            for (XWPFParagraph p : paragraphs) {
                sb.append(p.getText()).append("\n");
            }
            return sb.toString();
        }
    }
}
