package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class OpenAiService {
    private final RestClient http;
    private final ObjectMapper mapper;

    @Value("${woncheck.llm.provider:openai}") private String provider;
    @Value("${woncheck.openai.api-key:}") private String key;
    @Value("${woncheck.openai.chat-model:gpt-4o-mini}") private String chatModel;
    @Value("${woncheck.openai.embedding-model:text-embedding-3-small}") private String embeddingModel;
    @Value("${woncheck.ollama.base-url:http://localhost:11434/v1}") private String ollamaBaseUrl;
    @Value("${woncheck.ollama.chat-model:}") private String ollamaChatModel;
    @Value("${woncheck.ollama.embedding-model:}") private String ollamaEmbeddingModel;

    public OpenAiService(RestClient http, ObjectMapper mapper) {
        this.http = http;
        this.mapper = mapper;
    }

    public JsonNode json(String system, String user) {
        boolean ollama = usesOllama();
        String model = required(ollama ? ollamaChatModel : chatModel,
                ollama ? "OLLAMA_CHAT_MODEL" : "OPENAI_CHAT_MODEL / LLM_MODEL");
        Map<String, Object> payload = Map.of(
                "model", model,
                "temperature", 0,
                "stream", false,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", system + " Respond with valid JSON object only."),
                        Map.of("role", "user", "content", user)));
        JsonNode response = post("/chat/completions", payload, ollama);
        try {
            JsonNode answer = mapper.readTree(response.path("choices").path(0).path("message").path("content").asText());
            if (answer == null || !answer.isObject()) {
                throw new IllegalStateException("Expected a JSON object");
            }
            return answer;
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid AI JSON response", ex);
        }
    }

    public List<Double> embed(String text) {
        boolean ollama = usesOllama();
        String model = required(ollama ? ollamaEmbeddingModel : embeddingModel,
                ollama ? "OLLAMA_EMBEDDING_MODEL" : "EMBEDDING_MODEL");
        JsonNode response = post("/embeddings", Map.of("model", model, "input", text), ollama);
        List<Double> vector = new ArrayList<>();
        for (JsonNode value : response.path("data").path(0).path("embedding")) {
            vector.add(value.asDouble());
        }
        if (vector.isEmpty()) throw new IllegalStateException("Embedding API returned no vector");
        return vector;
    }

    private boolean usesOllama() {
        return switch (required(provider, "LLM_PROVIDER").toLowerCase(Locale.ROOT)) {
            case "ollama" -> true;
            case "openai" -> false;
            default -> throw new IllegalStateException("LLM_PROVIDER must be openai or ollama");
        };
    }

    private JsonNode post(String endpoint, Map<String, Object> payload, boolean ollama) {
        String baseUrl = ollama
                ? required(ollamaBaseUrl, "OLLAMA_BASE_URL").replaceAll("/+$", "")
                : "https://api.openai.com/v1";
        // Never forward the team OpenAI key to the local Ollama server.
        String apiKey = ollama ? null : required(key, "OPENAI_API_KEY");
        RestClient.RequestBodySpec request = http.post().uri(baseUrl + endpoint);
        if (apiKey != null) request.headers(headers -> headers.setBearerAuth(apiKey));
        JsonNode response = request.body(payload).retrieve().body(JsonNode.class);
        if (response == null) throw new IllegalStateException("AI API returned an empty response");
        return response;
    }

    private String required(String value, String name) {
        if (value == null || value.isBlank()) throw new IllegalStateException(name + " is missing");
        return value.trim();
    }
}
