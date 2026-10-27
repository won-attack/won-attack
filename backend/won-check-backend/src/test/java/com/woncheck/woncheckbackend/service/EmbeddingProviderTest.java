package com.woncheck.woncheckbackend.service;

import com.woncheck.woncheckbackend.config.EmbeddingSettings;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class EmbeddingProviderTest {
    @Test void teamEmbeddingModelVariableIsUsed() {
        var environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("team-settings", Map.of(
                "EMBEDDING_MODEL", "team-selected-model")));
        ConfigDataEnvironmentPostProcessor.applyTo(environment);
        assertEquals("team-selected-model", environment.getProperty("woncheck.openai.embedding-model"));
    }

    private EmbeddingSettings settings(String provider) {
        return new EmbeddingSettings(provider, "text-embedding-3-small", "bge-m3:latest",
                "http://127.0.0.1:11434/v1/", "disclosures");
    }

    @Test void ollamaEmbeddingsUseLocalEndpointWithoutOpenAiKey() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var ai = mock(OpenAiService.class);
        server.expect(requestTo("http://127.0.0.1:11434/v1/embeddings"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{\"model\":\"bge-m3:latest\",\"input\":\"claim\"}"))
                .andRespond(withSuccess("{\"data\":[{\"embedding\":[0.1,0.2]}]}", MediaType.APPLICATION_JSON));
        var embeddings = new EmbeddingService(ai, builder.build(), settings("ollama"));
        assertEquals(List.of(0.1, 0.2), embeddings.embed("claim"));
        verifyNoInteractions(ai);
        server.verify();
    }

    @Test void openAiEmbeddingsKeepExistingClient() {
        var ai = mock(OpenAiService.class);
        when(ai.embed("claim")).thenReturn(List.of(0.3, 0.4));
        var embeddings = new EmbeddingService(ai, RestClient.create(), settings("openai"));
        assertEquals(List.of(0.3, 0.4), embeddings.embed("claim"));
        verify(ai).embed("claim");
    }

    @Test void emptyOllamaEmbeddingFailsBeforeChromaQuery() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://127.0.0.1:11434/v1/embeddings"))
                .andRespond(withSuccess("{\"data\":[]}", MediaType.APPLICATION_JSON));
        var embeddings = new EmbeddingService(mock(OpenAiService.class), builder.build(), settings("ollama"));
        assertThrows(IllegalStateException.class, () -> embeddings.embed("claim"));
        server.verify();
    }

    @Test void chromaUsesTheCollectionForTheSelectedProvider() {
        for (String provider : List.of("openai", "ollama")) {
            var builder = RestClient.builder();
            var server = MockRestServiceServer.bindTo(builder).build();
            String expected = provider.equals("ollama") ? "disclosures_ollama" : "disclosures";
            server.expect(requestTo("http://localhost:8000/api/v1/collections"))
                    .andExpect(jsonPath("$.name").value(expected))
                    .andRespond(withSuccess("{\"id\":\"collection-id\"}", MediaType.APPLICATION_JSON));
            var chroma = new ChromaClient(builder.build(), settings(provider));
            ReflectionTestUtils.setField(chroma, "url", "http://localhost:8000");
            assertEquals("collection-id", chroma.collectionId());
            server.verify();
        }
    }

    @Test void invalidProviderFailsClearly() {
        assertThrows(IllegalArgumentException.class, () -> settings("unknown"));
    }
}
