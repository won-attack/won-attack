package com.woncheck.woncheckbackend.service;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.*;
@Service
public class OpenAiService {
    private final RestClient http; private final ObjectMapper mapper;
    @Value("${woncheck.openai.api-key:}") private String key;
    @Value("${woncheck.openai.chat-model:gpt-4o-mini}") private String chatModel;
    @Value("${woncheck.openai.embedding-model:text-embedding-3-small}") private String embeddingModel;
    public OpenAiService(RestClient http,ObjectMapper mapper){this.http=http;this.mapper=mapper;}
    public JsonNode json(String system,String user){
        if(key.isBlank())throw new IllegalStateException("OPENAI_API_KEY is missing");
        Map<String,Object> payload=Map.of("model",chatModel,"temperature",0,"response_format",Map.of("type","json_object"),"messages",List.of(Map.of("role","system","content",system+" Respond with valid JSON object only."),Map.of("role","user","content",user)));
        JsonNode response=http.post().uri("https://api.openai.com/v1/chat/completions").header("Authorization","Bearer "+key).body(payload).retrieve().body(JsonNode.class);
        try{return mapper.readTree(response.path("choices").path(0).path("message").path("content").asText());}catch(Exception ex){throw new IllegalStateException("Invalid GPT JSON response",ex);}
    }
    public List<Double> embed(String text){
        if(key.isBlank())throw new IllegalStateException("OPENAI_API_KEY is missing");
        JsonNode response=http.post().uri("https://api.openai.com/v1/embeddings").header("Authorization","Bearer "+key).body(Map.of("model",embeddingModel,"input",text)).retrieve().body(JsonNode.class);
        List<Double> vector=new ArrayList<>();for(JsonNode x:response.path("data").path(0).path("embedding"))vector.add(x.asDouble());
        if(vector.isEmpty())throw new IllegalStateException("Embedding API returned no vector");return vector;
    }
}
