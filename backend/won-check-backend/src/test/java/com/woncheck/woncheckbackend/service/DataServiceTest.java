package com.woncheck.woncheckbackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DataServiceTest {
    @TempDir Path directory;
    private final ObjectMapper mapper = new ObjectMapper();

    private DataService service() {
        return new DataService(mapper, directory.toString(), false);
    }

    private void writeVideo(String file, String id, String title, String transcript) throws Exception {
        mapper.writeValue(directory.resolve(file).toFile(), Map.of(id, Map.of(
                "video_id", id, "title", title, "transcript", transcript,
                "transcript_source", file.startsWith("youtube") ? "OPENAI_WHISPER_1" : "PRELOADED_DEMO")));
    }

    @Test void readsPipelineOutputWithoutRequiringDemoFile() throws Exception {
        writeVideo("youtube_transcripts.json", "PIPEtest001", "새 영상", "현대차 실적입니다.");
        assertEquals("새 영상", service().video("https://youtu.be/PIPEtest001").title());
        assertEquals("현대차 실적입니다.", service().transcript("PIPEtest001"));
    }

    @Test void keepsDemoLookupWhenPipelineFileIsAbsent() throws Exception {
        writeVideo("transcripts.json", "DEMOtest001", "시연 영상", "기존 대본입니다.");
        assertEquals("시연 영상", service().video("https://youtu.be/DEMOtest001").title());
        assertEquals("기존 대본입니다.", service().transcript("DEMOtest001"));
    }

    @Test void usesPipelineForDuplicatesAndFallsBackToOtherDemoVideos() throws Exception {
        writeVideo("youtube_transcripts.json", "PIPEtest001", "실제 영상", "새 대본입니다.");
        mapper.writeValue(directory.resolve("transcripts.json").toFile(), Map.of(
                "PIPEtest001", Map.of("title", "오래된 제목", "transcript", "오래된 대본입니다."),
                "DEMOtest001", Map.of("title", "시연 영상", "transcript", "시연 대본입니다.")));
        assertEquals("실제 영상", service().video("https://youtu.be/PIPEtest001").title());
        assertEquals("새 대본입니다.", service().transcript("PIPEtest001"));
        assertEquals("시연 대본입니다.", service().transcript("DEMOtest001"));
    }

    @Test void preservesSegmentTextWhenFullTranscriptIsBlank() throws Exception {
        Files.writeString(directory.resolve("youtube_transcripts.json"), """
                {"PIPEtest001":{"title":"구간 영상","transcript":"","segments":[
                  {"time":"0:00","text":"첫 문장입니다.","caption":"요약 1"},
                  {"time":"0:03","text":"둘째 문장입니다.","caption":"요약 2"}]}}
                """);
        assertEquals("첫 문장입니다. 둘째 문장입니다.", service().transcript("PIPEtest001"));
    }

    @Test void unknownVideoStillReturnsNotFound() throws Exception {
        writeVideo("youtube_transcripts.json", "PIPEtest001", "새 영상", "대본입니다.");
        assertThrows(ApiException.class, () -> service().video("https://youtu.be/UNKNOWN0000"));
    }

    @Test void malformedPipelineOutputIsReportedInsteadOfSilentlyUsingDemo() throws Exception {
        Files.writeString(directory.resolve("youtube_transcripts.json"), "{broken");
        writeVideo("transcripts.json", "PIPEtest001", "시연 영상", "시연 대본입니다.");
        assertThrows(IllegalStateException.class, () -> service().transcript("PIPEtest001"));
    }
}
