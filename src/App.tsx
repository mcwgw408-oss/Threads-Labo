import { FormEvent, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  CirclePlus,
  Edit3,
  FlaskConical,
  Lightbulb,
  NotebookPen,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';

type Status = '候補' | '執筆中' | '予約投稿' | '投稿完了';
type IdeaKind = 'Threads候補' | 'note候補' | 'AI実験候補';

type ThreadLog = {
  id: string;
  publishedAt: string;
  body: string;
  status: Status;
  views: number;
  likes: number;
  reposts: number;
  followerDelta: number;
  saves: number;
  insight: string;
  growthReason: string;
  noteCandidate: boolean;
  aiLabCandidate: boolean;
  recoveryCandidate: boolean;
  tags: string[];
  ownMemo: string;
  whyThought: string;
  makeNote: boolean;
  makeSeries: boolean;
  updatedAt: string;
};

type Idea = {
  id: string;
  kind: IdeaKind;
  title: string;
  memo: string;
  tags: string[];
  createdAt: string;
};

type LogForm = Omit<ThreadLog, 'id' | 'updatedAt'>;
type IdeaForm = Omit<Idea, 'id' | 'createdAt'>;

const STORAGE_KEY = 'threads-labo-state-v1';

const statuses: Status[] = ['候補', '執筆中', '予約投稿', '投稿完了'];
const ideaKinds: IdeaKind[] = ['Threads候補', 'note候補', 'AI実験候補'];
const starterTags = ['AI', '回復期', '生活', '発見', 'ゲーム', '睡眠'];

const statusMeta: Record<Status, { className: string; label: string }> = {
  候補: { className: 'status-idea', label: '候補' },
  執筆中: { className: 'status-writing', label: '執筆中' },
  予約投稿: { className: 'status-scheduled', label: '予約投稿' },
  投稿完了: { className: 'status-done', label: '投稿完了' },
};

const emptyLogForm = (): LogForm => ({
  publishedAt: new Date().toISOString().slice(0, 10),
  body: '',
  status: '候補',
  views: 0,
  likes: 0,
  reposts: 0,
  followerDelta: 0,
  saves: 0,
  insight: '',
  growthReason: '',
  noteCandidate: false,
  aiLabCandidate: false,
  recoveryCandidate: false,
  tags: [],
  ownMemo: '',
  whyThought: '',
  makeNote: false,
  makeSeries: false,
});

const emptyIdeaForm = (): IdeaForm => ({
  kind: 'Threads候補',
  title: '',
  memo: '',
  tags: [],
});

const sampleLogs: ThreadLog[] = [
  {
    id: crypto.randomUUID(),
    publishedAt: new Date().toISOString().slice(0, 10),
    body: '回復期に「今日は小さく進めば勝ち」と思える仕組みを作る話',
    status: '候補',
    views: 0,
    likes: 0,
    reposts: 0,
    followerDelta: 0,
    saves: 0,
    insight: 'やさしい実用ネタはシリーズ化しやすい',
    growthReason: '',
    noteCandidate: true,
    aiLabCandidate: false,
    recoveryCandidate: true,
    tags: ['回復期', '生活'],
    ownMemo: '短文で出して、反応があればnoteへ',
    whyThought: '',
    makeNote: true,
    makeSeries: true,
    updatedAt: new Date().toISOString(),
  },
];

function loadState(): { logs: ThreadLog[]; ideas: Idea[]; tags: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { logs: sampleLogs, ideas: [], tags: starterTags };
    }
    const parsed = JSON.parse(raw) as { logs?: ThreadLog[]; ideas?: Idea[]; tags?: string[] };
    return {
      logs: parsed.logs ?? [],
      ideas: parsed.ideas ?? [],
      tags: parsed.tags?.length ? parsed.tags : starterTags,
    };
  } catch {
    return { logs: sampleLogs, ideas: [], tags: starterTags };
  }
}

function saveState(logs: ThreadLog[], ideas: Idea[], tags: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ logs, ideas, tags }));
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        inputMode="numeric"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function TogglePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`pill ${active ? 'is-active' : ''}`} type="button" onClick={onClick}>
      {active && <Check size={14} />}
      {label}
    </button>
  );
}

function TagPicker({
  selected,
  tags,
  onToggle,
}: {
  selected: string[];
  tags: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="tag-grid">
      {tags.map((tag) => (
        <TogglePill
          key={tag}
          active={selected.includes(tag)}
          label={tag}
          onClick={() => onToggle(tag)}
        />
      ))}
    </div>
  );
}

export function App() {
  const initial = useMemo(() => loadState(), []);
  const [logs, setLogs] = useState<ThreadLog[]>(initial.logs);
  const [ideas, setIdeas] = useState<Idea[]>(initial.ideas);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [logForm, setLogForm] = useState<LogForm>(emptyLogForm);
  const [ideaForm, setIdeaForm] = useState<IdeaForm>(emptyIdeaForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'すべて'>('すべて');

  const persist = (nextLogs = logs, nextIdeas = ideas, nextTags = tags) => {
    saveState(nextLogs, nextIdeas, nextTags);
  };

  const updateLogs = (nextLogs: ThreadLog[]) => {
    setLogs(nextLogs);
    persist(nextLogs, ideas, tags);
  };

  const updateIdeas = (nextIdeas: Idea[]) => {
    setIdeas(nextIdeas);
    persist(logs, nextIdeas, tags);
  };

  const updateTags = (nextTags: string[]) => {
    setTags(nextTags);
    persist(logs, ideas, nextTags);
  };

  const filteredLogs = logs.filter((log) => {
    const text = [log.body, log.insight, log.growthReason, log.ownMemo, log.whyThought, ...log.tags]
      .join(' ')
      .toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'すべて' || log.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totals = logs.reduce(
    (acc, log) => ({
      views: acc.views + log.views,
      likes: acc.likes + log.likes,
      reposts: acc.reposts + log.reposts,
      saves: acc.saves + log.saves,
      followerDelta: acc.followerDelta + log.followerDelta,
    }),
    { views: 0, likes: 0, reposts: 0, saves: 0, followerDelta: 0 },
  );

  const toggleLogTag = (tag: string) => {
    setLogForm((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }));
  };

  const toggleIdeaTag = (tag: string) => {
    setIdeaForm((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }));
  };

  const addTag = () => {
    const normalized = newTag.trim();
    if (!normalized || tags.includes(normalized)) {
      setNewTag('');
      return;
    }
    updateTags([...tags, normalized]);
    setNewTag('');
  };

  const submitLog = (event: FormEvent) => {
    event.preventDefault();
    if (!logForm.body.trim()) return;

    if (editingId) {
      const nextLogs = logs.map((log) =>
        log.id === editingId ? { ...logForm, id: editingId, updatedAt: new Date().toISOString() } : log,
      );
      updateLogs(nextLogs);
      setEditingId(null);
    } else {
      const nextLogs = [
        { ...logForm, id: crypto.randomUUID(), updatedAt: new Date().toISOString() },
        ...logs,
      ];
      updateLogs(nextLogs);
    }
    setLogForm(emptyLogForm());
  };

  const editLog = (log: ThreadLog) => {
    const { id: _id, updatedAt: _updatedAt, ...form } = log;
    setLogForm(form);
    setEditingId(log.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteLog = (id: string) => {
    updateLogs(logs.filter((log) => log.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setLogForm(emptyLogForm());
    }
  };

  const submitIdea = (event: FormEvent) => {
    event.preventDefault();
    if (!ideaForm.title.trim()) return;
    updateIdeas([{ ...ideaForm, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...ideas]);
    setIdeaForm(emptyIdeaForm());
  };

  const deleteIdea = (id: string) => {
    updateIdeas(ideas.filter((idea) => idea.id !== id));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Threads Research Board</p>
          <h1>Threads Labo</h1>
        </div>
        <div className="top-actions">
          <span>{logs.length}件</span>
        </div>
      </header>

      <section className="summary-grid" aria-label="集計">
        <div>
          <span>閲覧数</span>
          <strong>{totals.views.toLocaleString()}</strong>
        </div>
        <div>
          <span>いいね</span>
          <strong>{totals.likes.toLocaleString()}</strong>
        </div>
        <div>
          <span>保存</span>
          <strong>{totals.saves.toLocaleString()}</strong>
        </div>
        <div>
          <span>フォロワー増減</span>
          <strong>{totals.followerDelta > 0 ? `+${totals.followerDelta}` : totals.followerDelta}</strong>
        </div>
      </section>

      <section className="workspace">
        <form className="panel editor-panel" onSubmit={submitLog}>
          <div className="section-title">
            <NotebookPen size={20} />
            <h2>{editingId ? '投稿を編集' : '投稿を追加'}</h2>
          </div>

          <div className="form-grid two">
            <label className="field">
              <span>公開日</span>
              <input
                type="date"
                value={logForm.publishedAt}
                onChange={(event) => setLogForm({ ...logForm, publishedAt: event.target.value })}
              />
            </label>
            <label className="field">
              <span>ステータス</span>
              <select
                value={logForm.status}
                onChange={(event) => setLogForm({ ...logForm, status: event.target.value as Status })}
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>投稿本文</span>
            <textarea
              rows={5}
              value={logForm.body}
              onChange={(event) => setLogForm({ ...logForm, body: event.target.value })}
              placeholder="Threadsに投稿した本文、または候補文"
            />
          </label>

          <div className="form-grid metrics">
            <NumberField label="閲覧数" value={logForm.views} onChange={(views) => setLogForm({ ...logForm, views })} />
            <NumberField label="いいね" value={logForm.likes} onChange={(likes) => setLogForm({ ...logForm, likes })} />
            <NumberField label="リポスト" value={logForm.reposts} onChange={(reposts) => setLogForm({ ...logForm, reposts })} />
            <NumberField label="フォロワー増減" value={logForm.followerDelta} onChange={(followerDelta) => setLogForm({ ...logForm, followerDelta })} />
            <NumberField label="保存" value={logForm.saves} onChange={(saves) => setLogForm({ ...logForm, saves })} />
          </div>

          <div className="form-grid two">
            <label className="field">
              <span>気づき</span>
              <textarea
                rows={3}
                value={logForm.insight}
                onChange={(event) => setLogForm({ ...logForm, insight: event.target.value })}
              />
            </label>
            <label className="field">
              <span>なぜ伸びた？</span>
              <textarea
                rows={3}
                value={logForm.growthReason}
                onChange={(event) => setLogForm({ ...logForm, growthReason: event.target.value })}
              />
            </label>
          </div>

          <div className="check-group">
            <TogglePill active={logForm.noteCandidate} label="note化候補" onClick={() => setLogForm({ ...logForm, noteCandidate: !logForm.noteCandidate })} />
            <TogglePill active={logForm.aiLabCandidate} label="AI実験室候補" onClick={() => setLogForm({ ...logForm, aiLabCandidate: !logForm.aiLabCandidate })} />
            <TogglePill active={logForm.recoveryCandidate} label="回復期候補" onClick={() => setLogForm({ ...logForm, recoveryCandidate: !logForm.recoveryCandidate })} />
          </div>

          <div className="field">
            <span>タグ</span>
            <TagPicker selected={logForm.tags} tags={tags} onToggle={toggleLogTag} />
            <div className="add-row">
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                placeholder="タグ追加"
              />
              <button className="icon-button" type="button" onClick={addTag} aria-label="タグを追加">
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="memo-box">
            <div className="section-title small">
              <Lightbulb size={18} />
              <h3>自分メモ</h3>
            </div>
            <label className="field">
              <span>自分メモ</span>
              <textarea rows={3} value={logForm.ownMemo} onChange={(event) => setLogForm({ ...logForm, ownMemo: event.target.value })} />
            </label>
            <label className="field">
              <span>なぜ伸びたと思う？</span>
              <textarea rows={3} value={logForm.whyThought} onChange={(event) => setLogForm({ ...logForm, whyThought: event.target.value })} />
            </label>
            <div className="check-group">
              <TogglePill active={logForm.makeNote} label="note化する？" onClick={() => setLogForm({ ...logForm, makeNote: !logForm.makeNote })} />
              <TogglePill active={logForm.makeSeries} label="シリーズ化する？" onClick={() => setLogForm({ ...logForm, makeSeries: !logForm.makeSeries })} />
            </div>
          </div>

          <div className="form-actions">
            {editingId && (
              <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setLogForm(emptyLogForm()); }}>
                <RotateCcw size={18} />
                取り消し
              </button>
            )}
            <button className="primary-button" type="submit">
              {editingId ? <Save size={18} /> : <CirclePlus size={18} />}
              {editingId ? '保存する' : '追加する'}
            </button>
          </div>
        </form>

        <aside className="panel idea-panel">
          <div className="section-title">
            <Sparkles size={20} />
            <h2>アイデア保管</h2>
          </div>
          <form onSubmit={submitIdea} className="idea-form">
            <label className="field">
              <span>分類</span>
              <select value={ideaForm.kind} onChange={(event) => setIdeaForm({ ...ideaForm, kind: event.target.value as IdeaKind })}>
                {ideaKinds.map((kind) => (
                  <option key={kind}>{kind}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>アイデア</span>
              <input value={ideaForm.title} onChange={(event) => setIdeaForm({ ...ideaForm, title: event.target.value })} placeholder="保管したいネタ" />
            </label>
            <label className="field">
              <span>メモ</span>
              <textarea rows={3} value={ideaForm.memo} onChange={(event) => setIdeaForm({ ...ideaForm, memo: event.target.value })} />
            </label>
            <TagPicker selected={ideaForm.tags} tags={tags} onToggle={toggleIdeaTag} />
            <button className="primary-button full" type="submit">
              <Plus size={18} />
              保管する
            </button>
          </form>

          <div className="idea-list">
            {ideas.length === 0 && <p className="empty">まだアイデアはありません。</p>}
            {ideas.map((idea) => (
              <article className="idea-card" key={idea.id}>
                <div className="idea-head">
                  <span>{idea.kind}</span>
                  <button className="ghost-button" type="button" onClick={() => deleteIdea(idea.id)} aria-label="アイデアを削除">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3>{idea.title}</h3>
                {idea.memo && <p>{idea.memo}</p>}
                <div className="mini-tags">
                  {idea.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="log-section">
        <div className="list-tools">
          <div className="searchbox">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="本文・タグ・気づきで検索" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Status | 'すべて')}>
            <option>すべて</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="log-list">
          {filteredLogs.length === 0 && <p className="empty">表示できる投稿がありません。</p>}
          {filteredLogs.map((log) => (
            <article className="log-card" key={log.id}>
              <div className="log-card-head">
                <div>
                  <span className={`status-badge ${statusMeta[log.status].className}`}>{statusMeta[log.status].label}</span>
                  <time>{log.publishedAt}</time>
                </div>
                <div className="card-actions">
                  <button className="icon-button" type="button" onClick={() => editLog(log)} aria-label="投稿を編集">
                    <Edit3 size={17} />
                  </button>
                  <button className="icon-button danger" type="button" onClick={() => deleteLog(log.id)} aria-label="投稿を削除">
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <p className="post-body">{log.body}</p>
              <div className="mini-tags">
                {log.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="metric-row">
                <span>閲覧 {log.views.toLocaleString()}</span>
                <span>いいね {log.likes.toLocaleString()}</span>
                <span>リポスト {log.reposts.toLocaleString()}</span>
                <span>保存 {log.saves.toLocaleString()}</span>
                <span>フォロワー {log.followerDelta > 0 ? `+${log.followerDelta}` : log.followerDelta}</span>
              </div>
              <div className="notes-grid">
                {log.insight && (
                  <div>
                    <strong>気づき</strong>
                    <p>{log.insight}</p>
                  </div>
                )}
                {log.growthReason && (
                  <div>
                    <strong>なぜ伸びた？</strong>
                    <p>{log.growthReason}</p>
                  </div>
                )}
                {log.ownMemo && (
                  <div>
                    <strong>自分メモ</strong>
                    <p>{log.ownMemo}</p>
                  </div>
                )}
                {log.whyThought && (
                  <div>
                    <strong>仮説</strong>
                    <p>{log.whyThought}</p>
                  </div>
                )}
              </div>
              <div className="candidate-row">
                {log.noteCandidate && <span><BookOpen size={14} />note候補</span>}
                {log.aiLabCandidate && <span><FlaskConical size={14} />AI実験室</span>}
                {log.recoveryCandidate && <span>回復期</span>}
                {log.makeNote && <span>note化する</span>}
                {log.makeSeries && <span>シリーズ化</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
