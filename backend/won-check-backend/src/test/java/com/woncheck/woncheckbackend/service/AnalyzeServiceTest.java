package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.dto.Models.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyzeServiceTest {
    private final DataService data = mock(DataService.class);
    private final ClaimService claims = mock(ClaimService.class);
    private final VerificationService verifier = mock(VerificationService.class);
    private final PersonalizationService personalization = mock(PersonalizationService.class);
    private final AnalyzeService service = new AnalyzeService(data, claims, verifier, personalization);
    private final AnalyzeRequest request = new AnalyzeRequest("https://youtu.be/PIPEtest001", "demo_user_01");

    @BeforeEach void setUp() {
        when(data.video(request.videoUrl())).thenReturn(new Video("PIPEtest001", "전사 영상", request.videoUrl()));
        when(data.transcript("PIPEtest001")).thenReturn("새 영상의 음성 전사문입니다.");
    }

    @Test void noClaimsReturnsAnExplicitResultWithoutVerificationOrReportGeneration() throws Exception {
        when(data.user("demo_user_01")).thenReturn(new ObjectMapper().readTree("{\"user_id\":\"demo_user_01\"}"));
        when(claims.extract("새 영상의 음성 전사문입니다.")).thenReturn(List.of());

        var result = service.analyze(request);

        assertEquals("PIPEtest001", result.video().videoId());
        assertTrue(result.verificationResults().isEmpty());
        assertEquals("영상 대본에서 검증할 투자 주장을 찾지 못했습니다.", result.personalizedAnalysis().summary());
        assertTrue(result.personalizedAnalysis().riskFactors().isEmpty());
        verifyNoInteractions(verifier, personalization);
    }

    @Test void passesNewTranscriptToExtractionAndUserWithEvidenceToPersonalization() throws Exception {
        var user = new ObjectMapper().readTree("{\"user_id\":\"demo_user_01\",\"risk_tolerance\":\"안정형\"}");
        when(data.user("demo_user_01")).thenReturn(user);
        var claim = new Claim("claim_001", "현대차 매출 주장", "FINANCIAL", List.of("현대자동차"), "2026-Q2");
        var verification = new Verification("claim_001", claim.claim(), claim.claimType(), "INSUFFICIENT_EVIDENCE",
                "확인이 필요합니다.", List.of(new Source("hyundai_006", "실적 발표", "2026-Q2", "https://example.com/ir")));
        var report = new PersonalizedAnalysis("사용자 맞춤 설명", List.of("확인할 위험 요인"));
        when(claims.extract("새 영상의 음성 전사문입니다.")).thenReturn(List.of(claim));
        when(verifier.verify(claim)).thenReturn(verification);
        when(personalization.analyze(user, List.of(verification))).thenReturn(report);

        var result = service.analyze(request);

        assertEquals(List.of(verification), result.verificationResults());
        assertEquals(report, result.personalizedAnalysis());
        assertEquals("hyundai_006", result.verificationResults().getFirst().sources().getFirst().documentId());
        verify(personalization).analyze(user, List.of(verification));
    }
}
