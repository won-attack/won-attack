package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.dto.Models.Claim;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** Calls local Ollama only; does not query or change Chroma. */
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
class OllamaClaimIntegrationTest {
    @Autowired ClaimService claims;
    @Autowired DataService data;
    @Autowired ObjectMapper mapper;

    @TestFactory List<DynamicTest> extractsClaimsFromDemoTranscripts() {
        List<DynamicTest> tests = new ArrayList<>();
        for (JsonNode video : data.load("expected_results.json").path("videos")) {
            String id = video.path("video_id").asText();
            tests.add(DynamicTest.dynamicTest(id, () -> {
                List<Claim> actual = claims.extract(data.transcript(id));
                Path output = Path.of("build", "claim-validation", "ollama-" + id + ".json");
                Files.createDirectories(output.getParent());
                mapper.writerWithDefaultPrettyPrinter().writeValue(output.toFile(), actual);
                System.out.println("Actual Ollama claims: " + id + " -> " + mapper.writeValueAsString(actual));

                List<String> expectedTypes = new ArrayList<>();
                List<String> expectedPeriods = new ArrayList<>();
                List<String> expectedAmounts = new ArrayList<>();
                for (JsonNode expected : video.path("claims")) {
                    expectedTypes.add(expected.path("claim_type").asText());
                    if (!expected.path("period").isNull()) expectedPeriods.add(expected.path("period").asText());
                    var matcher = java.util.regex.Pattern.compile("\\d+(?:\\.\\d+)?\\s*(?:조|%)")
                            .matcher(expected.path("text").asText());
                    while (matcher.find()) expectedAmounts.add(matcher.group().replaceAll("\\s+", ""));
                }
                List<String> expectedCompanies = new ArrayList<>();
                video.path("companies").forEach(company -> expectedCompanies.add(company.asText()));
                Map<String, Long> actualTypes = actual.stream().map(Claim::claimType)
                        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
                Map<String, Long> expectedTypeCounts = expectedTypes.stream()
                        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
                String allClaimText = actual.stream().map(Claim::claim).collect(Collectors.joining(" ")).replaceAll("\\s+", "");
                assertAll(
                        () -> assertEquals(video.path("claims").size(), actual.size(), "Claim count"),
                        () -> assertEquals(expectedTypeCounts, actualTypes, "Claim types"),
                        () -> {
                            for (Claim claim : actual) assertEquals(expectedCompanies, claim.companies(), "Company");
                        },
                        () -> {
                            for (String amount : expectedAmounts) assertTrue(allClaimText.contains(amount), "Missing spoken amount: " + amount);
                        },
                        () -> {
                            for (String period : expectedPeriods) assertTrue(actual.stream().anyMatch(c -> period.equals(c.period())), "Missing period: " + period);
                        }
                );
            }));
        }
        return tests;
    }
}
