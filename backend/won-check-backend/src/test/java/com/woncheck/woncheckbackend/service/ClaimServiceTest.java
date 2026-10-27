package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.dto.Models.Claim;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

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
}
