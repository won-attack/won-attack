package com.woncheck.woncheckbackend.service;
import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.dto.Models.Claim;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class ClaimService {
    private final OpenAiService ai;
    @Value("${woncheck.mode:mock}") private String mode;
    public ClaimService(OpenAiService ai){this.ai=ai;}
    public List<Claim> extract(String transcript){
        if(mode.equals("mock")) {
            List<Claim> result = new ArrayList<>();
            for (String sentence : transcript.split("(?<=[.!?])\\s+")) {
                String text = sentence.trim();
                if (text.isEmpty()) continue;
                String type = text.matches(".*(무조건|두 배|2배|폭락|확정|오릅니다|갑니다).*" ) ? "PREDICTION" : "FINANCIAL";
                result.add(new Claim("claim_%03d".formatted(result.size()+1), text, type));
                if (result.size() == 3) break;
            }
            return result;
        }
        JsonNode root=ai.json("Extract 2-3 material investment claims from Korean transcript. Return {\"claims\":[{\"claim\":\"...\",\"claim_type\":\"FINANCIAL|DISCLOSURE|PREDICTION\"}]}. Do not invent claims.",transcript);
        List<Claim> result=new ArrayList<>();for(JsonNode c:root.path("claims")){if(result.size()==3)break;String type=c.path("claim_type").asText("DISCLOSURE");if(!Set.of("FINANCIAL","DISCLOSURE","PREDICTION").contains(type))type="DISCLOSURE";String text=c.path("claim").asText("").trim();if(!text.isEmpty())result.add(new Claim("claim_%03d".formatted(result.size()+1),text,type));}
        if(result.isEmpty())throw new IllegalStateException("No claims extracted");return result;
    }
}
