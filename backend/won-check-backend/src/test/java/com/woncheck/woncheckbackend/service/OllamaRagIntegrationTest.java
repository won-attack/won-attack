package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/** Explicit opt-in: requires local Ollama and the ingested Chroma test collection. */
@EnabledIfEnvironmentVariable(named = "WONCHECK_RUN_OLLAMA_INTEGRATION", matches = "true")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "woncheck.mode=live",
        "woncheck.openai.api-key=",
        "woncheck.embedding.provider=ollama",
        "woncheck.ollama.base-url=http://127.0.0.1:11434/v1",
        "woncheck.ollama.embedding-model=bge-m3:latest",
        "woncheck.chroma.url=http://127.0.0.1:8000",
        "woncheck.chroma.collection=disclosures",
        "woncheck.data.path=../../data",
        "woncheck.data.allow-sample-fallback=false"
})
class OllamaRagIntegrationTest {
    @Autowired ChromaRagService rag;
    @Autowired DataService data;

    @Test void retrievesExpectedEvidenceForSevenClaims() {
        Map<String, String> companyById = new HashMap<>();
        for (JsonNode row : data.load("disclosures.json")) {
            companyById.put(row.path("id").asText(), row.path("metadata").path("company").asText());
        }
        int checked = 0;
        for (JsonNode video : data.load("expected_results.json").path("videos")) {
            for (JsonNode claim : video.path("claims")) {
                if (claim.path("expected_sources").isEmpty()) continue;
                String period = claim.path("period").isNull() ? null : claim.path("period").asText();
                for (JsonNode companyNode : claim.path("companies")) {
                    String company = companyNode.asText();
                    var results = rag.search(claim.path("text").asText(), company, period);
                    Set<String> expected = new HashSet<>();
                    for (JsonNode id : claim.path("expected_sources")) {
                        if (company.equals(companyById.get(id.asText()))) expected.add(id.asText());
                    }
                    String label = video.path("video_id").asText() + "/" + claim.path("expected_status").asText();
                    assertTrue(results.size() <= 3, label + ": more than three results");
                    assertTrue(expected.isEmpty() || results.stream().anyMatch(r -> expected.contains(r.documentId())),
                            label + ": expected " + expected + ", got " + results.stream().map(r -> r.documentId()).toList());
                    for (var result : results) {
                        assertEquals(company, companyById.get(result.documentId()), label + ": wrong company");
                        assertFalse(result.title().isBlank(), label + ": missing title");
                        assertTrue(result.sourceUrl().startsWith("https://"), label + ": missing source URL");
                    }
                    System.out.println("Spring RAG PASS: " + label + " -> " + results.stream().map(r -> r.documentId()).toList());
                }
                checked++;
            }
        }
        assertEquals(7, checked, "Expected seven evidence-search claims");
    }
}
