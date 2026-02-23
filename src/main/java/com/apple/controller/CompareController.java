package com.apple.controller;

import com.apple.model.SimilarityRecord;
import com.apple.repository.SimilarityRepository;
import com.apple.service.JaccardService;
import com.apple.service.TextExtractorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api")
public class CompareController {

    private final JaccardService jaccardService;
    private final TextExtractorService textExtractorService;
    private final SimilarityRepository repository;

    public CompareController(JaccardService jaccardService,
                             TextExtractorService textExtractorService,
                             SimilarityRepository repository) {
        this.jaccardService = jaccardService;
        this.textExtractorService = textExtractorService;
        this.repository = repository;
    }

    /* ── Double file compare ── */
    @PostMapping("/compare")
    public ResponseEntity<?> compare(@RequestParam("file1") MultipartFile file1,
                                     @RequestParam("file2") MultipartFile file2) {
        try {
            String text1 = textExtractorService.extract(file1);
            String text2 = textExtractorService.extract(file2);

            double similarity = jaccardService.calculateSimilarity(text1, text2);

            SimilarityRecord record = new SimilarityRecord(
                    file1.getOriginalFilename(),
                    file2.getOriginalFilename(),
                    similarity
            );
            repository.save(record);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("file1", file1.getOriginalFilename());
            result.put("file2", file2.getOriginalFilename());
            result.put("similarity", similarity);
            result.put("id", record.getId());

            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to read files: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /* ── Bulk compare (all pairs) ── */
    @PostMapping("/bulk-compare")
    public ResponseEntity<?> bulkCompare(@RequestParam("files") MultipartFile[] files) {
        if (files.length < 2) {
            return ResponseEntity.badRequest().body(Map.of("error", "At least 2 files required"));
        }

        try {
            // Extract text from all files
            String[] texts = new String[files.length];
            for (int i = 0; i < files.length; i++) {
                texts[i] = textExtractorService.extract(files[i]);
            }

            // Compare all pairs
            List<Map<String, Object>> results = new ArrayList<>();
            for (int i = 0; i < files.length; i++) {
                for (int j = i + 1; j < files.length; j++) {
                    double similarity = jaccardService.calculateSimilarity(texts[i], texts[j]);

                    SimilarityRecord record = new SimilarityRecord(
                            files[i].getOriginalFilename(),
                            files[j].getOriginalFilename(),
                            similarity
                    );
                    repository.save(record);

                    Map<String, Object> pair = new LinkedHashMap<>();
                    pair.put("file1", files[i].getOriginalFilename());
                    pair.put("file2", files[j].getOriginalFilename());
                    pair.put("similarity", similarity);
                    pair.put("id", record.getId());
                    results.add(pair);
                }
            }

            return ResponseEntity.ok(results);
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to read files: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /* ── Get all records ── */
    @GetMapping("/records")
    public ResponseEntity<List<SimilarityRecord>> getRecords() {
        return ResponseEntity.ok(repository.findAllByOrderByDateTimeDesc());
    }
}
