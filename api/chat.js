// Vercel 서버리스 함수 — API 키는 이 파일에서만 사용
require('dotenv').config();

const OpenAI = require('openai');
const pdfParse = require('pdf-parse/lib/pdf-parse.js'); // Vercel 환경 안전 임포트
const fs = require('fs');
const path = require('path');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// PDF 파일 위치: 프로젝트 루트의 docs/ 폴더
const DOCS_DIR = path.join(__dirname, '..', 'docs');

// PDF 텍스트 캐시 (warm start 시 재파싱 방지)
let pdfCache = null;

async function loadPdfs() {
  if (pdfCache !== null) return pdfCache;

  if (!fs.existsSync(DOCS_DIR)) {
    pdfCache = { text: '', files: [] };
    return pdfCache;
  }

  const pdfFiles = fs.readdirSync(DOCS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  const texts = [];

  for (const file of pdfFiles) {
    try {
      const buffer = fs.readFileSync(path.join(DOCS_DIR, file));
      const data = await pdfParse(buffer);
      texts.push(`=== ${file} ===\n${data.text}`);
      console.log(`[PDF 로드 완료] ${file} (${data.text.length}자)`);
    } catch (err) {
      console.error(`[PDF 파싱 오류] ${file}:`, err.message);
    }
  }

  pdfCache = { text: texts.join('\n\n'), files: pdfFiles };
  return pdfCache;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — PDF 목록 조회 또는 PDF 파일 서빙 (iframe용)
  if (req.method === 'GET') {
    const { serve } = req.query;

    if (serve) {
      // 경로 traversal 방지
      const safeFile = path.basename(serve);
      const filePath = path.join(DOCS_DIR, safeFile);

      if (!safeFile.toLowerCase().endsWith('.pdf') || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
      }

      const buffer = fs.readFileSync(filePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(safeFile)}`);
      return res.send(buffer);
    }

    // PDF 파일 목록 반환
    const { files } = await loadPdfs();
    return res.status(200).json({ files });
  }

  // POST — GPT와 채팅
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  }

  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: '메시지를 입력해주세요.' });
  }

  if (message.trim().length > 2000) {
    return res.status(400).json({ error: '메시지는 2000자 이내로 입력해주세요.' });
  }

  try {
    const { text: pdfText } = await loadPdfs();

    // 시스템 프롬프트: PDF 내용 삽입 + 범위 외 질문 처리 지시
    const systemContent = pdfText
      ? `당신은 주어진 문서를 기반으로 질문에 답변하는 업무 어시스턴트입니다.
반드시 한국어로 답변하세요.
오직 아래 문서의 내용만을 근거로 답변하고, 문서에 없는 내용은 반드시 "PDF 내용에 없는 질문은 답변할 수 없습니다."라고 답변하세요.

=== 문서 내용 ===
${pdfText.slice(0, 60000)}`
      : '당신은 업무 어시스턴트입니다. 반드시 한국어로 답변하세요. 현재 로드된 문서가 없습니다.';

    // OpenAI: system 메시지를 messages 배열 첫 번째 항목으로 포함
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        ...history,
        { role: 'user', content: message.trim() },
      ],
    });

    return res.status(200).json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error('[OpenAI API 오류]', err.message);
    return res.status(500).json({
      error: 'AI 서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
};
