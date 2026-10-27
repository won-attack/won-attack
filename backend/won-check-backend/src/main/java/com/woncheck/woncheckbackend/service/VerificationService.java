package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.dto.Models.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class VerificationService {
    private final RagService rag;
    private final OpenAiService ai;
    @Value("${woncheck.mode:mock}")
    private String mode;

    public VerificationService(RagService rag, OpenAiService ai) {
        this.rag = rag;
        this.ai = ai;
    }

    public Verification verify(Claim claim) {
        if (claim.claimType().equals("PREDICTION"))
            return new Verification(claim.claimId(), claim.claim(), claim.claimType(), "PREDICTION", "미래 주가에 대한 확정적 예측은 공시로 검증할 수 없습니다.", List.of());
        if (mode.equals("mock")) {
            // Mock mode intentionally does NOT make factual verdicts without GPT/evidence verification.
            return new Verification(claim.claimId(), claim.claim(), claim.claimType(),
                    "INSUFFICIENT_EVIDENCE", "Mock 모드: 실제 GPT 근거 대조를 수행하지 않았습니다.", List.of());
        }
        if (claim.companies().isEmpty())
            return new Verification(claim.claimId(), claim.claim(), claim.claimType(), "INSUFFICIENT_EVIDENCE", "주장의 대상 회사를 식별할 수 없습니다.", List.of());
        Map<String, EvidenceDto> byId = new LinkedHashMap<>();
        for (String company : claim.companies()) {
            for (EvidenceDto item : rag.search(claim.claim(), company, claim.period()))
                byId.putIfAbsent(item.documentId(), item);
        }
        List<EvidenceDto> evidence = new ArrayList<>(byId.values());
        if (evidence.isEmpty())
            return new Verification(claim.claimId(), claim.claim(), claim.claimType(), "INSUFFICIENT_EVIDENCE", "검색된 공식 근거가 없습니다.", List.of());
        StringBuilder context = new StringBuilder();
        for (EvidenceDto e : evidence)
            context.append("[id=").append(e.documentId()).append(", period=").append(e.period())
                    .append(", title=").append(e.title()).append("] ").append(e.text()).append("\n");
        JsonNode answer = ai.json("Compare claim strictly with supplied evidence, never assume similarity implies truth. Return {\"status\":\"SUPPORTED|CONTRADICTED|INSUFFICIENT_EVIDENCE\",\"reason\":\"Korean explanation\"}. If evidence is inadequate, choose INSUFFICIENT_EVIDENCE.", "Claim: " + claim.claim() + "\nEvidence:\n" + context);
        String status = answer.path("status").asText("INSUFFICIENT_EVIDENCE");
        if (!Set.of("SUPPORTED", "CONTRADICTED", "INSUFFICIENT_EVIDENCE").contains(status))
            status = "INSUFFICIENT_EVIDENCE";
        List<Source> sources = evidence.stream().filter(e -> e.sourceUrl() != null && e.sourceUrl().startsWith("https://")).map(e -> new Source(e.documentId(), e.title(), e.period(), e.sourceUrl())).toList();
        return new Verification(claim.claimId(), claim.claim(), claim.claimType(), status, answer.path("reason").asText("근거가 충분하지 않습니다."), sources);
    }
}
