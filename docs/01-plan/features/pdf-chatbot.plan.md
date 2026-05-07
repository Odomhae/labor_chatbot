# pdf-chatbot Planning Document

> **Summary**: PDF 문서를 업로드 없이 서버에서 로딩하고, Anthropic Claude API로 질문에 한국어로 답변하는 챗봇
>
> **Project**: PDF 기반 업무 어시스턴트 챗봇
> **Version**: 1.0.0
> **Author**: jhlee@nicevan.co.kr
> **Date**: 2026-05-07
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | PDF 문서(근로기준법 등)의 내용을 빠르게 검색하고 이해하는 데 시간이 많이 걸림 |
| **Solution** | PDF를 서버에서 파싱해 컨텍스트로 활용하고, Anthropic Claude(claude-haiku-4-5)가 자연어로 답변 |
| **Function/UX Effect** | 왼쪽 PDF 뷰어 + 오른쪽 채팅 패널 분할 UI로 문서를 보며 질문 가능 |
| **Core Value** | 복잡한 법령·업무 문서를 대화 형식으로 빠르게 파악하는 업무 어시스턴트 |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | PDF 법령/업무 문서 검색의 비효율을 대화형 AI로 해소 |
| **WHO** | 근로기준법 등 업무 문서를 자주 참조하는 실무자 |
| **RISK** | OpenAI 토큰 한도 초과 (대용량 PDF), Vercel 함수 실행시간 제한 |
| **SUCCESS** | 질문 → 답변 왕복 3초 이내, PDF 내용 외 질문 시 명확한 안내 |
| **SCOPE** | Phase 1: 서버+API, Phase 2: 분할 UI, Phase 3: Vercel 배포 |

---

## 1. Overview

### 1.1 Purpose

`docs/` 폴더에 보관된 PDF(근로기준법 등)를 서버 시작 시 파싱하여 메모리에 적재하고, 사용자가 채팅 UI에서 질문하면 OpenAI gpt-4o-mini가 PDF 내용을 기반으로 한국어로 답변한다.

### 1.2 Background

법령·사내 규정 등 업무 문서는 분량이 많아 원하는 조항을 찾는 데 시간이 소요된다. 챗봇을 통해 자연어로 질문하면 관련 내용을 즉시 확인할 수 있어 업무 효율이 향상된다.

### 1.3 Related Documents

- CLAUDE.md (프로젝트 규칙)
- docs/근로기준법(법률)(제20520호)(20250223).pdf

---

## 2. Scope

### 2.1 In Scope

- [x] 서버 시작 시 `docs/` 폴더 PDF 전체 파싱 및 메모리 적재
- [x] POST `/api/chat` 엔드포인트 (질문 수신 → OpenAI 호출 → 답변 반환)
- [x] 대화 히스토리 유지 (세션별 messages 배열 누적)
- [x] PDF 범위 외 질문 시 "해당 내용은 문서에 없습니다" 안내
- [x] 분할 UI: 왼쪽 PDF 뷰어(`<iframe>`), 오른쪽 채팅 패널
- [x] 답변 언어: 한국어 고정 (시스템 프롬프트로 강제)
- [x] Vercel 배포 (`vercel.json` 라우팅)

### 2.2 Out of Scope

- 사용자 직접 PDF 업로드 기능
- 사용자 인증/로그인
- 다국어 지원
- 벡터 DB / 임베딩 검색 (RAG)
- 스트리밍 응답 (Server-Sent Events)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 서버 시작 시 `docs/` PDF 파싱 → 텍스트 메모리 저장 | High | Pending |
| FR-02 | `POST /api/chat`: `{ message, history }` → Anthropic Claude 호출 → `{ reply }` | High | Pending |
| FR-03 | system 파라미터에 PDF 전문 삽입, 한국어 답변 강제 | High | Pending |
| FR-04 | PDF 범위 외 질문 시 "해당 내용은 문서에 없습니다" 안내 | High | Pending |
| FR-05 | 클라이언트에서 대화 히스토리 유지 후 매 요청에 포함 | Medium | Pending |
| FR-06 | 분할 레이아웃: 좌측 PDF `<iframe>`, 우측 채팅 패널 | Medium | Pending |
| FR-07 | 채팅 패널: 입력창, 전송 버튼, 스크롤 메시지 목록 | Medium | Pending |
| FR-08 | 답변 생성 중 로딩 인디케이터 표시 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 질문 → 답변 왕복 ≤ 3초 (claude-haiku-4-5 기준) | 브라우저 Network 탭 |
| Security | API 키 서버에서만 처리, 프론트엔드 미노출 | 코드 리뷰 |
| Availability | Vercel 서버리스 함수 실행시간 ≤ 10초 | Vercel 로그 |
| Compatibility | 최신 Chrome/Edge/Safari 지원 | 직접 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] PDF 파싱 후 텍스트 추출 성공 (콘솔 로그 확인)
- [ ] `/api/chat` 엔드포인트 정상 응답 (HTTP 200)
- [ ] 분할 UI에서 PDF 뷰어와 채팅이 동시에 작동
- [ ] 한국어 답변 확인
- [ ] PDF 범위 외 질문 시 안내 문구 출력
- [ ] Vercel 배포 후 정상 작동

### 4.2 Quality Criteria

- [ ] OPENAI_API_KEY가 프론트엔드 코드 어디에도 노출되지 않음
- [ ] `.env` 파일이 Git에 포함되지 않음 (`.gitignore` 확인)
- [ ] 서버 에러 시 클라이언트에 친절한 오류 메시지 표시

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| PDF 텍스트 크기 → Claude 컨텍스트 한도 초과 | High | Medium | 텍스트 앞 N자 제한 또는 청크 분리 |
| Vercel 함수 실행시간 10초 초과 | High | Low | 서버 시작 시 파싱 캐싱, cold start 최소화 |
| `pdf-parse` 인코딩 미지원 PDF | Medium | Low | 파싱 실패 시 빈 텍스트로 폴백 |
| `ANTHROPIC_API_KEY` 미설정 시 크래시 | High | Low | 시작 시 환경변수 검증 후 명확한 오류 출력 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `server.js` | 신규 파일 | Express 서버 + PDF 파싱 + OpenAI API 연동 |
| `public/index.html` | 신규 파일 | 분할 레이아웃 UI |
| `public/style.css` | 신규 파일 | 채팅 UI 스타일 |
| `public/app.js` | 신규 파일 | 클라이언트 채팅 로직 |
| `vercel.json` | 신규 파일 | Vercel 라우팅 설정 |
| `package.json` | 신규 파일 | 의존성 정의 |

### 6.2 Current Consumers

신규 프로젝트로 기존 소비자 없음.

### 6.3 Verification

- [ ] 모든 파일 신규 생성으로 기존 코드 영향 없음

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | 단순 구조 | 정적 사이트, 포트폴리오 | - |
| **Dynamic** | Feature 기반 모듈, BaaS 연동 | 백엔드 포함 웹앱, SaaS MVP | **✓** |
| **Enterprise** | 레이어 분리, DI, 마이크로서비스 | 대규모 시스템 | - |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 서버 프레임워크 | Express / Fastify / Koa | Express | CLAUDE.md 기준, 단순하고 널리 사용됨 |
| PDF 파싱 | pdf-parse / pdfjs-dist | pdf-parse | 서버사이드 Node.js 환경에 적합 |
| AI 모델 | claude-opus-4-7 / claude-sonnet-4-6 / claude-haiku-4-5 | claude-haiku-4-5-20251001 | 비용 효율, Q&A에 충분한 성능 |
| 히스토리 저장 | 서버 세션 / 클라이언트 | 클라이언트 | Vercel 서버리스 무상태 환경에 적합 |
| PDF 뷰어 | `<iframe>` / PDF.js | `<iframe>` | 구현 단순, 빠른 개발 |
| 스타일링 | Tailwind / CSS Modules / 순수 CSS | 순수 CSS | 빌드 단계 없는 바닐라 환경 |

### 7.3 Clean Architecture Approach

```
Selected Level: Dynamic (Simplified — 바닐라 JS, 빌드 없음)

my-pdf-chatbot/
├── server.js          # Express 진입점 (PDF 파싱 + OpenAI 호출)
├── public/
│   ├── index.html     # 분할 레이아웃 (iframe + chat panel)
│   ├── style.css      # UI 스타일
│   └── app.js         # 클라이언트 채팅 로직
├── docs/              # PDF 원본 보관
├── .env               # 환경변수 (Git 제외)
├── package.json
└── vercel.json        # Vercel 라우팅
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` 코딩 규칙 존재
- [ ] `docs/01-plan/conventions.md` 미존재
- [ ] ESLint 설정 미존재 (바닐라 JS 프로젝트)

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **주석 언어** | CLAUDE.md 정의 | 한국어 주석 | High |
| **API 경로** | 미정 | `/api/chat` | High |
| **환경 변수** | CLAUDE.md 정의 | `OPENAI_API_KEY` | High |
| **에러 처리** | 미정 | `{ error: string }` JSON 반환 | Medium |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | Required |
|----------|---------|-------|:--------:|
| `ANTHROPIC_API_KEY` | Anthropic Claude API 인증 | Server only | **✓** |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`pdf-chatbot.design.md`) — `/pdca design pdf-chatbot`
2. [ ] `server.js` 구현 (PDF 파싱 + `/api/chat` 엔드포인트)
3. [ ] `public/` UI 구현 (분할 레이아웃)
4. [ ] 로컬 테스트 후 Vercel 배포

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-07 | Initial draft | jhlee@nicevan.co.kr |
