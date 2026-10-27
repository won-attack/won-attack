package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class CompanyService {
    private final DataService data;

    public CompanyService(DataService data) {
        this.data = data;
    }

    public String catalog() {
        return data.load("companies.json").toString();
    }

    public List<String> resolve(List<String> extracted, String claim, String transcript) {
        JsonNode catalog = data.load("companies.json");
        Set<String> names = new LinkedHashSet<>();
        for (String candidate : extracted) {
            for (JsonNode company : catalog) {
                if (aliases(company).stream().anyMatch(alias -> normalized(alias).equals(normalized(candidate))))
                    names.add(company.path("company").asText());
            }
        }
        names.addAll(detect(catalog, claim));
        // Only inherit context when the transcript unambiguously concerns one company.
        if (names.isEmpty()) {
            List<String> context = detect(catalog, transcript);
            if (context.size() == 1) names.add(context.getFirst());
        }
        return List.copyOf(names);
    }

    private List<String> detect(JsonNode catalog, String text) {
        List<String> names = new ArrayList<>();
        String haystack = normalized(text);
        for (JsonNode company : catalog) {
            if (aliases(company).stream().anyMatch(alias -> haystack.contains(normalized(alias))))
                names.add(company.path("company").asText());
        }
        return names;
    }

    private List<String> aliases(JsonNode company) {
        List<String> aliases = new ArrayList<>();
        String name = company.path("company").asText();
        if (!name.isBlank()) aliases.add(name);
        for (JsonNode alias : company.path("aliases")) {
            if (!alias.asText().isBlank()) aliases.add(alias.asText());
        }
        return aliases;
    }

    private String normalized(String text) {
        return text == null ? "" : text.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
    }
}
