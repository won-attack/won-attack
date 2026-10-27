package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class DisclosureIngestionService {
    private final DataService data;
    private final EmbeddingService embedding;
    private final ChromaClient chroma;

    public DisclosureIngestionService(DataService data, EmbeddingService embedding, ChromaClient chroma) {
        this.data = data;
        this.embedding = embedding;
        this.chroma = chroma;
    }

    public int ingest() {
        JsonNode records = data.load("disclosures.json");
        if (!records.isArray()) throw new IllegalStateException("disclosures.json must be an array");
        List<String> ids = new ArrayList<>(), documents = new ArrayList<>();
        List<List<Double>> vectors = new ArrayList<>();
        List<Map<String, Object>> metadata = new ArrayList<>();
        for (JsonNode record : records) {
            String id = record.path("id").asText("").trim();
            String document = record.path("document").asText("").trim();
            JsonNode meta = record.path("metadata");
            String url = meta.path("source_url").asText("").trim();
            if (id.isBlank() || document.isBlank() || !url.startsWith("https://")) {
                throw new IllegalStateException("Invalid disclosure id/document/source_url: " + id);
            }
            Map<String, Object> entry = new HashMap<>();
            entry.put("company", meta.path("company").asText(""));
            entry.put("period", meta.path("period").asText(""));
            entry.put("title", meta.path("source_title").asText(""));
            entry.put("source_url", url);
            entry.put("metric", meta.path("metric").asText(""));
            entry.put("segment", meta.path("segment").asText(""));
            ids.add(id);
            documents.add(document);
            vectors.add(embedding.embed(document));
            metadata.add(entry);
        }
        if (!ids.isEmpty()) chroma.upsert(ids, documents, vectors, metadata);
        return ids.size();
    }
}
