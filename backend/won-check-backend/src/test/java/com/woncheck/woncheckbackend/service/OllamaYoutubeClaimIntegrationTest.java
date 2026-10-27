package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@EnabledIfEnvironmentVariable(named = "WONCHECK_RUN_CLAIM_INTEGRATION", matches = "true")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "woncheck.mode=live",
        "woncheck.llm.provider=ollama",
        "woncheck.ollama.base-url=http://127.0.0.1:11434/v1",
        "woncheck.ollama.chat-model=${WONCHECK_CLAIM_MODEL:qwen3:4b-instruct}",
        "woncheck.openai.api-key=",
        "woncheck.data.path=../../data",
        "woncheck.data.allow-sample-fallback=false"
})
class OllamaYoutubeClaimIntegrationTest {
    @Autowired ClaimService claims;
    @Autowired DataService data;
    @Autowired ObjectMapper mapper;
    @MockitoSpyBean OpenAiService ai;

    @Test void extractsFromActualWhisperTranscriptAndRecordsRawModelResponse() throws Exception {
        String id = "48WVf1ijerc";
        JsonNode source = data.load("youtube_transcripts.json").path(id);
        assertEquals("OPENAI_WHISPER_1", source.path("transcript_source").asText());
        assertEquals(id, data.video("https://www.youtube.com/watch?v=" + id).videoId());
        String transcript = data.transcript(id);
        assertEquals(source.path("transcript").asText(), transcript);

        // Observe the real API return value, without replacing or fabricating the response.
        AtomicReference<JsonNode> raw = new AtomicReference<>();
        doAnswer(invocation -> {
            JsonNode response = (JsonNode) invocation.callRealMethod();
            raw.set(response.deepCopy());
            return response;
        }).when(ai).json(anyString(), anyString());
        assertEquals(java.time.LocalDate.of(2026, 1, 8), data.publishedDate(id));
        var result = claims.extract(transcript, data.publishedDate(id));
        Path output = Path.of("build", "claim-validation", "ollama-" + id + ".json");
        Files.createDirectories(output.getParent());
        mapper.writerWithDefaultPrettyPrinter().writeValue(output.toFile(), Map.of(
                "video_id", id, "transcript_source", "OPENAI_WHISPER_1",
                "raw_model_response", raw.get(), "processed_claims", result));
        System.out.println("Real video model response: " + mapper.writeValueAsString(raw.get()));
        System.out.println("Processed claims: " + mapper.writeValueAsString(result));

        verify(ai).json(anyString(), eq(transcript));
        assertAll(
                () -> assertTrue(result.size() >= 1 && result.size() <= 3, "Expected 1-3 claims"),
                () -> assertTrue(result.stream().anyMatch(c -> c.claimType().equals("FINANCIAL")), "Financial reporting should yield financial claims"),
                () -> assertTrue(result.stream().anyMatch(c -> "2025-Q4".equals(c.period())), "Last year's Q4 is 2025-Q4"),
                () -> assertTrue(result.stream().anyMatch(c -> "2025-FY".equals(c.period())), "Last year's annual revenue is 2025-FY"),
                () -> assertTrue(result.stream().noneMatch(c -> c.period() != null && c.period().startsWith("2023")), "Reject unsupported 2023 periods"),
                () -> {
                    for (var claim : result) assertEquals(List.of("삼성전자"), claim.companies());
                },
                () -> {
                    for (var claim : result) {
                        String text = claim.claim().replaceAll("\\s+", "");
                        if (text.contains("16조") || text.contains("17조")) {
                            assertEquals("PREDICTION", claim.claimType(), "Unreleased analyst estimate");
                            assertTrue(text.contains("증권업계") || text.contains("추정") || text.contains("예상"),
                                    "Keep the attribution/uncertainty of analyst estimates");
                        }
                    }
                }
        );
    }
}
