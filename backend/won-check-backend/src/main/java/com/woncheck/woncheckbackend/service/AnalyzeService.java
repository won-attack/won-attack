package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.dto.Models.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class AnalyzeService {
    private final DataService data;
    private final ClaimService claims;
    private final VerificationService verifier;
    private final PersonalizationService personalization;

    public AnalyzeService(DataService data, ClaimService claims, VerificationService verifier, PersonalizationService personalization) {
        this.data = data;
        this.claims = claims;
        this.verifier = verifier;
        this.personalization = personalization;
    }

    public AnalyzeResponse analyze(AnalyzeRequest request) {
        Video video = data.video(request.videoUrl());
        JsonNode user = data.user(request.userId());
        String transcript = data.transcript(video.videoId());
        List<Claim> extractedClaims = claims.extract(transcript);
        if (extractedClaims.isEmpty()) {
            return new AnalyzeResponse(video, List.of(), new PersonalizedAnalysis(
                    "영상 대본에서 검증할 투자 주장을 찾지 못했습니다.", List.of()), Instant.now().toString());
        }
        List<Verification> results = new ArrayList<>();
        for (Claim claim : extractedClaims) results.add(verifier.verify(claim));
        return new AnalyzeResponse(video, results, personalization.analyze(user, results), Instant.now().toString());
    }
}
