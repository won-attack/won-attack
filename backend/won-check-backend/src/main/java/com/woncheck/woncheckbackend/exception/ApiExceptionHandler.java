package com.woncheck.woncheckbackend.exception;
import com.woncheck.woncheckbackend.dto.Models.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> known(ApiException ex){return ResponseEntity.status(ex.status()).body(new ApiError(new ApiError.Error(ex.code(),ex.getMessage())));}
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiError> bad(Exception ex){return ResponseEntity.badRequest().body(new ApiError(new ApiError.Error("INVALID_REQUEST","video_url과 user_id를 확인해 주세요.")));}
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> unexpected(Exception ex){
        log.error("Analysis request failed", ex);
        return ResponseEntity.internalServerError().body(new ApiError(new ApiError.Error("ANALYSIS_FAILED","분석 중 오류가 발생했습니다. 서버 로그를 확인해 주세요.")));
    }
}
