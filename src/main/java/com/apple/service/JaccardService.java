package com.apple.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class JaccardService {

    /**
     * Calculates Jaccard Similarity between two texts (word-based).
     * Formula: |A ∩ B| / |A ∪ B| × 100
     */
    public double calculateSimilarity(String text1, String text2) {
        if (text1 == null || text2 == null) return 0.0;

        Set<String> wordsA = tokenize(text1);
        Set<String> wordsB = tokenize(text2);

        if (wordsA.isEmpty() && wordsB.isEmpty()) return 100.0;
        if (wordsA.isEmpty() || wordsB.isEmpty()) return 0.0;

        Set<String> intersection = new HashSet<>(wordsA);
        intersection.retainAll(wordsB);

        Set<String> union = new HashSet<>(wordsA);
        union.addAll(wordsB);

        double similarity = (double) intersection.size() / union.size() * 100.0;
        return Math.round(similarity * 100.0) / 100.0; // 2 decimal places
    }

    private Set<String> tokenize(String text) {
        String cleaned = text.toLowerCase().replaceAll("[^a-zA-Z0-9\\s]", " ");
        String[] tokens = cleaned.trim().split("\\s+");
        Set<String> words = new HashSet<>();
        for (String token : tokens) {
            if (!token.isBlank()) {
                words.add(token);
            }
        }
        return words;
    }
}
