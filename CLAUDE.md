# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요
PDF 문서를 읽고 사용자 질문에 답변하는 업무 어시스턴트 챗봇.
OpenAI API(`gpt-4o-mini`)로 PDF 내용을 기반으로 자연어 응답을 제공한다. Vercel에 배포한다.

## 기술 스택
- **서버**: Node.js + Express
- **프론트엔드**: HTML / CSS / JavaScript (바닐라)
- **AI**: OpenAI API — `gpt-4o-mini`
- **PDF 파싱**: `pdf-parse` (서버 사이드 전용)
- **배포**: Vercel

## 주요 명령어
```bash
npm install        # 의존성 설치
npm start          # 서버 실행 (포트 3000)
npm run dev        # 개발 모드 (nodemon — 파일 변경 시 자동 재시작)
```

## 아키텍처
```
클라이언트(public/) ──HTTP──▶ Express(server.js) ──▶ pdf-parse(docs/)
                                      │
                                      ▼
                               OpenAI API (gpt-4o-mini)
```

- `server.js`: 유일한 서버 진입점. PDF 로딩·파싱과 OpenAI 호출을 모두 담당한다.
- `public/`: 정적 파일(HTML/CSS/JS). 빌드 단계 없이 Express가 직접 서빙한다.
- `docs/`: PDF 원본 파일 보관. 서버 시작 시 또는 요청 시 파싱하여 컨텍스트로 사용한다.
- OpenAI API 키는 `server.js`에서만 참조(`process.env.OPENAI_API_KEY`). 프론트엔드에 절대 노출하지 않는다.

## 환경 변수
`.env` 파일(Git 제외)에 설정한다. Vercel 배포 시 대시보드에서 등록한다.
```
OPENAI_API_KEY=sk-...
```

## 개발 규칙
- `.env` 파일은 절대 수정하거나 Git에 추가하지 말 것
- PDF 파일은 반드시 `docs/` 폴더에 보관
- 주석은 한국어로 작성
- 커밋 메시지는 한국어 허용

## Vercel 배포
- `vercel.json`에서 모든 요청을 `server.js`로 라우팅한다.
- `docs/` 폴더 PDF에 Vercel 함수가 접근할 수 있도록 경로를 `__dirname` 기준으로 설정한다.
