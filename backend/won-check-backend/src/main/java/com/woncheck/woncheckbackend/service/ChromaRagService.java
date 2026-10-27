package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.dto.Models.EvidenceDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChromaRagService implements RagService {
    private static final Pattern QUARTER_RANGE = Pattern.compile("(20\\d{2})-Q([1-4])~Q([1-4])");
    private final EmbeddingService embedding;
    private final ChromaClient chroma;
    private final DataService data;
    @Value("${woncheck.mode:mock}") private String mode;
    @Value("${woncheck.search.top-k:3}") private int topK;

    public ChromaRagService(EmbeddingService embedding, ChromaClient chroma, DataService data) {
        this.embedding = embedding;
        this.chroma = chroma;
        this.data = data;
    }

    public List<EvidenceDto> search(String claim, String company, String period) {
        if (company == null || company.isBlank()) return List.of();
        if (topK < 1) throw new IllegalStateException("SEARCH_TOP_K must be positive");
        BiFunction<String, Integer, List<EvidenceDto>> query;
        if (mode.equals("mock")) {
            JsonNode records = data.load("disclosures.json");
            query = (selectedPeriod, count) -> mockQuery(records, company, selectedPeriod, count);
        } else {
            List<Double> vector = embedding.embed(claim);
            query = (selectedPeriod, count) -> from(chroma.query(vector, count, where(company, selectedPeriod)));
        }

        // Match data/check_db.py: one result per quarter, then company-only fallback.
        Matcher range = QUARTER_RANGE.matcher(period == null ? "" : period);
        if (range.matches()) {
            int start = Integer.parseInt(range.group(2)), end = Integer.parseInt(range.group(3));
            Map<String, EvidenceDto> merged = new LinkedHashMap<>();
            for (int quarter = start; quarter <= end; quarter++) {
                for (EvidenceDto item : query.apply(range.group(1) + "-Q" + quarter, 1))
                    merged.putIfAbsent(item.documentId(), item);
            }
            if (!merged.isEmpty()) return new ArrayList<>(merged.values());
        } else if (period != null && !period.isBlank()) {
            List<EvidenceDto> results = query.apply(period, topK);
            if (!results.isEmpty()) return results;
        }
        return query.apply(null, topK);
    }

    private Map<String, Object> where(String company, String period) {
        Map<String, Object> companyFilter = Map.of("company", company);
        if (period == null || period.isBlank()) return companyFilter;
        return Map.of("$and", List.of(companyFilter, Map.of("period", period)));
    }

    private List<EvidenceDto> from(JsonNode root) {
        JsonNode ids = root.path("ids").path(0);
        JsonNode docs = root.path("documents").path(0);
        JsonNode metas = root.path("metadatas").path(0);
        List<EvidenceDto> results = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            JsonNode metadata = metas.path(i);
            results.add(new EvidenceDto(ids.path(i).asText(), docs.path(i).asText(),
                    metadata.path("title").asText(metadata.path("source_title").asText()),
                    metadata.path("period").asText(), metadata.path("source_url").asText()));
        }
        return results;
    }

    private List<EvidenceDto> mockQuery(JsonNode records, String company, String period, int count) {
        List<EvidenceDto> results = new ArrayList<>();
        for (JsonNode record : records) {
            JsonNode metadata = record.path("metadata");
            if (!company.equals(metadata.path("company").asText())) continue;
            if (period != null && !period.equals(metadata.path("period").asText())) continue;
            results.add(new EvidenceDto(record.path("id").asText(), record.path("document").asText(),
                    metadata.path("source_title").asText(), metadata.path("period").asText(),
                    metadata.path("source_url").asText()));
            if (results.size() == count) break;
        }
        return results;
    }
}
