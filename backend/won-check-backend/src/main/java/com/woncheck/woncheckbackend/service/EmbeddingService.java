package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.config.EmbeddingSettings;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class EmbeddingService {
    private final OpenAiService ai;
    private final RestClient http;
    private final EmbeddingSettings settings;

    public EmbeddingService(OpenAiService ai, RestClient http, EmbeddingSettings settings) {
        this.ai = ai;
        this.http = http;
        this.settings = settings;
    }

    public List<Double> embed(String text) {
        if (!settings.usesOllama()) return ai.embed(text);

        JsonNode response = http.post().uri(settings.baseUrl() + "/embeddings")
                .body(Map.of("model", settings.model(), "input", text))
                .retrieve().body(JsonNode.class);
        List<Double> vector = new ArrayList<>();
        if (response != null) {
            for (JsonNode value : response.path("data").path(0).path("embedding")) {
                if (!value.isNumber() || !Double.isFinite(value.asDouble())) {
                    throw new IllegalStateException("Ollama returned an invalid embedding value");
                }
                vector.add(value.asDouble());
            }
        }
        if (vector.isEmpty()) throw new IllegalStateException("Ollama returned no embedding vector");
        return vector;
    }
}
