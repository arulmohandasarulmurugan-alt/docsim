package com.apple.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "similarity_records")
public class SimilarityRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileName1;

    @Column(nullable = false)
    private String fileName2;

    @Column(nullable = false)
    private Double similarityPercentage;

    @Column(nullable = false)
    private LocalDateTime dateTime;

    public SimilarityRecord() {}

    public SimilarityRecord(String fileName1, String fileName2, Double similarityPercentage) {
        this.fileName1 = fileName1;
        this.fileName2 = fileName2;
        this.similarityPercentage = similarityPercentage;
        this.dateTime = LocalDateTime.now();
    }

    // ── Getters & Setters ──

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFileName1() { return fileName1; }
    public void setFileName1(String fileName1) { this.fileName1 = fileName1; }

    public String getFileName2() { return fileName2; }
    public void setFileName2(String fileName2) { this.fileName2 = fileName2; }

    public Double getSimilarityPercentage() { return similarityPercentage; }
    public void setSimilarityPercentage(Double similarityPercentage) { this.similarityPercentage = similarityPercentage; }

    public LocalDateTime getDateTime() { return dateTime; }
    public void setDateTime(LocalDateTime dateTime) { this.dateTime = dateTime; }
}
