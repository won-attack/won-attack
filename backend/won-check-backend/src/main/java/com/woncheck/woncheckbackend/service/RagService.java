package com.woncheck.woncheckbackend.service;
import com.woncheck.woncheckbackend.dto.Models.EvidenceDto;
import java.util.List;
public interface RagService {List<EvidenceDto> search(String claim,String company,String period);}
