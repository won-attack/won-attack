package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.dto.Models.Video;
import com.woncheck.woncheckbackend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Optional;

@Service
public class DataService {
    private final ObjectMapper mapper;
    private final Path dataDir;
    private final boolean allowSampleFallback;

    public DataService(ObjectMapper mapper,
                       @Value("${woncheck.data.path:../data}") String dataPath,
                       @Value("${woncheck.data.allow-sample-fallback:false}") boolean allowSampleFallback) {
        this.mapper = mapper;
        this.dataDir = Path.of(dataPath).toAbsolutePath().normalize();
        this.allowSampleFallback = allowSampleFallback;
    }

    public JsonNode load(String name) {
        if (!name.matches("[a-zA-Z0-9_-]+\\.json")) throw new IllegalArgumentException("Invalid data filename");
        Path file = dataDir.resolve(name).normalize();
        try {
            if (Files.isRegularFile(file)) return mapper.readTree(file.toFile());
            if (allowSampleFallback) {
                try (InputStream in = getClass().getResourceAsStream("/data/" + name)) {
                    if (in != null) return mapper.readTree(in);
                }
            }
            throw new IllegalStateException("Missing JSON: " + file + ". Set WONCHECK_DATA_PATH to the repository data directory.");
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot load " + file, ex);
        }
    }

    private JsonNode records(JsonNode root, String... collectionNames) {
        if (root.isArray()) return root;
        for (String key : collectionNames) {
            if (root.has(key) && root.get(key).isArray()) return root.get(key);
        }
        return root;
    }

    private String text(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode value = node.path(key);
            if (value.isTextual() && !value.asText().isBlank()) return value.asText();
        }
        return "";
    }

    private JsonNode find(JsonNode root, String id, String[] collections, String... idKeys) {
        JsonNode records = records(root, collections);
        if (records.isObject()) {
            JsonNode direct = records.path(id);
            if (!direct.isMissingNode()) return direct;
            Iterator<JsonNode> values = records.elements();
            while (values.hasNext()) {
                JsonNode item = values.next();
                for (String key : idKeys) if (id.equals(item.path(key).asText())) return item;
            }
        } else if (records.isArray()) {
            for (JsonNode item : records) {
                for (String key : idKeys) if (id.equals(item.path(key).asText())) return item;
            }
        }
        return mapper.missingNode();
    }

    public Video video(String url) {
        String id;
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null || !(host.equals("youtube.com") || host.equals("www.youtube.com") || host.equals("youtu.be") || host.equals("m.youtube.com"))) throw new IllegalArgumentException();
            if (host.equals("youtu.be")) id = uri.getPath().replaceFirst("^/", "");
            else {
                id = null;
                for (String pair : Optional.ofNullable(uri.getRawQuery()).orElse("").split("&")) {
                    if (pair.startsWith("v=")) { id = pair.substring(2); break; }
                }
            }
            if (id == null || !id.matches("[a-zA-Z0-9_-]{3,32}")) throw new IllegalArgumentException();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_VIDEO_URL", "올바른 YouTube URL이 아닙니다.");
        }
        JsonNode n = videoRecord(id);
        if (n.isMissingNode()) throw new ApiException(HttpStatus.NOT_FOUND, "VIDEO_NOT_SUPPORTED", "등록된 대본이 없는 영상입니다.");
        return new Video(id, text(n, "title", "video_title"), url);
    }

    public String transcript(String id) {
        JsonNode n = videoRecord(id);
        String transcript = text(n, "transcript", "transcript_text", "script", "content", "text");
        if (transcript.isBlank() && n.path("segments").isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode segment : n.path("segments")) sb.append(text(segment, "text", "content")).append(' ');
            transcript = sb.toString().trim();
        }
        if (transcript.isBlank()) throw new IllegalStateException("Transcript missing for video: " + id);
        return transcript;
    }

    private JsonNode videoRecord(String id) {
        boolean sourceExists = false;
        // Prefer real pipeline output; retain existing demo data for other videos.
        for (String name : new String[]{"youtube_transcripts.json", "transcripts.json"}) {
            if (!Files.isRegularFile(dataDir.resolve(name))
                    && !(name.equals("transcripts.json") && allowSampleFallback)) continue;
            sourceExists = true;
            JsonNode record = find(load(name), id, new String[]{"videos", "transcripts", "data"},
                    "video_id", "id", "youtube_id");
            if (!record.isMissingNode()) return record;
        }
        if (!sourceExists) {
            throw new IllegalStateException("Missing transcript JSON in " + dataDir
                    + ". Provide youtube_transcripts.json or transcripts.json.");
        }
        return mapper.missingNode();
    }

    public JsonNode user(String id) {
        JsonNode n = find(load("users.json"), id, new String[]{"users", "profiles", "data"}, "user_id", "id");
        if (n.isMissingNode()) throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "등록되지 않은 시연 사용자입니다.");
        return n;
    }
}
