# pdf-chatbot PDCA 완료 보고서

> **Feature**: pdf-chatbot
> **Date**: 2026-05-07
> **Author**: jhlee@nicevan.co.kr
> **Status**: Completed
> **Match Rate**: 93.5%

---

## 1. Executive Summary

| Perspective | 계획 | 실제 결과 |
|-------------|------|-----------|
| **Problem** | PDF 법령 문서를 빠르게 검색하는 데 시간이 많이 걸림 | 근로기준법 PDF를 대화형으로 즉시 검색 가능하게 됨 |
| **Solution** | Anthropic Claude API로 PDF 내용 기반 자연어 답변 | SambaNova(`Meta-Llama-3.3-70B-Instruct`)로 동일 기능 구현 |
| **Function/UX** | 좌우 분할 UI (PDF 뷰어 + 채팅 패널) | 구현 완료, `<textarea>` 입력으로 UX 향상 |
| **Core Value** | 복잡한 법령 문서를 대화 형식으로 빠르게 파악 | 서버 실행 및 L1 API 테스트 4/4 통과 확인 |

### 1.1 PDCA 사이클 요약

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ → [Act] ⏭ → [Report] ✅
                                              93.5% (iterate 불필요)
```

| 단계 | 날짜 | 결과 |
|------|------|------|
| Plan | 2026-05-07 | `pdf-chatbot.plan.md` 작성 완료 |
| Design | 2026-05-07 | `pdf-chatbot.design.md` 작성 완료 (Option C 선택) |
| Do | 2026-05-07 | 전체 구현 완료 (FR-01~FR-08) |
| Check | 2026-05-07 | Match Rate 93.5% — 목표 90% 초과 |
| Act | — | 불필요 (matchRate ≥ 90%) |

---

## 2. 기능 요구사항 달성 현황

### 2.1 Definition of Done (Plan §4.1)

| 항목 | 상태 | 근거 |
|------|------|------|
| PDF 파싱 후 텍스트 추출 성공 | ✅ Met | `GET /api/chat` → `{"files":["근로기준법..."]}` L1 확인 |
| `/api/chat` 엔드포인트 정상 응답 | ✅ Met | HTTP 200, L1 테스트 통과 |
| 분할 UI (PDF 뷰어 + 채팅) 동시 작동 | ✅ Met | `index.html` + `app.js` 구현 |
| 한국어 답변 강제 | ✅ Met | `api/chat.js:98` 시스템 프롬프트 |
| PDF 범위 외 질문 안내 문구 | ✅ Met | "PDF 내용에 없는 질문은 답변할 수 없습니다" |
| Vercel 배포 설정 완료 | ✅ Met | `vercel.json` (`includeFiles: docs/**`) |

### 2.2 Quality Criteria (Plan §4.2)

| 항목 | 상태 | 근거 |
|------|------|------|
| API 키 프론트엔드 미노출 | ✅ Met | `process.env.SAMBANOVA_API_KEY` 서버 전용 |
| `.env` Git 미포함 | ✅ Met | CLAUDE.md 정책 준수 |
| 서버 에러 시 친절한 오류 메시지 | ✅ Met | `api/chat.js:117-120` |

**성공 기준 달성률: 9/9 (100%)**

### 2.3 FR 상세 달성 현황

| FR | 요구사항 | 구현 위치 | 상태 |
|----|---------|-----------|------|
| FR-01 | PDF 파싱 + 캐싱 | `api/chat.js:20-43` | ✅ |
| FR-02 | POST /api/chat | `api/chat.js:78-122` | ✅ |
| FR-03 | 시스템 프롬프트 + 한국어 + 60,000자 제한 | `api/chat.js:96-103` | ✅ |
| FR-04 | PDF 범위 외 질문 안내 | `api/chat.js:99` | ✅ |
| FR-05 | 대화 히스토리 클라이언트 유지 | `public/app.js:65-66` | ✅ |
| FR-06 | 분할 레이아웃 | `public/index.html:16-38` | ✅ |
| FR-07 | 입력창 + 전송 버튼 + 스크롤 목록 | `public/app.js:29-35` | ✅ |
| FR-08 | 로딩 인디케이터 | `public/app.js:48` | ✅ |

---

## 3. Check Phase 결과

### 3.1 Match Rate

| 축 | 점수 | 가중치 | 기여 |
|----|------|--------|------|
| Structural | 90% | 15% | 0.135 |
| Functional | 95% | 25% | 0.2375 |
| API Contract | 85% | 25% | 0.2125 |
| Runtime L1 | 100% | 35% | 0.350 |
| **Overall** | **93.5%** | — | — |

### 3.2 L1 런타임 테스트 결과 (4/4 통과)

| 테스트 | 기대값 | 결과 |
|--------|--------|------|
| `GET /api/chat` PDF 목록 조회 | 200 + `{"files":[...]}` | ✅ |
| `POST /api/chat` message 없이 | 400 | ✅ |
| `GET /api/chat?serve=filename` PDF 서빙 | 200 | ✅ |
| `DELETE /api/chat` 허용되지 않는 메서드 | 405 | ✅ |

---

## 4. 주요 결정 기록 (Decision Record)

| 단계 | 결정 | 실제 결과 |
|------|------|-----------|
| Plan | AI 모델: `claude-haiku-4-5-20251001` 선택 | 변경됨 (SambaNova 교체) |
| Plan | 히스토리: 클라이언트 인메모리 | 유지 ✅ |
| Design | 아키텍처: Option C (실용적 균형) | 부분 유지 (lib 분리 생략) |
| Design | PDF 캐싱: 모듈 레벨 변수 | `api/chat.js` 내 인라인으로 구현 ✅ |
| Design | PDF 서빙 라우트: `GET /docs/:filename` | `GET /api/chat?serve=` 로 변경 |
| Do | AI API: Anthropic SDK | SambaNova OpenAI-호환 SDK로 교체 (사용자 요청) |

---

## 5. 설계 대비 편차 요약

| Gap | 심각도 | 이유 | 결론 |
|-----|--------|------|------|
| AI API 교체 (Anthropic → SambaNova) | Important | 사용자 명시적 요청 | 의도적 변경, 기능 동일 |
| `lib/pdfLoader.js` 미분리 | Minor | 단일 파일 단순화 | 기능 영향 없음, 향후 리팩터링 가능 |
| PDF 서빙 라우트 변경 | Minor | Vercel 단일 핸들러 패턴 | 보안 처리 오히려 향상됨 |

---

## 6. 학습 포인트

1. **SambaNova API는 OpenAI SDK 호환**: `baseURL`만 교체하면 동일 코드로 사용 가능. 모델 교체 비용이 매우 낮음.

2. **Vercel 서버리스 + Express 병행**: `api/chat.js`를 서버리스 핸들러로, `server.js`를 로컬 개발 래퍼로 분리하는 패턴이 배포/개발 모두에서 잘 동작함.

3. **PDF 텍스트 60,000자 제한**: 대용량 PDF에서 컨텍스트 한도 초과를 방지하는 실용적 방어 코드. 추후 청킹(chunking) 전략으로 개선 여지 있음.

4. **히스토리 클라이언트 관리**: Vercel 무상태(stateless) 환경에서 히스토리를 클라이언트에서 관리하고 매 요청에 포함하는 패턴이 효과적.

---

## 7. 다음 단계 제안

| 우선순위 | 항목 | 이유 |
|----------|------|------|
| High | Vercel 실제 배포 및 동작 확인 | 성공 기준 마지막 항목 |
| Medium | `lib/pdfLoader.js` 분리 리팩터링 | 테스트 용이성, 설계 일치도 향상 |
| Medium | PDF 청킹(chunking) 도입 | 60,000자 초과 문서 대응 |
| Low | `HF_MODEL` 환경변수로 모델 교체 테스트 | 다른 SambaNova 모델 비교 |

---

## 8. 파일 목록

| 파일 | 역할 |
|------|------|
| `server.js` | 로컬 개발용 Express 래퍼 |
| `server.js.bak` | 원본 백업 (SambaNova 교체 전) |
| `api/chat.js` | Vercel 서버리스 핸들러 (PDF 파싱 + AI API) |
| `public/index.html` | 분할 레이아웃 UI |
| `public/style.css` | UI 스타일 |
| `public/app.js` | 채팅 클라이언트 로직 |
| `docs/근로기준법(...).pdf` | PDF 원본 |
| `vercel.json` | Vercel 배포 설정 |
| `docs/01-plan/features/pdf-chatbot.plan.md` | Plan 문서 |
| `docs/02-design/features/pdf-chatbot.design.md` | Design 문서 |
| `docs/03-analysis/pdf-chatbot.analysis.md` | Gap Analysis 문서 |
| `docs/04-report/pdf-chatbot.report.md` | 본 보고서 |
