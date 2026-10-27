package com.woncheck.woncheckbackend.service;
import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.dto.Models.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class PersonalizationService {
    private final OpenAiService ai;
    @Value("${woncheck.mode:mock}") private String mode;
    public PersonalizationService(OpenAiService ai){this.ai=ai;}
    public PersonalizedAnalysis analyze(JsonNode user,List<Verification> results){
        if(mode.equals("mock")){
            boolean concentrated=false; for (JsonNode holding : user.path("holdings")) { if ("삼성전자".equals(holding.path("company").asText()) && holding.path("weight_pct").asDouble() > 50) concentrated=true; }
            return new PersonalizedAnalysis(concentrated?"삼성전자 비중이 높아 검증되지 않은 투자 주장에 대한 민감도가 큽니다.":"분산된 포트폴리오지만 검증되지 않은 투자 주장을 주의해야 합니다.",concentrated?List.of("단일 종목 집중 위험","검증되지 않은 실적 수치에 따른 판단 위험"):List.of("검증되지 않은 수치에 따른 판단 위험","미래 주가 단정 표현 주의"));
        }
        JsonNode answer=ai.json("Provide cautious Korean educational portfolio risk commentary, not personalized buy/sell instructions. Return {\"summary\":\"...\",\"risk_factors\":[\"...\"]}.","User: "+user+"\nVerifications: "+results);
        List<String> risks=new ArrayList<>();for(JsonNode x:answer.path("risk_factors"))risks.add(x.asText());return new PersonalizedAnalysis(answer.path("summary").asText("투자 판단에 주의가 필요합니다."),risks);
    }
}
