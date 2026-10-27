package com.woncheck.woncheckbackend.api;
import com.woncheck.woncheckbackend.dto.Models.*;
import com.woncheck.woncheckbackend.service.AnalyzeService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api")
public class AnalyzeController {
    private final AnalyzeService service;
    public AnalyzeController(AnalyzeService service){this.service=service;}
    @PostMapping("/analyze") public AnalyzeResponse analyze(@Valid @RequestBody AnalyzeRequest request){return service.analyze(request);}
}
