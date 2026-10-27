package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChromaRagServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final List<Double> vector = List.of(0.1, 0.2);
    private EmbeddingService embedding;
    private ChromaClient chroma;
    private ChromaRagService service;

    @BeforeEach
    void setUp() {
        embedding = mock(EmbeddingService.class);
        chroma = mock(ChromaClient.class);
        service = new ChromaRagService(embedding, chroma,
                new DataService(mapper, "src/test/resources/repo-data", false));
        ReflectionTestUtils.setField(service, "mode", "live");
        ReflectionTestUtils.setField(service, "topK", 3);
        when(embedding.embed("claim")).thenReturn(vector);
    }

    @Test
    void appliesCompanyAndPeriodBeforeTopK() throws Exception {
        when(chroma.query(vector, 3, filter("현대자동차", "2026-Q2"))).thenReturn(result("hyundai", "2026-Q2"));
        assertEquals("hyundai", service.search("claim", "현대자동차", "2026-Q2").getFirst().documentId());
        verify(chroma).query(vector, 3, filter("현대자동차", "2026-Q2"));
        verifyNoMoreInteractions(chroma);
    }

    @Test
    void fallsBackToCompanyOnlyWhenPeriodHasNoResults() throws Exception {
        when(chroma.query(vector, 3, filter("SK하이닉스", "2026-Q2"))).thenReturn(empty());
        when(chroma.query(vector, 3, Map.of("company", "SK하이닉스"))).thenReturn(result("hynix", "2026-Q1"));
        assertEquals("hynix", service.search("claim", "SK하이닉스", "2026-Q2").getFirst().documentId());
        verify(embedding, times(1)).embed("claim");
    }

    @Test
    void collectsOneEvidencePerQuarterInRange() throws Exception {
        for (int quarter = 1; quarter <= 3; quarter++)
            when(chroma.query(vector, 1, filter("삼성전자", "2026-Q" + quarter)))
                    .thenReturn(result("samsung-q" + quarter, "2026-Q" + quarter));
        var results = service.search("claim", "삼성전자", "2026-Q1~Q3");
        assertEquals(List.of("samsung-q1", "samsung-q2", "samsung-q3"),
                results.stream().map(item -> item.documentId()).toList());
        verify(embedding, times(1)).embed("claim");
        verify(chroma, never()).query(vector, 3, Map.of("company", "삼성전자"));
    }

    @Test
    void rangeWithoutResultsFallsBackAndHonorsConfiguredTopK() throws Exception {
        ReflectionTestUtils.setField(service, "topK", 5);
        when(chroma.query(vector, 1, filter("삼성전자", "2026-Q1"))).thenReturn(empty());
        when(chroma.query(vector, 1, filter("삼성전자", "2026-Q2"))).thenReturn(empty());
        when(chroma.query(vector, 5, Map.of("company", "삼성전자"))).thenReturn(result("fallback", "2025-FY"));
        assertEquals("fallback", service.search("claim", "삼성전자", "2026-Q1~Q2").getFirst().documentId());
    }

    @Test
    void unknownCompanyDoesNotSearchUnrelatedDocuments() {
        assertTrue(service.search("claim", null, null).isEmpty());
        verifyNoInteractions(chroma, embedding);
    }

    @Test
    void mockFiltersCompaniesAndUsesPeriodFallbackWithoutNetwork() {
        ReflectionTestUtils.setField(service, "mode", "mock");
        assertTrue(service.search("claim", "현대자동차", null).isEmpty());
        assertEquals("samsung_002", service.search("claim", "삼성전자", "2026-Q2").getFirst().documentId());
        verifyNoInteractions(chroma, embedding);
    }

    private Map<String, Object> filter(String company, String period) {
        return Map.of("$and", List.of(Map.of("company", company), Map.of("period", period)));
    }

    private JsonNode empty() throws Exception {
        return mapper.readTree("{\"ids\":[[]],\"documents\":[[]],\"metadatas\":[[]]}");
    }

    private JsonNode result(String id, String period) {
        return mapper.valueToTree(Map.of("ids", List.of(List.of(id)), "documents", List.of(List.of("evidence")),
                "metadatas", List.of(List.of(Map.of("source_title", "공시", "period", period, "source_url", "https://example.org")))));
    }
}
