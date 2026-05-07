# pdf-chatbot Design Document

> **Summary**: PDF를 서버에서 파싱·캐싱하고 Anthropic Claude(claude-haiku-4-5)로 한국어 답변을 제공하는 챗봇 설계
>
> **Project**: PDF 기반 업무 어시스턴트 챗봇
> **Version**: 1.0.0
> **Author**: jhlee@nicevan.co.kr
> **Date**: 2026-05-07
> **Status**: Draft
> **Planning Doc**: [pdf-chatbot.plan.md](../../01-plan/features/pdf-chatbot.plan.md)

---

## Context Anchor

> Copied from Plan document. Ensures strategic context survives Design→Do handoff.

| Key | Value |
|-----|-------|
| **WHY** | PDF 법령/업무 문서 검색의 비효율을 대화형 AI로 해소 |
| **WHO** | 근로기준법 등 업무 문서를 자주 참조하는 실무자 |
| **RISK** | Claude 컨텍스트 한도 초과 (대용량 PDF), Vercel 함수 실행시간 제한 |
| **SUCCESS** | 질문 → 답변 왕복 3초 이내, PDF 내용 외 질문 시 명확한 안내 |
| **SCOPE** | Phase 1: 서버+API, Phase 2: 분할 UI, Phase 3: Vercel 배포 |

---

## 1. Overview

### 1.1 Design Goals

- 서버 시작 시 PDF를 1회 파싱·캐싱하여 요청마다 재파싱하지 않음
- API 키는 서버에서만 처리, 클라이언트에 절대 노출하지 않음
- 바닐라 JS + 순수 CSS로 빌드 단계 없이 동작
- Vercel 서버리스 환경의 무상태(stateless) 특성에 맞게 히스토리를 클라이언트에서 관리

### 1.2 Design Principles

- **단순성 우선**: 빌드 도구·프레임워크 없이 Node.js + Express + 바닐라 JS로 구현
- **서버-클라이언트 책임 분리**: 보안 민감 로직(API 키, PDF 파싱)은 서버, 상태 관리는 클라이언트
- **점진적 확장**: RAG, 스트리밍, 인증 등 추후 기능 추가가 용이한 구조

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: 단일 파일 | Option B: 모듈 완전 분리 | Option C: 실용적 균형 |
|----------|:-:|:-:|:-:|
| **접근 방식** | server.js 1파일에 모든 로직 | 기능별 파일 완전 분리 | server.js + lib/ 헬퍼 분리 |
| **신규 파일** | 6 | 9 | 7 |
| **복잡도** | Low | High | Medium |
| **유지보수성** | Medium | High | High |
| **구현 속도** | 빠름 | 느림 | 중간 |
| **추천 대상** | 프로토타입 | 장기 프로젝트 | **기본 선택** |

**Selected**: **Option C — 실용적 균형**
**Rationale**: PDF 로딩 로직을 `lib/pdfLoader.js`로 분리하면 나중에 교체·테스트가 쉬워지면서도 파일 수를 최소로 유지할 수 있다.

### 2.1 Component Diagram

```
┌──────────────────────────────────┐
│           Browser                │
│  ┌────────────┐  ┌────────────┐  │
│  │ PDF Viewer │  │ Chat Panel │  │
│  │ (<iframe>) │  │  (app.js)  │  │
│  └────────────┘  └─────┬──────┘  │
└────────────────────────┼─────────┘
                         │ POST /api/chat
                         ▼
┌──────────────────────────────────┐
│         server.js (Express)      │
│  ┌───────────────────────────┐   │
│  │  /api/chat  route handler │   │
│  └────────────┬──────────────┘   │
│               │                  │
│  ┌────────────▼──────────────┐   │
│  │   lib/pdfLoader.js        │   │
│  │  (서버 시작 시 1회 실행)    │   │
│  └───────────────────────────┘   │
└────────────────┬─────────────────┘
                 │ Anthropic API call
                 ▼
         ┌──────────────────────┐
         │    Anthropic API     │
         │ claude-haiku-4-5-... │
         └──────────────────────┘
```

### 2.2 Data Flow

```
[사용자 입력] → app.js
  → POST /api/chat { message, history }
    → server.js: system(PDF 전문) + messages(history) 조립
      → Anthropic claude-haiku-4-5 호출
        → { reply } 반환
          → app.js: UI에 출력 + history 배열에 추가
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `server.js` | `lib/pdfLoader.js` | PDF 텍스트 캐시 참조 |
| `server.js` | `@anthropic-ai/sdk` npm 패키지 | Anthropic Claude API 호출 |
| `lib/pdfLoader.js` | `pdf-parse` npm 패키지 | PDF → 텍스트 변환 |
| `public/app.js` | `server.js /api/chat` | 채팅 API 호출 |

---

## 3. Data Model

### 3.1 메시지 구조 (클라이언트 인메모리)

```javascript
// 클라이언트에서 유지하는 대화 히스토리
const history = [
  { role: 'user',      content: '연차 일수는 몇 일인가요?' },
  { role: 'assistant', content: '근로기준법 제60조에 따르면...' }
];
```

### 3.2 API Request / Response

```javascript
// POST /api/chat 요청
{
  message: string,   // 현재 사용자 메시지
  history: [         // 이전 대화 (클라이언트에서 전송)
    { role: 'user' | 'assistant', content: string }
  ]
}

// POST /api/chat 응답
{
  reply: string      // AI 답변 텍스트
}

// 에러 응답
{
  error: string      // 오류 메시지
}
```

### 3.3 서버 인메모리 캐시

```javascript
// lib/pdfLoader.js에서 모듈 수준 변수로 캐싱
let pdfTextCache = null;   // string: 모든 PDF 텍스트 합본
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | `public/index.html` 서빙 | 없음 |
| GET | `/docs/:filename` | PDF 파일 직접 접근 (iframe용) | 없음 |
| POST | `/api/chat` | 사용자 메시지 수신 → AI 답변 반환 | 없음 |

### 4.2 Detailed Specification

#### `POST /api/chat`

**Request:**
```json
{
  "message": "연차 유급휴가는 며칠인가요?",
  "history": [
    { "role": "user", "content": "안녕하세요" },
    { "role": "assistant", "content": "안녕하세요! 무엇이 궁금하신가요?" }
  ]
}
```

**Response (200 OK):**
```json
{
  "reply": "근로기준법 제60조에 따르면 사용자는 1년간 80퍼센트 이상 출근한 근로자에게 15일의 유급휴가를 주어야 합니다."
}
```

**Error Responses:**
- `400 Bad Request`: `message` 필드 누락
- `500 Internal Server Error`: Anthropic API 오류 또는 서버 내부 오류

**Anthropic SDK 호출 방식:**
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// system은 별도 파라미터로 분리 (OpenAI와 다른 점)
const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1024,
  system: `당신은 주어진 PDF 문서를 기반으로 질문에 답변하는 업무 어시스턴트입니다.
반드시 한국어로 답변하세요.
문서에 없는 내용을 질문받으면 "해당 내용은 문서에 없습니다."라고 안내하세요.

=== 문서 내용 ===
${pdfText}`,
  messages: [
    ...history,                         // { role: 'user'|'assistant', content: string }
    { role: 'user', content: message }
  ]
});

const reply = response.content[0].text; // OpenAI와 다른 응답 구조
```

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌─────────────────────────────────────────────────┐
│  Header: "PDF 업무 어시스턴트"                    │
├──────────────────────┬──────────────────────────┤
│                      │  채팅 메시지 영역          │
│   PDF Viewer         │  (스크롤 가능)             │
│   (<iframe>)         │                           │
│                      │  사용자: ...              │
│   50% width          │  AI: ...                  │
│                      │                           │
│                      ├──────────────────────────┤
│                      │  [입력창]      [전송]      │
└──────────────────────┴──────────────────────────┘
```

### 5.2 User Flow

```
페이지 로드 → PDF 뷰어 자동 표시 → 채팅 입력창 포커스
  → 사용자 질문 입력 → 전송 버튼 클릭 or Enter
    → 로딩 인디케이터 표시
      → API 응답 수신
        → 채팅 영역에 답변 출력 + 스크롤 하단 이동
```

### 5.3 Component List

| Component | 파일 | 책임 |
|-----------|------|------|
| 분할 레이아웃 | `public/index.html` | 좌우 패널 구성 |
| PDF 뷰어 | `public/index.html` `<iframe>` | PDF 원본 표시 |
| 채팅 메시지 목록 | `public/app.js` | 메시지 렌더링, 스크롤 |
| 입력창 + 전송 | `public/index.html` + `app.js` | 사용자 입력 처리 |
| 로딩 인디케이터 | `public/app.js` | 답변 생성 중 표시 |

### 5.4 Page UI Checklist

#### 메인 페이지 (index.html)

- [ ] Header: 서비스 제목 텍스트 ("PDF 업무 어시스턴트")
- [ ] Layout: 좌우 50/50 분할 패널
- [ ] PDF Viewer: `<iframe>` — `docs/` 폴더 PDF 자동 로드
- [ ] Chat: 메시지 목록 영역 (스크롤 가능, 최소 높이 지정)
- [ ] Chat: 사용자 메시지 — 오른쪽 정렬, 파란 배경
- [ ] Chat: AI 메시지 — 왼쪽 정렬, 회색 배경
- [ ] Chat: 로딩 인디케이터 ("답변 생성 중..." 텍스트 or 점 애니메이션)
- [ ] Input: 텍스트 입력창 (placeholder: "PDF 내용에 대해 질문하세요...")
- [ ] Input: 전송 버튼 ("전송")
- [ ] Input: Enter 키로 전송 가능
- [ ] Input: 전송 후 입력창 자동 초기화

---

## 6. Error Handling

### 6.1 Error Code Definition

| 상황 | HTTP 코드 | 클라이언트 표시 |
|------|-----------|----------------|
| `message` 필드 누락 | 400 | "메시지를 입력해주세요." |
| Anthropic API 오류 | 500 | "AI 서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." |
| PDF 파싱 실패 | 서버 시작 시 경고 로그, 빈 컨텍스트로 동작 | — |
| ANTHROPIC_API_KEY 미설정 | 서버 시작 거부 | — |
| 네트워크 오류 | fetch 실패 | "서버에 연결할 수 없습니다." |

### 6.2 Error Response Format

```json
{
  "error": "오류 메시지 (사용자 친화적)"
}
```

---

## 7. Security Considerations

- [ ] `ANTHROPIC_API_KEY`는 `process.env`로만 참조, 코드에 하드코딩 금지
- [ ] `/api/chat` 요청의 `message` 길이 제한 (예: 2000자) — 프롬프트 인젝션 및 토큰 낭비 방지
- [ ] PDF 파일은 `docs/` 폴더에서만 서빙 (`path.join` + `path.resolve` 사용, 경로 traversal 방지)
- [ ] CORS는 Vercel 환경에서 동일 오리진 — 별도 설정 불필요

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: API Tests | `/api/chat` 엔드포인트 | curl | Do |
| L2: UI Action Tests | 채팅 입력/전송/표시 | 브라우저 직접 테스트 | Do |
| L3: E2E Scenario | 전체 질문→답변 흐름 | 브라우저 직접 테스트 | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test Description | Expected Status | Expected Response |
|---|----------|--------|-----------------|:--------------:|-------------------|
| 1 | /api/chat | POST | 정상 질문 전송 | 200 | `.reply` 문자열 존재 |
| 2 | /api/chat | POST | message 필드 없이 전송 | 400 | `.error` 존재 |
| 3 | /api/chat | POST | PDF 범위 외 질문 | 200 | `.reply`에 "없습니다" 포함 |
| 4 | /api/chat | POST | history 포함 전송 | 200 | `.reply` 문자열 존재 |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result |
|---|------|--------|----------------|
| 1 | 메인 | 페이지 로드 | PDF iframe + 채팅 패널 동시 표시 |
| 2 | 메인 | 질문 입력 후 전송 | 로딩 인디케이터 → AI 답변 표시 |
| 3 | 메인 | Enter 키 입력 | 전송 버튼과 동일 동작 |
| 4 | 메인 | 빈 입력 전송 | 전송 차단 또는 안내 메시지 |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | 기본 질답 | 질문 입력 → 전송 → 답변 수신 | 한국어 답변 출력, 3초 이내 |
| 2 | 연속 대화 | 2개 이상 질문 연속 전송 | 이전 맥락 반영한 답변 |
| 3 | 범위 외 질문 | PDF와 무관한 질문 입력 | "해당 내용은 문서에 없습니다" 포함 |

---

## 9. Clean Architecture

### 9.1 Layer Structure (Dynamic — Simplified)

| Layer | 책임 | 위치 |
|-------|------|------|
| **Presentation** | UI 렌더링, 사용자 이벤트 | `public/index.html`, `public/style.css`, `public/app.js` |
| **Application** | 라우트 핸들러, messages 조립, Anthropic Claude 호출 | `server.js` (`/api/chat` handler) |
| **Infrastructure** | PDF 파싱 & 캐싱 | `lib/pdfLoader.js` |

### 9.2 Dependency Rules

```
public/app.js  ──fetch──▶  server.js (/api/chat)
                               │
                               ▼
                         lib/pdfLoader.js
                         (서버 시작 시 로드)
```

---

## 10. Coding Convention Reference

### 10.1 This Feature's Conventions

| 항목 | 적용 규칙 |
|------|----------|
| 주석 언어 | 한국어 |
| 함수명 | camelCase (`loadPdfs`, `handleChat`) |
| 상수 | UPPER_SNAKE_CASE (`MAX_TEXT_LENGTH`) |
| 파일명 | camelCase.js (`pdfLoader.js`, `app.js`) |
| 에러 응답 | `{ error: string }` JSON |
| 환경변수 | `process.env.ANTHROPIC_API_KEY` (서버 전용) |

---

## 11. Implementation Guide

### 11.1 File Structure

```
my-pdf-chatbot/
├── server.js              # Express 진입점 + /api/chat 라우트
├── lib/
│   └── pdfLoader.js       # PDF 파싱 & 텍스트 캐싱
├── public/
│   ├── index.html         # 분할 레이아웃 (iframe + 채팅)
│   ├── style.css          # UI 스타일
│   └── app.js             # 채팅 클라이언트 로직
├── docs/
│   └── *.pdf              # PDF 원본 (Git 포함)
├── .env                   # ANTHROPIC_API_KEY (Git 제외)
├── package.json           # 의존성: express, pdf-parse, @anthropic-ai/sdk, dotenv
└── vercel.json            # Vercel 라우팅
```

### 11.2 Implementation Order

1. [ ] `package.json` 작성 및 `npm install`
2. [ ] `lib/pdfLoader.js` — PDF 파싱 & 캐싱 모듈
3. [ ] `server.js` — Express 서버 + `/api/chat` 엔드포인트
4. [ ] `public/index.html` — 분할 레이아웃
5. [ ] `public/style.css` — UI 스타일
6. [ ] `public/app.js` — 채팅 클라이언트
7. [ ] `vercel.json` — Vercel 라우팅
8. [ ] 로컬 테스트 (`npm start`)
9. [ ] Vercel 배포

### 11.3 Session Guide

> `/pdca do pdf-chatbot --scope module-1` 또는 `--scope module-2` 로 나눠서 구현 가능.

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 서버 + API | `module-1` | package.json, pdfLoader.js, server.js | 15-20 |
| 프론트엔드 UI | `module-2` | index.html, style.css, app.js, vercel.json | 15-20 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 30-40 |
| Session 2 | Do | `--scope module-1` (서버) | 20-25 |
| Session 3 | Do | `--scope module-2` (프론트엔드) | 20-25 |
| Session 4 | Check + Report | 전체 | 20-30 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-07 | Initial draft (Option C 선택) | jhlee@nicevan.co.kr |
