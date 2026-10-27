package com.woncheck.woncheckbackend.service;
import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.dto.Models.EvidenceDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class ChromaRagService implements RagService {
    private final EmbeddingService embedding;private final ChromaClient chroma;private final DataService data;
    @Value("${woncheck.mode:mock}") private String mode;
    public ChromaRagService(EmbeddingService embedding,ChromaClient chroma,DataService data){this.embedding=embedding;this.chroma=chroma;this.data=data;}
    public List<EvidenceDto> search(String claim,String company,String period){
        if(mode.equals("mock")){
            List<EvidenceDto> items=new ArrayList<>();for(JsonNode n:data.load("disclosures.json")){if(items.size()==3)break;items.add(from(n));}return items;
        }
        JsonNode root=chroma.query(embedding.embed(claim),10);
        JsonNode ids=root.path("ids").path(0),docs=root.path("documents").path(0),metas=root.path("metadatas").path(0);
        List<EvidenceDto> results=new ArrayList<>();for(int i=0;i<ids.size()&&results.size()<3;i++){
            JsonNode m=metas.path(i);if(company!=null&&!company.isBlank()&&!company.equals(m.path("company").asText()))continue;
            if(period!=null&&!period.isBlank()&&!period.equals(m.path("period").asText()))continue;
            results.add(new EvidenceDto(ids.path(i).asText(),docs.path(i).asText(),m.path("title").asText(),m.path("period").asText(),m.path("source_url").asText()));
        }return results;
    }
    private EvidenceDto from(JsonNode n){return new EvidenceDto(n.path("id").asText(),n.path("document").asText(),n.path("metadata").path("source_title").asText(),n.path("metadata").path("period").asText(),n.path("metadata").path("source_url").asText());}
}
