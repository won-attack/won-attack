package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenAiServiceTest {
    private MockRestServiceServer server;
    private OpenAiService service;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new OpenAiService(builder.build(), mapper);
        field("provider", "openai");
        field("embeddingProvider", "openai");
        field("key", "test-team-key");
        field("chatModel", "test-openai-chat");
        field("embeddingModel", "test-openai-embedding");
        field("ollamaBaseUrl", "http://localhost:11434/v1/");
        field("ollamaChatModel", "test-ollama-chat");
        field("ollamaEmbeddingModel", "test-ollama-embedding");
    }

    @ParameterizedTest
    @ValueSource(strings = {"openai", "ollama"})
    void routesChatAndParsesJson(String provider) throws Exception {
        field("provider", provider);
        boolean ollama = provider.equals("ollama");
        server.expect(requestTo(baseUrl(ollama) + "/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(ollama ? headerDoesNotExist(HttpHeaders.AUTHORIZATION)
                        : header(HttpHeaders.AUTHORIZATION, "Bearer test-team-key"))
                .andExpect(jsonPath("$.model").value(ollama ? "test-ollama-chat" : "test-openai-chat"))
                .andExpect(jsonPath("$.messages[1].content").value("claim and evidence"))
                .andExpect(jsonPath("$.response_format.type").value("json_object"))
                .andExpect(jsonPath("$.stream").value(false))
                .andRespond(withSuccess(mapper.writeValueAsString(Map.of("choices", List.of(
                        Map.of("message", Map.of("content", "{\"status\":\"SUPPORTED\"}"))))),
                        MediaType.APPLICATION_JSON));

        assertEquals("SUPPORTED", service.json("Compare", "claim and evidence").path("status").asText());
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"openai", "ollama"})
    void routesEmbeddingsAndReadsVector(String provider) {
        field("embeddingProvider", provider);
        boolean ollama = provider.equals("ollama");
        server.expect(requestTo(baseUrl(ollama) + "/embeddings"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(ollama ? headerDoesNotExist(HttpHeaders.AUTHORIZATION)
                        : header(HttpHeaders.AUTHORIZATION, "Bearer test-team-key"))
                .andExpect(jsonPath("$.model").value(ollama ? "test-ollama-embedding" : "test-openai-embedding"))
                .andExpect(jsonPath("$.input").value("disclosure"))
                .andRespond(withSuccess("{\"data\":[{\"embedding\":[0.1,0.2]}]}", MediaType.APPLICATION_JSON));

        assertEquals(List.of(0.1, 0.2), service.embed("disclosure"));
        server.verify();
    }

    @Test
    void ollamaWorksWithoutOpenAiKey() {
        field("provider", "ollama");
        field("embeddingProvider", "ollama");
        field("key", "");
        server.expect(requestTo(baseUrl(true) + "/embeddings"))
                .andExpect(headerDoesNotExist(HttpHeaders.AUTHORIZATION))
                .andRespond(withSuccess("{\"data\":[{\"embedding\":[1.0]}]}", MediaType.APPLICATION_JSON));
        assertEquals(List.of(1.0), service.embed("text"));
        server.verify();
    }

    @Test
    void openAiRequiresKeyBeforeSending() {
        field("key", "");
        assertTrue(assertThrows(IllegalStateException.class,
                () -> service.json("system", "user")).getMessage().contains("OPENAI_API_KEY"));
        server.verify();
    }

    @Test
    void rejectsUnknownProviderBeforeSending() {
        field("provider", "olama");
        assertTrue(assertThrows(IllegalStateException.class,
                () -> service.json("system", "user")).getMessage().contains("LLM_PROVIDER"));
        server.verify();
    }

    @Test
    void ollamaRequiresBothSelectedModels() {
        field("provider", "ollama");
        field("embeddingProvider", "ollama");
        field("ollamaChatModel", "");
        field("ollamaEmbeddingModel", "");
        assertTrue(assertThrows(IllegalStateException.class,
                () -> service.json("system", "user")).getMessage().contains("OLLAMA_CHAT_MODEL"));
        assertTrue(assertThrows(IllegalStateException.class,
                () -> service.embed("text")).getMessage().contains("OLLAMA_EMBEDDING_MODEL"));
        server.verify();
    }

    @Test
    void ollamaChatDoesNotSwitchOpenAiEmbeddings() {
        field("provider", "ollama");
        server.expect(requestTo(baseUrl(false) + "/embeddings"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-team-key"))
                .andExpect(jsonPath("$.model").value("test-openai-embedding"))
                .andRespond(withSuccess("{\"data\":[{\"embedding\":[1.0]}]}", MediaType.APPLICATION_JSON));
        assertEquals(List.of(1.0), service.embed("text"));
        server.verify();
    }

    @Test
    void rejectsUnknownEmbeddingProvider() {
        field("embeddingProvider", "olama");
        assertTrue(assertThrows(IllegalStateException.class,
                () -> service.embed("text")).getMessage().contains("EMBEDDING_PROVIDER"));
        server.verify();
    }

    private void field(String name, String value) {
        ReflectionTestUtils.setField(service, name, value);
    }

    private String baseUrl(boolean ollama) {
        return ollama ? "http://localhost:11434/v1" : "https://api.openai.com/v1";
    }
}
