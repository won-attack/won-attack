package com.woncheck.woncheckbackend.config;
import org.springframework.context.annotation.*;
import org.springframework.web.client.RestClient;
@Configuration
public class HttpConfig {
    @Bean RestClient restClient(){return RestClient.create();}
}
