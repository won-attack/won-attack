package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.config.EmbeddingSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChromaClient {
    private final RestClient http;
    @Value("${woncheck.chroma.url:http://localhost:8000}") private String url;
    private final EmbeddingSettings settings;
    @Value("${woncheck.chroma.tenant:default_tenant}") private String tenant = "default_tenant";
    @Value("${woncheck.chroma.database:default_database}") private String database = "default_database";

    public ChromaClient(RestClient http, EmbeddingSettings settings) {
        this.http = http;
        this.settings = settings;
    }

    private String collectionsUrl() {
        return UriComponentsBuilder.fromUriString(url.replaceAll("/+$", ""))
                .pathSegment("api", "v2", "tenants", tenant, "databases", database, "collections")
                .build().encode().toUriString();
    }

    public String collectionId() {
        JsonNode result = http.post().uri(collectionsUrl())
                .body(Map.of("name", settings.collection(), "get_or_create", true,
                        "metadata", Map.of("hnsw:space", "cosine")))
                .retrieve().body(JsonNode.class);
        String id = result == null ? "" : result.path("id").asText();
        if (id.isBlank()) throw new IllegalStateException("Chroma collection id missing");
        return id;
    }

    public void upsert(List<String> ids, List<String> documents, List<List<Double>> embeddings,
                       List<Map<String, Object>> metadata) {
        http.post().uri(collectionsUrl() + "/" + collectionId() + "/upsert")
                .body(Map.of("ids", ids, "documents", documents, "embeddings", embeddings, "metadatas", metadata))
                .retrieve().toBodilessEntity();
    }

    public JsonNode query(List<Double> vector, int count, Map<String, Object> where) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("query_embeddings", List.of(vector));
        payload.put("n_results", count);
        payload.put("include", List.of("documents", "metadatas", "distances"));
        if (where != null && !where.isEmpty()) payload.put("where", where);
        JsonNode result = http.post().uri(collectionsUrl() + "/" + collectionId() + "/query")
                .body(payload).retrieve().body(JsonNode.class);
        if (result == null) throw new IllegalStateException("Chroma query returned an empty response");
        return result;
    }
}
