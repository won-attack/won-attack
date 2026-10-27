package com.woncheck.woncheckbackend.api;
import com.woncheck.woncheckbackend.service.DisclosureIngestionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
@RestController
@RequestMapping("/api/admin")
public class IngestionController {
    private final DisclosureIngestionService service;
    @Value("${woncheck.mode:mock}") private String mode;
    @Value("${woncheck.ingest.enabled:false}") private boolean enabled;
    public IngestionController(DisclosureIngestionService service){this.service=service;}
    @PostMapping("/ingest") public Map<String,Object> ingest(){if(!enabled||!mode.equals("live"))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Ingestion disabled");return Map.of("ingested",service.ingest());}
}
