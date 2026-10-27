package com.woncheck.woncheckbackend.service;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class EmbeddingService {
    private final OpenAiService ai;
    public EmbeddingService(OpenAiService ai){this.ai=ai;}
    public List<Double> embed(String text){return ai.embed(text);}
}
