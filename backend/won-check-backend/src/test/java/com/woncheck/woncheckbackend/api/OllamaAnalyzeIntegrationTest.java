package com.woncheck.woncheckbackend.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.dto.Models.*;
import com.woncheck.woncheckbackend.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Real local AI/DB calls; MockMvc supplies the HTTP request without opening a server port. */
@EnabledIfEnvironmentVariable(named = "WONCHECK_RUN_ANALYZE_INTEGRATION", matches = "true")
@SpringBootTest(properties = {
        "woncheck.mode=live",
        "woncheck.llm.provider=ollama",
        "woncheck.embedding.provider=ollama",
        "woncheck.ollama.base-url=http://127.0.0.1:11434/v1",
        "woncheck.ollama.chat-model=${WONCHECK_CLAIM_MODEL:qwen3:4b-instruct}",
        "woncheck.ollama.embedding-model=bge-m3:latest",
        "woncheck.openai.api-key=",
        "woncheck.chroma.url=http://127.0.0.1:8000",
        "woncheck.chroma.collection=disclosures",
        "woncheck.search.top-k=3",
        "woncheck.data.path=../../data",
        "woncheck.data.allow-sample-fallback=false",
        "woncheck.ingest.enabled=false"
})
@AutoConfigureMockMvc
class OllamaAnalyzeIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired DataService data;
    @MockitoSpyBean OpenAiService ai;
    @MockitoSpyBean ChromaRagService rag;
    @MockitoSpyBean PersonalizationService personalization;

    @Test void realYoutubeTranscriptThroughVerificationAndPersonalizedReport() throws Exception {
        List<Map<String, Object>> aiCalls = new ArrayList<>();
        List<Map<String, Object>> retrievals = new ArrayList<>();
        doAnswer(call -> {
            JsonNode answer = (JsonNode) call.callRealMethod();
            aiCalls.add(Map.of("system", call.getArgument(0), "input", call.getArgument(1), "response", answer.deepCopy()));
            System.out.println("AI stage completed: " + aiCalls.size());
            return answer;
        }).when(ai).json(anyString(), anyString());
        doAnswer(call -> {
            Object answer = call.callRealMethod();
            Map<String, Object> trace = new LinkedHashMap<>();
            trace.put("claim", call.getArgument(0));
            trace.put("company", call.getArgument(1));
            trace.put("period", call.getArgument(2));
            trace.put("ranked_evidence", answer);
            retrievals.add(trace);
            System.out.println("Chroma retrieval completed: " + retrievals.size());
            return answer;
        }).when(rag).search(anyString(), anyString(), nullable(String.class));

        var request = new AnalyzeRequest("https://www.youtube.com/watch?v=48WVf1ijerc", "demo_user_01");
        var http = mvc.perform(post("/api/analyze").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request))).andReturn().getResponse();
        JsonNode response = mapper.readTree(http.getContentAsByteArray());
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("http_status", http.getStatus());
        report.put("request", request);
        report.put("user", data.user(request.userId()));
        report.put("response", response);
        report.put("retrievals", retrievals);
        report.put("ai_calls", aiCalls);
        report.put("time_context_note", "Video published 2026-01-08; current relevant final disclosures published 2026-01-29. Publication-time filtering is not implemented.");
        Path output = Path.of("build", "end-to-end", "ollama-48WVf1ijerc-demo_user_01.json");
        Files.createDirectories(output.getParent());
        mapper.writerWithDefaultPrettyPrinter().writeValue(output.toFile(), report);

        assertAll(
                () -> assertEquals(200, http.getStatus(), response.toString()),
                () -> assertEquals("48WVf1ijerc", response.path("video").path("videoId").asText()),
                () -> assertEquals(3, response.path("verification_results").size()),
                () -> assertFalse(retrievals.isEmpty(), "Actual Chroma retrieval required"),
                () -> {
                    for (Map<String, Object> trace : retrievals) {
                        @SuppressWarnings("unchecked") var evidence = (List<EvidenceDto>) trace.get("ranked_evidence");
                        assertFalse(evidence.isEmpty(), "Expected evidence for financial claims");
                        assertTrue(evidence.size() <= 3);
                        for (var item : evidence) {
                            assertEquals(trace.get("period"), item.period());
                            assertFalse(item.title().isBlank());
                            assertTrue(item.sourceUrl().startsWith("https://"));
                        }
                    }
                },
                () -> {
                    long verdictCalls = 0;
                    for (Map<String, Object> call : aiCalls) {
                        JsonNode answer = (JsonNode) call.get("response");
                        if (call.get("system").toString().startsWith("Compare claim")) {
                            verdictCalls++;
                            assertTrue(Set.of("SUPPORTED", "CONTRADICTED", "INSUFFICIENT_EVIDENCE").contains(answer.path("status").asText()),
                                    "Invalid raw verdict: " + answer);
                            assertFalse(answer.path("reason").asText().isBlank());
                        }
                    }
                    assertTrue(verdictCalls >= 1, "Real AI verdict call required");
                },
                () -> {
                    assertFalse(response.path("personalized_analysis").path("summary").asText().isBlank());
                    assertTrue(response.path("personalized_analysis").path("risk_factors").size() > 0);
                    verify(personalization).analyze(eq(data.user("demo_user_01")), anyList());
                }
        );
    }
}
