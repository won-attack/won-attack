package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.dto.Models.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class VerificationServiceTest {
    private RagService rag;
    private OpenAiService ai;
    private VerificationService service;

    @BeforeEach
    void setUp() {
        rag = mock(RagService.class);
        ai = mock(OpenAiService.class);
        service = new VerificationService(rag, ai);
        ReflectionTestUtils.setField(service, "mode", "live");
    }

    @Test
    void searchesEveryClaimCompanyWithExtractedPeriod() throws Exception {
        when(rag.search("두 회사 비교", "SK하이닉스", "2026-Q2")).thenReturn(List.of(evidence("hynix")));
        when(rag.search("두 회사 비교", "현대자동차", "2026-Q2")).thenReturn(List.of(evidence("hyundai")));
        when(ai.json(anyString(), anyString())).thenReturn(new ObjectMapper().readTree(
                "{\"status\":\"SUPPORTED\",\"reason\":\"공시와 부합\"}"));
        var result = service.verify(new Claim("c1", "두 회사 비교", "FINANCIAL",
                List.of("SK하이닉스", "현대자동차"), "2026-Q2"));
        assertEquals(2, result.sources().size());
        verify(rag).search("두 회사 비교", "SK하이닉스", "2026-Q2");
        verify(rag).search("두 회사 비교", "현대자동차", "2026-Q2");
        verifyNoMoreInteractions(rag);
        verify(ai).json(anyString(), argThat(context -> context.contains("hynix") && context.contains("hyundai")));
    }

    @Test
    void unknownCompanyReturnsInsufficientEvidenceWithoutSearchingSamsung() {
        var result = service.verify(new Claim("c1", "매출 증가", "FINANCIAL", List.of(), null));
        assertEquals("INSUFFICIENT_EVIDENCE", result.status());
        verifyNoInteractions(rag, ai);
    }

    @Test
    void predictionsSkipSearchAndLlm() {
        assertEquals("PREDICTION", service.verify(new Claim("c1", "주가 예측", "PREDICTION",
                List.of("현대자동차"), null)).status());
        verifyNoInteractions(rag, ai);
    }

    private EvidenceDto evidence(String id) {
        return new EvidenceDto(id, "공시 본문", "실적 발표", "2026-Q2", "https://example.org/" + id);
    }
}
