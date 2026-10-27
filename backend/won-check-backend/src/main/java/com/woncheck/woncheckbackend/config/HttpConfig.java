package com.woncheck.woncheckbackend.config;
import org.springframework.context.annotation.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import java.net.http.HttpClient;
@Configuration
public class HttpConfig {
    @Bean RestClient restClient(){
        // Local Chroma/Uvicorn uses HTTP/1.1; avoid cleartext HTTP/2 upgrade requests.
        var client = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
        return RestClient.builder().requestFactory(new JdkClientHttpRequestFactory(client)).build();
    }
}
