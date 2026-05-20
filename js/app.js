/**
 * 事事如嗦 — 嗦语 聊天前端
 * Coze API 由 server.js 代理，密钥在 .env 中配置
 */

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    '嘿，我是嗦语。那些堵在心里的「硬面条」，交给我，我陪你一起把它们嗦掉。',
};

const MOCK_HISTORY = [
  {
    id: 'mock-1',
    title: '深夜的焦虑面',
    preview: '最近总是感到焦虑…',
    time: '今天 14:20',
    messages: [
      { role: 'assistant', content: WELCOME_MESSAGE.content },
      { role: 'user', content: '最近总是感到焦虑，晚上也睡不好。' },
      {
        role: 'assistant',
        content:
          '谢谢你愿意说出来。焦虑和睡眠往往互相影响，你能觉察到它们，已经是很重要的一步。\n\n我们可以先慢一点：最近有没有某个具体时刻，焦虑特别明显？',
      },
    ],
  },
  {
    id: 'mock-2',
    title: '睡不着的夜面',
    preview: '躺下后脑子停不下来…',
    time: '昨天 22:05',
    messages: [
      { role: 'assistant', content: '夜深了，如果睡不着，也可以来这里坐坐。嗦语在听。' },
      { role: 'user', content: '躺下后脑子停不下来，越想越清醒。' },
      {
        role: 'assistant',
        content:
          '这种「停不下来的思绪」很常见。我们不急着赶走它们。\n\n试试把呼吸放慢：吸气 4 秒，呼气 6 秒。做完三次后，告诉我身体有没有稍微松一点？',
      },
    ],
  },
  {
    id: 'mock-3',
    title: '工作压力面',
    preview: '项目 deadline 很紧…',
    time: '周一 09:15',
    messages: [
      { role: 'assistant', content: '工作日的早晨，辛苦了。想聊聊工作上的压力吗？' },
      { role: 'user', content: '项目 deadline 很紧，总觉得做不好会被批评。' },
      {
        role: 'assistant',
        content:
          '在高压下担心被评价，说明你很在乎自己的表现。\n\n如果把压力从 0 到 10 打分，现在是几分？我们可以一起看看，哪一部分是可以先放一放的。',
      },
    ],
  },
];

const state = {
  sessions: [],
  activeId: null,
  conversationId: null,
  isSending: false,
  cozeConfigured: false,
  demoMode: true,
  offlineOnly: false,
};

const API = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.api : { health: '/api/health', chat: '/api/chat' };

function uid() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getActiveSession() {
  return state.sessions.find((s) => s.id === state.activeId);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessageHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br />');
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  list.innerHTML = state.sessions
    .map(
      (s) => `
    <button
      type="button"
      data-id="${s.id}"
      class="history-item w-full text-left px-3 py-3 rounded-2xl transition-colors ${
        s.id === state.activeId
          ? 'bg-white/90 shadow-card border border-oatDeep'
          : 'hover:bg-white/50 border border-transparent'
      }"
    >
      <div class="font-medium text-sm text-coffee truncate">${escapeHtml(s.title)}</div>
      <p class="text-xs text-mist mt-1 truncate">${escapeHtml(s.preview || '')}</p>
      <p class="text-[11px] text-mist/80 mt-1">${escapeHtml(s.time || '')}</p>
    </button>
  `,
    )
    .join('');

  list.querySelectorAll('.history-item').forEach((btn) => {
    btn.addEventListener('click', () => switchSession(btn.dataset.id));
  });
}

function renderMessages() {
  const container = document.getElementById('messages');
  const session = getActiveSession();
  const messages = session?.messages?.length ? session.messages : [WELCOME_MESSAGE];
  const agentLabel = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.agentName : '嗦语';

  container.innerHTML = messages
    .map((msg) => {
      const isUser = msg.role === 'user';
      return `
      <div class="flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2">
        ${
          !isUser
            ? `<span class="hidden sm:inline text-[11px] text-mist shrink-0 mb-1">${agentLabel}</span>`
            : ''
        }
        <div
          class="max-w-[85%] md:max-w-[70%] px-4 py-3 text-[15px] leading-relaxed shadow-card ${
            isUser
              ? 'bubble-user text-white rounded-[1.25rem] rounded-br-md'
              : 'bg-white text-coffeeDark border border-oatDeep/50 rounded-[1.25rem] rounded-bl-md'
          }"
        >
          ${formatMessageHtml(msg.content)}
        </div>
      </div>
    `;
    })
    .join('');

  container.scrollTop = container.scrollHeight;
}

function updateHeader() {
  const session = getActiveSession();
  document.getElementById('chat-title').textContent = session?.title || '嗦语在等你';
  document.getElementById('chat-subtitle').textContent =
    session?.preview || '把那些堵在心里的硬面条，慢慢嗦出来';
}

function switchSession(id) {
  state.activeId = id;
  const session = getActiveSession();
  state.conversationId = session?.conversationId || null;
  renderHistory();
  renderMessages();
  updateHeader();
}

function createSession({ title = '新嗦一碗', preview = '', messages = [], conversationId = null } = {}) {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const session = {
    id: uid(),
    title,
    preview,
    time: `今天 ${time}`,
    messages: messages.length ? [...messages] : [WELCOME_MESSAGE],
    conversationId,
  };
  state.sessions.unshift(session);
  state.activeId = session.id;
  state.conversationId = conversationId;
  return session;
}

function startNewChat() {
  createSession();
  renderHistory();
  renderMessages();
  updateHeader();
  document.getElementById('message-input').focus();
}

function appendMessage(role, content) {
  const session = getActiveSession();
  if (!session) return;
  session.messages.push({ role, content });
  if (role === 'user') {
    session.preview = content.slice(0, 30);
    if (session.title === '新嗦一碗') {
      session.title = content.slice(0, 12) + (content.length > 12 ? '…' : '');
    }
  }
  renderMessages();
  renderHistory();
  updateHeader();
}

const MIN_NOODLE_MS = 1200;
let noodleShownAt = 0;

/** AI 思考中：拉面拉长 → 折叠 → 拉长 循环动画 */
const NOODLE_THINKING_HTML = `
  <div class="noodle-thinking bg-white border border-oatDeep/50 rounded-[1.25rem] rounded-bl-md px-5 py-3 shadow-card">
    <div class="noodle-stage" role="status" aria-label="嗦语思考中">
      <span class="noodle-chopstick left" aria-hidden="true"></span>
      <span class="noodle-chopstick right" aria-hidden="true"></span>
      <div class="noodle-strands" aria-hidden="true">
        <span class="noodle-strand s1"></span>
        <span class="noodle-strand s2"></span>
        <span class="noodle-strand s3"></span>
      </div>
      <div class="noodle-bowl" aria-hidden="true"></div>
    </div>
    <p class="noodle-hint text-[11px] text-mist mt-2 text-center tracking-wide">嗦语正在嗦面…</p>
  </div>
`;

function setTyping(show) {
  const container = document.getElementById('messages');
  const existing = document.getElementById('typing-indicator');
  if (!show) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const el = document.createElement('div');
  el.id = 'typing-indicator';
  el.className = 'flex justify-start items-end gap-2';
  el.innerHTML = `
    <span class="hidden sm:inline text-[11px] text-mist mb-10 shrink-0">嗦语</span>
    ${NOODLE_THINKING_HTML}
  `;
  noodleShownAt = Date.now();
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function hideThinking() {
  const elapsed = Date.now() - noodleShownAt;
  if (noodleShownAt && elapsed < MIN_NOODLE_MS) {
    await new Promise((r) => setTimeout(r, MIN_NOODLE_MS - elapsed));
  }
  setTyping(false);
}

function updateStreamingBubbleSync(content) {
  const bubble = document.getElementById('streaming-reply');
  if (!bubble) return;
  bubble.querySelector('.stream-content').innerHTML = formatMessageHtml(content);
  const container = document.getElementById('messages');
  container.scrollTop = container.scrollHeight;
}

async function updateStreamingBubble(content) {
  await hideThinking();

  let bubble = document.getElementById('streaming-reply');
  const container = document.getElementById('messages');

  if (!bubble) {
    const wrap = document.createElement('div');
    wrap.id = 'streaming-reply';
    wrap.className = 'flex justify-start items-end gap-2';
    wrap.innerHTML = `
      <span class="hidden sm:inline text-[11px] text-mist mb-1">嗦语</span>
      <div class="stream-content max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-[1.25rem] rounded-bl-md text-[15px] leading-relaxed shadow-card bg-white text-coffeeDark border border-oatDeep/50"></div>
    `;
    container.appendChild(wrap);
    bubble = wrap;
  }

  bubble.querySelector('.stream-content').innerHTML = formatMessageHtml(content);
  container.scrollTop = container.scrollHeight;
}

function finalizeStreamingBubble(content) {
  document.getElementById('streaming-reply')?.remove();
  appendMessage('assistant', content);
}

function setSending(loading) {
  state.isSending = loading;
  document.getElementById('btn-send').disabled = loading;
  document.getElementById('message-input').disabled = loading;
}

function updateStatusBadge() {
  const badge = document.getElementById('status-badge');
  if (!badge) return;

  if (state.offlineOnly) {
    badge.innerHTML =
      '<span class="w-2 h-2 rounded-full bg-millet"></span><span>仅界面预览（请运行 启动.bat）</span>';
  } else if (state.cozeConfigured) {
    badge.innerHTML =
      '<span class="w-2 h-2 rounded-full bg-sage"></span><span>嗦语已连接</span>';
  } else if (state.demoMode) {
    badge.innerHTML =
      '<span class="w-2 h-2 rounded-full bg-millet"></span><span>演示模式（配置 .env 后启用嗦语）</span>';
  } else {
    badge.innerHTML =
      '<span class="w-2 h-2 rounded-full bg-red-400"></span><span>等待配置 Coze API</span>';
  }
}

function localDemoReply(message) {
  const snippets = [
    `谢谢你愿意说出来。关于「${message.slice(0, 20)}${message.length > 20 ? '…' : ''}」，我能感受到你在认真面对自己的感受。`,
    '我听到你了。愿意把委屈嗦出来，本身就是一种勇气。',
    '你的感受值得被重视。我们不必急着给出答案，先一起把情绪安放好。',
  ];
  return `${snippets[Math.floor(Math.random() * snippets.length)]}\n\n此刻，做三次缓慢的深呼吸，然后告诉我：如果给今天的情绪打一个 0–10 分，你会打几分？`;
}

async function streamLocalDemo(text) {
  await waitForPaint();
  let full = '';
  const chunks = text.match(/[\s\S]{1,6}/g) || [text];
  for (const chunk of chunks) {
    full += chunk;
    await updateStreamingBubble(full);
    await new Promise((r) => setTimeout(r, 35));
  }
  finalizeStreamingBubble(full);
}

async function checkHealth() {
  try {
    const res = await fetch(API.health);
    const data = await res.json();
    state.cozeConfigured = data.cozeConfigured;
    state.demoMode = data.demoMode;
    state.offlineOnly = false;
  } catch {
    state.cozeConfigured = false;
    state.demoMode = true;
    state.offlineOnly = true;
  }
  updateStatusBadge();
}

async function sendMessage(text) {
  setSending(true);
  setTyping(true);
  await waitForPaint();

  if (state.offlineOnly) {
    await streamLocalDemo(localDemoReply(text));
    setSending(false);
    return;
  }

  let fullReply = '';
  let streamStarted = false;

  try {
    const res = await fetch(API.chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        conversationId: state.conversationId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `请求失败 (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        let event = 'message';
        let dataStr = '';
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) dataStr += line.slice(5).trim();
        }
        if (!dataStr) continue;

        let data;
        try {
          data = JSON.parse(dataStr);
        } catch {
          continue;
        }

        if (event === 'meta' && data.conversationId) {
          state.conversationId = data.conversationId;
          const session = getActiveSession();
          if (session) session.conversationId = data.conversationId;
        }

        if (event === 'delta' && data.content) {
          fullReply += data.content;
          if (!streamStarted) {
            streamStarted = true;
            await updateStreamingBubble(fullReply);
          } else {
            updateStreamingBubbleSync(fullReply);
          }
        }

        if (event === 'error') {
          throw new Error(data.message || '对话出错');
        }

        if (event === 'done') {
          if (data.content) fullReply = data.content;
        }
      }
    }

    const looksLikeApiError =
      /token|bot_id|does not exist|incorrect|error|错误/i.test(fullReply) &&
      fullReply.length < 280;

    if (looksLikeApiError) {
      throw new Error(
        fullReply.includes('bot_id') || fullReply.includes('does not exist')
          ? '智能体 Bot ID 不正确。请在 .env 中填写 Coze 智能体页面地址栏 bot/ 后的数字，并确认已发布为 API。'
          : fullReply.includes('token') || fullReply.includes('Token')
            ? 'API Token 无效。请在 Coze 后台重新生成令牌并更新 .env 中的 COZE_API_TOKEN。'
            : fullReply,
      );
    }

    if (!streamStarted) {
      await hideThinking();
    }
    finalizeStreamingBubble(fullReply || '嗦语暂时没接上，请稍后再试。');
  } catch (err) {
    await hideThinking();
    document.getElementById('streaming-reply')?.remove();
    appendMessage(
      'assistant',
      `⚠️ ${err.message}\n\n请确认已双击「启动.bat」运行服务，并检查 .env 中的 COZE_API_TOKEN 与 COZE_BOT_ID。`,
    );
  } finally {
    setSending(false);
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
}

function bindNewChatButtons() {
  ['btn-new-chat', 'btn-new-chat-top'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', startNewChat);
  });
}

function init() {
  MOCK_HISTORY.forEach((item) => {
    state.sessions.push({
      id: item.id,
      title: item.title,
      preview: item.preview,
      time: item.time,
      messages: [...item.messages],
      conversationId: null,
    });
  });

  state.activeId = state.sessions[0]?.id || null;
  if (!state.activeId) createSession();

  renderHistory();
  renderMessages();
  updateHeader();
  checkHealth();
  bindNewChatButtons();

  const input = document.getElementById('message-input');
  input.addEventListener('input', () => autoResizeTextarea(input));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('chat-form').requestSubmit();
    }
  });

  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.isSending) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    autoResizeTextarea(input);
    appendMessage('user', text);
    await sendMessage(text);
  });
}

document.addEventListener('DOMContentLoaded', init);
