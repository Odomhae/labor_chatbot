// 대화 히스토리 (Anthropic messages 형식 — 클라이언트에서 관리)
let history = [];

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const pdfViewer = document.getElementById('pdf-viewer');
const pdfInfo = document.getElementById('pdf-info');
const chatForm = document.getElementById('chat-form');

// 서버에서 PDF 목록 조회 후 iframe에 첫 번째 PDF 표시
async function initPdfViewer() {
  try {
    const res = await fetch('/api/chat');
    const { files } = await res.json();

    if (files && files.length > 0) {
      pdfViewer.src = `/api/chat?serve=${encodeURIComponent(files[0])}`;
      pdfInfo.textContent = `📄 ${files[0]}${files.length > 1 ? ` 외 ${files.length - 1}개` : ''}`;
    } else {
      pdfInfo.textContent = 'docs/ 폴더에 PDF 파일이 없습니다.';
    }
  } catch {
    pdfInfo.textContent = 'PDF 목록을 불러올 수 없습니다.';
  }
}

// 채팅 메시지 DOM 추가
function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

// 전송 처리
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || sendBtn.disabled) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  addMessage('user', text);

  sendBtn.disabled = true;
  const loadingEl = addMessage('loading', '답변 생성 중...');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history }),
    });

    const data = await res.json();
    loadingEl.remove();

    if (data.error) {
      addMessage('assistant', `오류: ${data.error}`);
    } else {
      addMessage('assistant', data.reply);
      // 히스토리 업데이트 (다음 요청에 맥락으로 전달)
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: data.reply });
    }
  } catch {
    loadingEl.remove();
    addMessage('assistant', '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

// 폼 제출
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

// Enter 전송 / Shift+Enter 줄바꿈
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// 초기화
initPdfViewer();
