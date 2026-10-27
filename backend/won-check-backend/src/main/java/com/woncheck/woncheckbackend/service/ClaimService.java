package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.woncheck.woncheckbackend.dto.Models.Claim;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ClaimService {
    private static final Pattern PERIOD = Pattern.compile("(20\\d{2})-(FY|Q([1-4])(?:~Q([1-4]))?)(?![A-Z0-9~])");
    private static final Pattern KOREAN_QUARTER = Pattern.compile("(20\\d{2})년\\s*([1-4])분기");
    private static final Pattern KOREAN_YEAR = Pattern.compile("(20\\d{2})년\\s*(연간|전체)");
    private final OpenAiService ai;
    private final CompanyService companies;
    @Value("${woncheck.mode:mock}") private String mode;

    public ClaimService(OpenAiService ai, CompanyService companies) {
        this.ai = ai;
        this.companies = companies;
    }

    public List<Claim> extract(String transcript) {
        List<Claim> result = new ArrayList<>();
        if (mode.equals("mock")) {
            for (String sentence : transcript.split("(?<=[.!?])\\s+")) {
                String text = sentence.trim();
                if (text.isEmpty()) continue;
                String type = text.matches(".*(무조건|두 배|2배|폭락|확정|오릅니다|갑니다).*") ? "PREDICTION" : "FINANCIAL";
                result.add(new Claim("claim_%03d".formatted(result.size() + 1), text, type,
                        companies.resolve(List.of(), text, transcript), period(text)));
                if (result.size() == 3) break;
            }
            return result;
        }
        JsonNode root = ai.json("""
                Extract 2-3 material investment claims from the Korean transcript. Do not invent claims.
                Return {"claims":[{"claim":"...","claim_type":"FINANCIAL|DISCLOSURE|PREDICTION",
                "companies":["canonical company name"],"period":null}]}.
                Include every company involved in each claim, including both sides of comparisons.
                Resolve pronouns from transcript context only when unambiguous.
                Use the supplied company catalog and aliases. Use an empty companies list if unknown.
                Period must be YYYY-Q1 through YYYY-Q4, YYYY-FY, or a same-year quarter range
                such as 2026-Q1~Q3. Only include a period when the year and period are explicit
                or unambiguously established by the transcript; otherwise return null.
                Company catalog:
                """ + companies.catalog(), transcript);
        for (JsonNode item : root.path("claims")) {
            if (result.size() == 3) break;
            String type = item.path("claim_type").asText("DISCLOSURE");
            if (!Set.of("FINANCIAL", "DISCLOSURE", "PREDICTION").contains(type)) type = "DISCLOSURE";
            String text = item.path("claim").asText("").trim();
            if (text.isEmpty()) continue;
            List<String> extractedCompanies = new ArrayList<>();
            for (JsonNode company : item.path("companies")) extractedCompanies.add(company.asText());
            String selectedPeriod = period(item.path("period").asText(""));
            if (selectedPeriod == null) selectedPeriod = period(text);
            result.add(new Claim("claim_%03d".formatted(result.size() + 1), text, type,
                    companies.resolve(extractedCompanies, text, transcript), selectedPeriod));
        }
        if (result.isEmpty()) throw new IllegalStateException("No claims extracted");
        return result;
    }

    private String period(String text) {
        Matcher canonical = PERIOD.matcher(text.toUpperCase(Locale.ROOT));
        if (canonical.find()) {
            if (canonical.group(4) != null && Integer.parseInt(canonical.group(3)) > Integer.parseInt(canonical.group(4)))
                return null;
            return canonical.group();
        }
        Matcher quarter = KOREAN_QUARTER.matcher(text);
        if (quarter.find()) return quarter.group(1) + "-Q" + quarter.group(2);
        Matcher year = KOREAN_YEAR.matcher(text);
        return year.find() ? year.group(1) + "-FY" : null;
    }
}
