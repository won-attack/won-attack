package com.woncheck.woncheckbackend.service;

import com.woncheck.woncheckbackend.config.EmbeddingSettings;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ChromaClientTest {
    private static final String COLLECTIONS = "http://localhost:8000/api/v2/tenants/default_tenant/databases/default_database/collections";
    private MockRestServiceServer server;
    private ChromaClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        var settings = new EmbeddingSettings("openai", "text-embedding-3-small", "bge-m3:latest",
                "http://localhost:11434/v1", "disclosures");
        client = new ChromaClient(builder.build(), settings);
        ReflectionTestUtils.setField(client, "url", "http://localhost:8000/");
        ReflectionTestUtils.setField(client, "tenant", "default_tenant");
        ReflectionTestUtils.setField(client, "database", "default_database");
    }

    @Test
    void sendsV2QueryWithCompanyPeriodWhereAndTopThree() {
        expectCollection();
        server.expect(requestTo(COLLECTIONS + "/collection-id/query"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.n_results").value(3))
                .andExpect(jsonPath("$.query_embeddings[0][0]").value(0.1))
                .andExpect(jsonPath("$.where.$and[0].company").value("SK하이닉스"))
                .andExpect(jsonPath("$.where.$and[1].period").value("2026-Q2"))
                .andRespond(withSuccess("{\"ids\":[[]]}", MediaType.APPLICATION_JSON));
        var result = client.query(List.of(0.1), 3,
                Map.of("$and", List.of(Map.of("company", "SK하이닉스"), Map.of("period", "2026-Q2"))));
        assertTrue(result.path("ids").path(0).isEmpty());
        server.verify();
    }

    @Test
    void sendsV2Upsert() {
        expectCollection();
        server.expect(requestTo(COLLECTIONS + "/collection-id/upsert"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.ids[0]").value("doc1"))
                .andExpect(jsonPath("$.metadatas[0].company").value("현대자동차"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        client.upsert(List.of("doc1"), List.of("공시 본문"), List.of(List.of(0.1)),
                List.of(Map.of("company", "현대자동차")));
        server.verify();
    }

    private void expectCollection() {
        server.expect(requestTo(COLLECTIONS))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.name").value("disclosures"))
                .andExpect(jsonPath("$.get_or_create").value(true))
                .andRespond(withSuccess("{\"id\":\"collection-id\"}", MediaType.APPLICATION_JSON));
    }
}
