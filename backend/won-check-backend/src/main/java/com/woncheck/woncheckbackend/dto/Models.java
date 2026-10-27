package com.woncheck.woncheckbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public final class Models {
    private Models() {}
    public record AnalyzeRequest(@JsonProperty("video_url") @NotBlank String videoUrl,
                                 @JsonProperty("user_id") @NotBlank String userId) {}
    public record Video(String videoId, String title, String url) {}
    public record Claim(String claimId, String claim, String claimType) {}
    public record EvidenceDto(String documentId, String text, String title, String period, String sourceUrl) {}
    public record Source(@JsonProperty("document_id") String documentId, String title, String period,
                         @JsonProperty("source_url") String sourceUrl) {}
    public record Verification(@JsonProperty("claim_id") String claimId, String claim,
                               @JsonProperty("claim_type") String claimType, String status,
                               String reason, List<Source> sources) {}
    public record PersonalizedAnalysis(String summary, @JsonProperty("risk_factors") List<String> riskFactors) {}
    public record AnalyzeResponse(Video video, @JsonProperty("verification_results") List<Verification> verificationResults,
                                  @JsonProperty("personalized_analysis") PersonalizedAnalysis personalizedAnalysis,
                                  @JsonProperty("analyzed_at") String analyzedAt) {}
    public record ApiError(Error error) { public record Error(String code, String message) {} }
}
