package com.woncheck.woncheckbackend.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woncheck.woncheckbackend.dto.Models.AnalyzeRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"woncheck.mode=mock", "woncheck.data.allow-sample-fallback=false", "woncheck.data.path=src/test/resources/repo-data"})
@AutoConfigureMockMvc
class AnalyzeControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @Test void analyzesRepositoryShapeForTwoUsers() throws Exception {
        for (String id : new String[]{"demo_user_01", "demo_user_02"}) {
            mvc.perform(post("/api/analyze").contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(new AnalyzeRequest("https://www.youtube.com/watch?v=WCdemoS1A01", id))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.video.video_id").value("WCdemoS1A01"))
                .andExpect(jsonPath("$.verification_results.length()").value(3));
        }
    }

    @Test void invalidVideoUrl() throws Exception {
        mvc.perform(post("/api/analyze").contentType(MediaType.APPLICATION_JSON)
                .content("{\"video_url\":\"oops\",\"user_id\":\"demo_user_01\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("INVALID_VIDEO_URL"));
    }

    @Test void unknownVideo() throws Exception {
        mvc.perform(post("/api/analyze").contentType(MediaType.APPLICATION_JSON)
                .content("{\"video_url\":\"https://youtu.be/UNKNOWN0000\",\"user_id\":\"demo_user_01\"}"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.error.code").value("VIDEO_NOT_SUPPORTED"));
    }

    @Test void unknownUser() throws Exception {
        mvc.perform(post("/api/analyze").contentType(MediaType.APPLICATION_JSON)
                .content("{\"video_url\":\"https://youtu.be/WCdemoS1A01\",\"user_id\":\"none\"}"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.error.code").value("USER_NOT_FOUND"));
    }
}
