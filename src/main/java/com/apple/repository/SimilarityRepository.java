package com.apple.repository;

import com.apple.model.SimilarityRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SimilarityRepository extends JpaRepository<SimilarityRecord, Long> {
    List<SimilarityRecord> findAllByOrderByDateTimeDesc();
}
