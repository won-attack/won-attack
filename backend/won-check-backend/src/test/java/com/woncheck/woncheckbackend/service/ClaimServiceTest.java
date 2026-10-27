package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.dto.Models.Claim;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ClaimServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private OpenAiService ai;
    private ClaimService service;
    private CompanyService companies;

    @BeforeEach
    void setUp() {
        ai = mock(OpenAiService.class);
        companies = new CompanyService(new DataService(mapper, "src/test/resources/repo-data", false));
        service = new ClaimService(ai, companies);
        ReflectionTestUtils.setField(service, "mode", "live");
    }

    @Test
    void extractsAndNormalizesMultipleCompaniesAndPeriods() throws Exception {
        when(ai.json(anyString(), anyString())).thenReturn(mapper.readTree("""
                {"claims":[
                  {"claim":"하이닉스와 현대차의 매출 비교","claim_type":"FINANCIAL",
                   "companies":["SK hynix","Hyundai Motor"],"period":"2026-Q2"},
                  {"claim":"삼전의 분기별 이익 비교","claim_type":"FINANCIAL",
                   "companies":["Samsung Electronics"],"period":"2026-Q1~Q3"}
                ]}
                """));
        List<Claim> result = service.extract("하이닉스와 현대차 및 삼전의 실적");
        assertEquals(List.of("SK하이닉스", "현대자동차"), result.get(0).companies());
        assertEquals("2026-Q2", result.get(0).period());
        assertEquals(List.of("삼성전자"), result.get(1).companies());
        assertEquals("2026-Q1~Q3", result.get(1).period());
    }

    @Test
    void unknownCompanyAndUncertainPeriodDoNotBecomeSamsungOrCurrentYear() throws Exception {
        when(ai.json(anyString(), anyString())).thenReturn(mapper.readTree("""
                {"claims":[{"claim":"어떤 회사의 3분기 매출","claim_type":"FINANCIAL",
                "companies":["알수없는회사"],"period":null}]}
                """));
        Claim claim = service.extract("어떤 회사의 실적").getFirst();
        assertTrue(claim.companies().isEmpty());
        assertNull(claim.period());
    }

    @Test
    void inheritsCompanyOnlyForUnambiguousTranscript() {
        assertEquals(List.of("현대자동차"), companies.resolve(List.of(), "매출이 증가했습니다", "현대차 실적"));
        assertTrue(companies.resolve(List.of(), "매출이 증가했습니다", "현대차와 하이닉스 비교").isEmpty());
        assertEquals(List.of("SK하이닉스"), companies.resolve(List.of(" sk HYNIX "), "실적", ""));
    }

    @Test
    void mockExtractsMetadataWithoutCallingAi() {
        ReflectionTestUtils.setField(service, "mode", "mock");
        List<Claim> result = service.extract("현대차 2026년 2분기 매출입니다. 이익입니다. 부채입니다. 추가 문장입니다.");
        assertEquals(3, result.size());
        assertEquals(List.of("현대자동차"), result.getFirst().companies());
        assertEquals("2026-Q2", result.getFirst().period());
        assertEquals(List.of("현대자동차"), result.get(1).companies());
        verifyNoInteractions(ai);
    }

    @Test
    void rejectsReversedQuarterRange() throws Exception {
        when(ai.json(anyString(), anyString())).thenReturn(mapper.readTree("""
                {"claims":[{"claim":"현대차 매출","companies":["현대차"],"period":"2026-Q3~Q1"}]}
                """));
        assertNull(service.extract("현대차 매출").getFirst().period());
    }

    @Test
    void sendsPipelineSpeechTextUnchangedAndKeepsForecastType() throws Exception {
        var data = new DataService(mapper, "src/test/resources/repo-data", false);
        String transcript = data.transcript("PIPEtest001");
        when(ai.json(anyString(), anyString())).thenReturn(mapper.readTree("""
                {"claims":[
                  {"claim":"현대차 2026년 2분기 매출입니다.","claim_type":" financial ",
                   "companies":["현대차"],"period":"2026-Q2"},
                  {"claim":"현대차 주가는 내년에 두 배가 될 것이다.","claim_type":"prediction",
                   "companies":["현대차"],"period":null}]}
                """));
        var results = service.extract(transcript);
        var sentTranscript = ArgumentCaptor.forClass(String.class);
        verify(ai).json(anyString(), sentTranscript.capture());
        assertEquals(transcript, sentTranscript.getValue());
        assertEquals("FINANCIAL", results.getFirst().claimType());
        assertEquals("2026-Q2", results.getFirst().period());
        assertEquals("PREDICTION", results.get(1).claimType());
        assertNull(results.get(1).period());
    }

    @Test
    void repeatedSpeechDoesNotUseUpTheThreeClaimLimit() throws Exception {
        when(ai.json(anyString(), anyString())).thenReturn(mapper.readTree("""
                {"claims":[
                  {"claim":"삼성전자 매출 증가.","claim_type":"FINANCIAL"},
                  {"claim":" 삼성전자  매출 증가! ","claim_type":"FINANCIAL"},
                  {"claim":12},{"claim":" "},
                  {"claim":"삼성전자 영업이익 증가.","claim_type":"FINANCIAL"},
                  {"claim":"삼성전자 공시 발표.","claim_type":"DISCLOSURE"},
                  {"claim":"네 번째 주장입니다.","claim_type":"DISCLOSURE"}]}
                """));
        var results = service.extract("삼성전자 실적과 공시");
        assertEquals(3, results.size());
        assertEquals("삼성전자 공시 발표.", results.get(2).claim());
        assertEquals("claim_003", results.get(2).claimId());
    }

    @Test
    void noInvestmentClaimsIsAValidEmptyResult() throws Exception {
        when(ai.json(anyString(), anyString())).thenReturn(mapper.readTree("{\"claims\":[]}"));
        assertTrue(service.extract("오늘 날씨와 행사 소식입니다.").isEmpty());
    }

    @Test
    void malformedClaimResponseFailsInsteadOfLookingLikeNoClaims() throws Exception {
        for (String response : List.of("{}", "{\"claims\":{}}", "{\"claims\":[{\"claim\":123}]}")) {
            when(ai.json(anyString(), anyString())).thenReturn(mapper.readTree(response));
            assertThrows(IllegalStateException.class, () -> service.extract("현대차 실적입니다."));
        }
    }

    @Test
    void blankTranscriptDoesNotCallAi() {
        assertThrows(IllegalArgumentException.class, () -> service.extract("  "));
        assertThrows(IllegalArgumentException.class, () -> service.extract(null));
        verifyNoInteractions(ai);
    }

    @Test
    void mockDoesNotTreatConfirmedResultsOrPastGrowthAsForecasts() {
        ReflectionTestUtils.setField(service, "mode", "mock");
        var results = service.extract("하이닉스 3분기 영업이익이 확정됐습니다. 매출이 두 배 늘었습니다. 내년 주가는 두 배가 됩니다.");
        assertEquals(List.of("FINANCIAL", "FINANCIAL", "PREDICTION"),
                results.stream().map(Claim::claimType).toList());
        verifyNoInteractions(ai);
    }
}
