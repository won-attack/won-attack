package com.woncheck.woncheckbackend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

@Component
public class EmbeddingSettings {
    private final String provider;
    private final String model;
    private final String baseUrl;
    private final String collection;

    public EmbeddingSettings(
            @Value("${woncheck.embedding.provider:openai}") String provider,
            @Value("${woncheck.openai.embedding-model:text-embedding-3-small}") String openAiModel,
            @Value("${woncheck.ollama.embedding-model:embeddinggemma}") String ollamaModel,
            @Value("${woncheck.ollama.base-url:http://127.0.0.1:11434/v1}") String ollamaBaseUrl,
            @Value("${woncheck.chroma.collection:disclosures}") String collection) {
        this.provider = provider.trim().toLowerCase(Locale.ROOT);
        if (!Set.of("openai", "ollama").contains(this.provider)) {
            throw new IllegalArgumentException("EMBEDDING_PROVIDER must be openai or ollama");
        }
        this.model = this.provider.equals("ollama") ? ollamaModel : openAiModel;
        this.baseUrl = ollamaBaseUrl.replaceAll("/+$", "");
        this.collection = collection + (this.provider.equals("ollama") ? "_ollama" : "");
    }

    public boolean usesOllama() { return provider.equals("ollama"); }
    public String model() { return model; }
    public String baseUrl() { return baseUrl; }
    public String collection() { return collection; }
}
