package com.woncheck.woncheckbackend.service;
import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.config.EmbeddingSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.*;
@Service
public class ChromaClient {
    private final RestClient http;
    @Value("${woncheck.chroma.url:http://localhost:8000}") private String url;
    private final EmbeddingSettings settings;
    public ChromaClient(RestClient http, EmbeddingSettings settings){this.http=http;this.settings=settings;}
    public String collectionId(){
        JsonNode c=http.post().uri(url+"/api/v1/collections").body(Map.of("name",settings.collection(),"get_or_create",true,"metadata",Map.of("hnsw:space","cosine"))).retrieve().body(JsonNode.class);
        String id=c.path("id").asText();if(id.isEmpty())throw new IllegalStateException("Chroma collection id missing");return id;
    }
    public void upsert(List<String> ids,List<String> documents,List<List<Double>> embeddings,List<Map<String,Object>> metadata){
        http.post().uri(url+"/api/v1/collections/"+collectionId()+"/upsert").body(Map.of("ids",ids,"documents",documents,"embeddings",embeddings,"metadatas",metadata)).retrieve().toBodilessEntity();
    }
    public JsonNode query(List<Double> vector,int count){return http.post().uri(url+"/api/v1/collections/"+collectionId()+"/query").body(Map.of("query_embeddings",List.of(vector),"n_results",count,"include",List.of("documents","metadatas","distances"))).retrieve().body(JsonNode.class);}
}
