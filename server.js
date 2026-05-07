// 로컬 개발용 Express 서버 (Vercel 서버리스 함수를 에뮬레이션)
require('dotenv').config();

const express = require('express');
const path = require('path');
const chatHandler = require('./api/chat');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 정적 파일 서빙 (public/)
app.use(express.static(path.join(__dirname, 'public')));

// API 라우트 — Vercel 서버리스 핸들러를 Express에서 직접 실행
app.all('/api/chat', chatHandler);

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
