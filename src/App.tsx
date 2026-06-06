import { FormEvent, ReactNode, useMemo, useState } from 'react';
import {
  CirclePlus,
  Edit3,
  FileText,
  Home,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  Users,
} from 'lucide-react';

type Page = 'top' | 'posts' | 'ideas' | 'following' | 'followers';
type PostStatus = '候補' | '予約投稿日時' | '投稿完了';
type RelationshipKind = 'following' | 'followers';

type PostComment = {
  id: string;
  followerName: string;
  content: string;
};

type Post = {
  id: string;
  body: string;
  status: PostStatus;
  scheduledAt: string;
  comments: PostComment[];
  updatedAt: string;
};

type Idea = {
  id: string;
  idea: string;
  memo: string;
  category: string;
  updatedAt: string;
};

type RelationshipEntry = {
  id: string;
  kind: RelationshipKind;
  name: string;
  interestRating: 1 | 2 | 3;
  insight: string;
  funPoint: string;
  idea: string;
  memo: string;
  updatedAt: string;
};

type PostForm = Omit<Post, 'id' | 'updatedAt'>;
type IdeaForm = Omit<Idea, 'id' | 'updatedAt'>;
type RelationshipForm = Omit<RelationshipEntry, 'id' | 'kind' | 'updatedAt'>;

const STORAGE_KEY = 'threads-labo-state-v3';
const RELATIONSHIP_STORAGE_KEY = 'threads-labo-state-v2';

const pageLabels: Record<Page, string> = {
  top: 'TOP',
  posts: '投稿',
  ideas: 'アイデア保管庫',
  following: 'フォロー',
  followers: 'フォロワー',
};

const postStatuses: PostStatus[] = ['候補', '予約投稿日時', '投稿完了'];

const relationshipLabels: Record<RelationshipKind, string> = {
  following: 'フォロー',
  followers: 'フォロワー',
};

const emptyPostForm = (): PostForm => ({
  body: '',
  status: '候補',
  scheduledAt: '',
  comments: [{ id: crypto.randomUUID(), followerName: '', content: '' }],
});

const emptyIdeaForm = (): IdeaForm => ({
  idea: '',
  memo: '',
  category: '',
});

const emptyRelationshipForm = (): RelationshipForm => ({
  name: '',
  interestRating: 1,
  insight: '',
  funPoint: '',
  idea: '',
  memo: '',
});

function nowIso() {
  return new Date().toISOString();
}

function sortByUpdatedAt<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function normalizePostComments(comments: PostComment[]) {
  return comments
    .map((comment) => ({
      ...comment,
      followerName: comment.followerName.trim(),
      content: comment.content.trim(),
    }))
    .filter((comment) => comment.followerName || comment.content);
}

function loadState(): { posts: Post[]; ideas: Idea[]; relationships: RelationshipEntry[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        posts?: Post[];
        ideas?: Idea[];
        relationships?: RelationshipEntry[];
      };
      return {
        posts: parsed.posts ?? [],
        ideas: parsed.ideas ?? [],
        relationships: parsed.relationships ?? [],
      };
    }

    const legacyRaw = localStorage.getItem(RELATIONSHIP_STORAGE_KEY);
    if (!legacyRaw) {
      return { posts: [], ideas: [], relationships: [] };
    }

    const legacy = JSON.parse(legacyRaw) as {
      logs?: Array<{ id?: string; body?: string; status?: string; publishedAt?: string; publishedTime?: string; comments?: number; updatedAt?: string }>;
      ideas?: Array<{ id?: string; title?: string; memo?: string; kind?: string; createdAt?: string }>;
      relationships?: RelationshipEntry[];
    };

    const posts = (legacy.logs ?? []).map((log) => ({
      id: log.id ?? crypto.randomUUID(),
      body: log.body ?? '',
      status: log.status === '投稿済み' ? '投稿完了' : '候補',
      scheduledAt: log.publishedAt ? `${log.publishedAt}${log.publishedTime ? `T${log.publishedTime}` : ''}` : '',
      comments: log.comments ? [{ id: crypto.randomUUID(), followerName: '', content: `${log.comments}件` }] : [],
      updatedAt: log.updatedAt ?? nowIso(),
    })) satisfies Post[];

    const ideas = (legacy.ideas ?? []).map((idea) => ({
      id: idea.id ?? crypto.randomUUID(),
      idea: idea.title ?? '',
      memo: idea.memo ?? '',
      category: idea.kind ?? '',
      updatedAt: idea.createdAt ?? nowIso(),
    })) satisfies Idea[];

    return {
      posts,
      ideas,
      relationships: legacy.relationships ?? [],
    };
  } catch {
    return { posts: [], ideas: [], relationships: [] };
  }
}

function saveState(posts: Post[], ideas: Idea[], relationships: RelationshipEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ posts, ideas, relationships }));
}

function RatingInput({
  value,
  onChange,
}: {
  value: 1 | 2 | 3;
  onChange: (value: 1 | 2 | 3) => void;
}) {
  return (
    <div className="rating-input" aria-label="気になる評価">
      {[1, 2, 3].map((rating) => (
        <button
          key={rating}
          type="button"
          className={rating <= value ? 'is-active' : ''}
          onClick={() => onChange(rating as 1 | 2 | 3)}
          aria-label={`${rating}つ星`}
        >
          <Star size={20} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}

function RatingStars({ value }: { value: 1 | 2 | 3 }) {
  return (
    <span className="rating-stars" aria-label={`気になる評価 ${value}`}>
      {[1, 2, 3].map((rating) => (
        <Star key={rating} size={16} fill={rating <= value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function PageIcon({ page }: { page: Page }) {
  if (page === 'top') return <Home size={17} />;
  if (page === 'posts') return <FileText size={17} />;
  if (page === 'ideas') return <Lightbulb size={17} />;
  return <Users size={17} />;
}

export function App() {
  const initial = useMemo(() => loadState(), []);
  const [page, setPage] = useState<Page>('top');
  const [posts, setPosts] = useState<Post[]>(initial.posts);
  const [ideas, setIdeas] = useState<Idea[]>(initial.ideas);
  const [relationships, setRelationships] = useState<RelationshipEntry[]>(initial.relationships);
  const [postForm, setPostForm] = useState<PostForm>(emptyPostForm);
  const [ideaForm, setIdeaForm] = useState<IdeaForm>(emptyIdeaForm);
  const [relationshipForm, setRelationshipForm] = useState<RelationshipForm>(emptyRelationshipForm);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [postQuery, setPostQuery] = useState('');
  const [ideaQuery, setIdeaQuery] = useState('');
  const [relationshipQuery, setRelationshipQuery] = useState('');

  const currentKind: RelationshipKind = page === 'followers' ? 'followers' : 'following';
  const sortedPosts = sortByUpdatedAt(posts);
  const sortedIdeas = sortByUpdatedAt(ideas);
  const sortedRelationships = sortByUpdatedAt(relationships);

  const updateAll = (nextPosts = posts, nextIdeas = ideas, nextRelationships = relationships) => {
    setPosts(nextPosts);
    setIdeas(nextIdeas);
    setRelationships(nextRelationships);
    saveState(nextPosts, nextIdeas, nextRelationships);
  };

  const switchPage = (nextPage: Page) => {
    setPage(nextPage);
    setEditingPostId(null);
    setEditingIdeaId(null);
    setEditingRelationshipId(null);
    setPostForm(emptyPostForm());
    setIdeaForm(emptyIdeaForm());
    setRelationshipForm(emptyRelationshipForm());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredPosts = sortedPosts.filter((post) => {
    const text = [
      post.body,
      post.status,
      post.scheduledAt,
      ...post.comments.flatMap((comment) => [comment.followerName, comment.content]),
    ].join(' ');
    return text.toLowerCase().includes(postQuery.toLowerCase());
  });

  const filteredIdeas = sortedIdeas.filter((idea) => {
    const text = [idea.idea, idea.memo, idea.category].join(' ');
    return text.toLowerCase().includes(ideaQuery.toLowerCase());
  });

  const filteredRelationships = sortedRelationships.filter((entry) => {
    const text = [entry.name, entry.insight, entry.funPoint, entry.idea, entry.memo].join(' ');
    return entry.kind === currentKind && text.toLowerCase().includes(relationshipQuery.toLowerCase());
  });

  const counts = {
    posts: posts.length,
    ideas: ideas.length,
    following: relationships.filter((entry) => entry.kind === 'following').length,
    followers: relationships.filter((entry) => entry.kind === 'followers').length,
  };

  const submitPost = (event: FormEvent) => {
    event.preventDefault();
    if (!postForm.body.trim()) return;

    const cleanForm = {
      ...postForm,
      body: postForm.body.trim(),
      comments: normalizePostComments(postForm.comments),
    };

    if (editingPostId) {
      const nextPosts = posts.map((post) =>
        post.id === editingPostId ? { ...cleanForm, id: editingPostId, updatedAt: nowIso() } : post,
      );
      updateAll(nextPosts, ideas, relationships);
      setEditingPostId(null);
    } else {
      updateAll([{ ...cleanForm, id: crypto.randomUUID(), updatedAt: nowIso() }, ...posts], ideas, relationships);
    }
    setPostForm(emptyPostForm());
  };

  const editPost = (post: Post) => {
    const { id: _id, updatedAt: _updatedAt, ...form } = post;
    setPostForm({
      ...form,
      comments: form.comments.length ? form.comments : [{ id: crypto.randomUUID(), followerName: '', content: '' }],
    });
    setEditingPostId(post.id);
    setPage('posts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePost = (id: string) => {
    updateAll(posts.filter((post) => post.id !== id), ideas, relationships);
    if (editingPostId === id) {
      setEditingPostId(null);
      setPostForm(emptyPostForm());
    }
  };

  const updatePostComment = (id: string, patch: Partial<PostComment>) => {
    setPostForm((current) => ({
      ...current,
      comments: current.comments.map((comment) => (comment.id === id ? { ...comment, ...patch } : comment)),
    }));
  };

  const addPostComment = () => {
    setPostForm((current) => ({
      ...current,
      comments: [...current.comments, { id: crypto.randomUUID(), followerName: '', content: '' }],
    }));
  };

  const removePostComment = (id: string) => {
    setPostForm((current) => ({
      ...current,
      comments: current.comments.length === 1
        ? [{ id: crypto.randomUUID(), followerName: '', content: '' }]
        : current.comments.filter((comment) => comment.id !== id),
    }));
  };

  const submitIdea = (event: FormEvent) => {
    event.preventDefault();
    if (!ideaForm.idea.trim()) return;

    const cleanForm = {
      idea: ideaForm.idea.trim(),
      memo: ideaForm.memo.trim(),
      category: ideaForm.category.trim(),
    };

    if (editingIdeaId) {
      const nextIdeas = ideas.map((idea) =>
        idea.id === editingIdeaId ? { ...cleanForm, id: editingIdeaId, updatedAt: nowIso() } : idea,
      );
      updateAll(posts, nextIdeas, relationships);
      setEditingIdeaId(null);
    } else {
      updateAll(posts, [{ ...cleanForm, id: crypto.randomUUID(), updatedAt: nowIso() }, ...ideas], relationships);
    }
    setIdeaForm(emptyIdeaForm());
  };

  const editIdea = (idea: Idea) => {
    const { id: _id, updatedAt: _updatedAt, ...form } = idea;
    setIdeaForm(form);
    setEditingIdeaId(idea.id);
    setPage('ideas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteIdea = (id: string) => {
    updateAll(posts, ideas.filter((idea) => idea.id !== id), relationships);
    if (editingIdeaId === id) {
      setEditingIdeaId(null);
      setIdeaForm(emptyIdeaForm());
    }
  };

  const submitRelationship = (event: FormEvent) => {
    event.preventDefault();
    if (!relationshipForm.name.trim()) return;

    const cleanForm = {
      ...relationshipForm,
      name: relationshipForm.name.trim(),
      insight: relationshipForm.insight.trim(),
      funPoint: relationshipForm.funPoint.trim(),
      idea: relationshipForm.idea.trim(),
      memo: relationshipForm.memo.trim(),
    };

    if (editingRelationshipId) {
      const nextRelationships = relationships.map((entry) =>
        entry.id === editingRelationshipId
          ? { ...cleanForm, id: editingRelationshipId, kind: currentKind, updatedAt: nowIso() }
          : entry,
      );
      updateAll(posts, ideas, nextRelationships);
      setEditingRelationshipId(null);
    } else {
      updateAll(posts, ideas, [
        { ...cleanForm, id: crypto.randomUUID(), kind: currentKind, updatedAt: nowIso() },
        ...relationships,
      ]);
    }
    setRelationshipForm(emptyRelationshipForm());
  };

  const editRelationship = (entry: RelationshipEntry) => {
    const { id: _id, kind: _kind, updatedAt: _updatedAt, ...form } = entry;
    setRelationshipForm(form);
    setEditingRelationshipId(entry.id);
    setPage(entry.kind);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRelationship = (id: string) => {
    updateAll(posts, ideas, relationships.filter((entry) => entry.id !== id));
    if (editingRelationshipId === id) {
      setEditingRelationshipId(null);
      setRelationshipForm(emptyRelationshipForm());
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Threads Research Board</p>
          <h1>Threads Labo</h1>
        </div>
        <div className="top-actions">
          <span>合計 {counts.posts + counts.ideas + counts.following + counts.followers}件</span>
        </div>
      </header>

      <nav className="page-tabs" aria-label="ページ切り替え">
        {(['top', 'posts', 'ideas', 'following', 'followers'] as Page[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={page === tab ? 'is-active' : ''}
            onClick={() => switchPage(tab)}
          >
            <PageIcon page={tab} />
            {pageLabels[tab]}
          </button>
        ))}
      </nav>

      {page === 'top' && (
        <section className="top-page">
          <section className="summary-grid four" aria-label="全体の集計">
            <button type="button" onClick={() => switchPage('posts')}>
              <span>投稿</span>
              <strong>{counts.posts}</strong>
            </button>
            <button type="button" onClick={() => switchPage('ideas')}>
              <span>アイデア</span>
              <strong>{counts.ideas}</strong>
            </button>
            <button type="button" onClick={() => switchPage('following')}>
              <span>フォロー</span>
              <strong>{counts.following}</strong>
            </button>
            <button type="button" onClick={() => switchPage('followers')}>
              <span>フォロワー</span>
              <strong>{counts.followers}</strong>
            </button>
          </section>

          <section className="dashboard-grid">
            <DashboardPanel title="投稿" emptyText="投稿はまだありません。" onOpen={() => switchPage('posts')}>
              {sortedPosts.slice(0, 4).map((post) => (
                <PostCard key={post.id} post={post} onEdit={editPost} onDelete={deletePost} compact />
              ))}
            </DashboardPanel>
            <DashboardPanel title="アイデア保管庫" emptyText="アイデアはまだありません。" onOpen={() => switchPage('ideas')}>
              {sortedIdeas.slice(0, 4).map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onEdit={editIdea} onDelete={deleteIdea} compact />
              ))}
            </DashboardPanel>
            <DashboardPanel title="フォロー" emptyText="フォロー記録はまだありません。" onOpen={() => switchPage('following')}>
              {sortedRelationships.filter((entry) => entry.kind === 'following').slice(0, 4).map((entry) => (
                <RelationshipCard key={entry.id} entry={entry} onEdit={editRelationship} onDelete={deleteRelationship} compact />
              ))}
            </DashboardPanel>
            <DashboardPanel title="フォロワー" emptyText="フォロワー記録はまだありません。" onOpen={() => switchPage('followers')}>
              {sortedRelationships.filter((entry) => entry.kind === 'followers').slice(0, 4).map((entry) => (
                <RelationshipCard key={entry.id} entry={entry} onEdit={editRelationship} onDelete={deleteRelationship} compact />
              ))}
            </DashboardPanel>
          </section>
        </section>
      )}

      {page === 'posts' && (
        <section className="page-stack">
          <form className="panel editor-panel" onSubmit={submitPost}>
            <div className="section-title">
              <FileText size={20} />
              <h2>{editingPostId ? '投稿を編集' : '投稿を追加'}</h2>
            </div>

            <label className="field">
              <span>本文</span>
              <textarea
                rows={6}
                value={postForm.body}
                onChange={(event) => setPostForm({ ...postForm, body: event.target.value })}
                placeholder="投稿本文を入力"
              />
            </label>

            <div className="form-grid two">
              <label className="field">
                <span>ステータス</span>
                <select
                  value={postForm.status}
                  onChange={(event) => setPostForm({ ...postForm, status: event.target.value as PostStatus })}
                >
                  {postStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>予約投稿日時</span>
                <input
                  type="datetime-local"
                  value={postForm.scheduledAt}
                  onChange={(event) => setPostForm({ ...postForm, scheduledAt: event.target.value })}
                />
              </label>
            </div>

            <div className="comment-editor">
              <div className="section-title small">
                <MessageSquare size={18} />
                <h3>コメント欄</h3>
              </div>
              {postForm.comments.map((comment) => (
                <div className="comment-row" key={comment.id}>
                  <label className="field">
                    <span>フォロワー名</span>
                    <input
                      value={comment.followerName}
                      onChange={(event) => updatePostComment(comment.id, { followerName: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>内容</span>
                    <textarea
                      rows={2}
                      value={comment.content}
                      onChange={(event) => updatePostComment(comment.id, { content: event.target.value })}
                    />
                  </label>
                  <button className="icon-button danger" type="button" onClick={() => removePostComment(comment.id)} aria-label="コメントを削除">
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              <button className="secondary-button" type="button" onClick={addPostComment}>
                <CirclePlus size={18} />
                コメントを追加
              </button>
            </div>

            <div className="form-actions">
              {editingPostId && (
                <button className="secondary-button" type="button" onClick={() => { setEditingPostId(null); setPostForm(emptyPostForm()); }}>
                  <RotateCcw size={18} />
                  取り消し
                </button>
              )}
              <button className="primary-button" type="submit">
                {editingPostId ? <Save size={18} /> : <CirclePlus size={18} />}
                {editingPostId ? '保存する' : '追加する'}
              </button>
            </div>
          </form>

          <ListTools value={postQuery} onChange={setPostQuery} placeholder="本文・コメント・フォロワー名で検索" />
          <div className="card-list">
            {filteredPosts.length === 0 && <p className="empty">投稿はまだありません。</p>}
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} onEdit={editPost} onDelete={deletePost} />
            ))}
          </div>
        </section>
      )}

      {page === 'ideas' && (
        <section className="page-stack">
          <form className="panel editor-panel" onSubmit={submitIdea}>
            <div className="section-title">
              <Lightbulb size={20} />
              <h2>{editingIdeaId ? 'アイデアを編集' : 'アイデアを追加'}</h2>
            </div>

            <div className="form-grid two">
              <label className="field">
                <span>アイデア</span>
                <input
                  value={ideaForm.idea}
                  onChange={(event) => setIdeaForm({ ...ideaForm, idea: event.target.value })}
                  placeholder="思いついたアイデア"
                />
              </label>
              <label className="field">
                <span>カテゴリ</span>
                <input
                  value={ideaForm.category}
                  onChange={(event) => setIdeaForm({ ...ideaForm, category: event.target.value })}
                  placeholder="例: 投稿ネタ、企画、note"
                />
              </label>
            </div>

            <label className="field">
              <span>メモ</span>
              <textarea rows={4} value={ideaForm.memo} onChange={(event) => setIdeaForm({ ...ideaForm, memo: event.target.value })} />
            </label>

            <div className="form-actions">
              {editingIdeaId && (
                <button className="secondary-button" type="button" onClick={() => { setEditingIdeaId(null); setIdeaForm(emptyIdeaForm()); }}>
                  <RotateCcw size={18} />
                  取り消し
                </button>
              )}
              <button className="primary-button" type="submit">
                {editingIdeaId ? <Save size={18} /> : <CirclePlus size={18} />}
                {editingIdeaId ? '保存する' : '追加する'}
              </button>
            </div>
          </form>

          <ListTools value={ideaQuery} onChange={setIdeaQuery} placeholder="アイデア・メモ・カテゴリで検索" />
          <div className="card-list">
            {filteredIdeas.length === 0 && <p className="empty">アイデアはまだありません。</p>}
            {filteredIdeas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onEdit={editIdea} onDelete={deleteIdea} />
            ))}
          </div>
        </section>
      )}

      {(page === 'following' || page === 'followers') && (
        <section className="page-stack">
          <form className="panel editor-panel" onSubmit={submitRelationship}>
            <div className="section-title">
              <Users size={20} />
              <h2>{editingRelationshipId ? `${relationshipLabels[currentKind]}を編集` : `${relationshipLabels[currentKind]}を追加`}</h2>
            </div>

            <div className="form-grid two">
              <label className="field">
                <span>名前</span>
                <input
                  value={relationshipForm.name}
                  onChange={(event) => setRelationshipForm({ ...relationshipForm, name: event.target.value })}
                  placeholder="アカウント名・表示名"
                />
              </label>
              <label className="field">
                <span>気になる評価</span>
                <RatingInput
                  value={relationshipForm.interestRating}
                  onChange={(interestRating) => setRelationshipForm({ ...relationshipForm, interestRating })}
                />
              </label>
            </div>

            <div className="form-grid two">
              <label className="field">
                <span>気づき</span>
                <textarea rows={3} value={relationshipForm.insight} onChange={(event) => setRelationshipForm({ ...relationshipForm, insight: event.target.value })} />
              </label>
              <label className="field">
                <span>面白かったポイント</span>
                <textarea rows={3} value={relationshipForm.funPoint} onChange={(event) => setRelationshipForm({ ...relationshipForm, funPoint: event.target.value })} />
              </label>
            </div>

            <div className="form-grid two">
              <label className="field">
                <span>アイデア</span>
                <textarea rows={3} value={relationshipForm.idea} onChange={(event) => setRelationshipForm({ ...relationshipForm, idea: event.target.value })} />
              </label>
              <label className="field">
                <span>メモ</span>
                <textarea rows={3} value={relationshipForm.memo} onChange={(event) => setRelationshipForm({ ...relationshipForm, memo: event.target.value })} />
              </label>
            </div>

            <div className="form-actions">
              {editingRelationshipId && (
                <button className="secondary-button" type="button" onClick={() => { setEditingRelationshipId(null); setRelationshipForm(emptyRelationshipForm()); }}>
                  <RotateCcw size={18} />
                  取り消し
                </button>
              )}
              <button className="primary-button" type="submit">
                {editingRelationshipId ? <Save size={18} /> : <CirclePlus size={18} />}
                {editingRelationshipId ? '保存する' : '追加する'}
              </button>
            </div>
          </form>

          <ListTools value={relationshipQuery} onChange={setRelationshipQuery} placeholder="名前・気づき・メモで検索" />
          <div className="card-list">
            {filteredRelationships.length === 0 && <p className="empty">{relationshipLabels[currentKind]}の記録はまだありません。</p>}
            {filteredRelationships.map((entry) => (
              <RelationshipCard key={entry.id} entry={entry} onEdit={editRelationship} onDelete={deleteRelationship} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function DashboardPanel({
  title,
  emptyText,
  onOpen,
  children,
}: {
  title: string;
  emptyText: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="panel dashboard-panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <button className="ghost-link" type="button" onClick={onOpen}>開く</button>
      </div>
      <div className="compact-list">
        {hasChildren ? children : <p className="empty slim">{emptyText}</p>}
      </div>
    </section>
  );
}

function ListTools({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="list-tools single">
      <div className="searchbox">
        <Search size={18} />
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

function PostCard({
  post,
  onEdit,
  onDelete,
  compact = false,
}: {
  post: Post;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <article className={`record-card ${compact ? 'is-compact' : ''}`}>
      <div className="record-head">
        <div>
          <span className={`status-badge ${post.status === '投稿完了' ? 'status-done' : post.status === '予約投稿日時' ? 'status-scheduled' : 'status-idea'}`}>
            {post.status}
          </span>
          {post.scheduledAt && <time>{post.scheduledAt.replace('T', ' ')}</time>}
        </div>
        <CardActions onEdit={() => onEdit(post)} onDelete={() => onDelete(post.id)} />
      </div>
      <p className="post-body">{post.body}</p>
      {post.comments.length > 0 && (
        <div className="comment-list">
          {post.comments.map((comment) => (
            <div key={comment.id}>
              <strong>{comment.followerName || '名前なし'}</strong>
              <p>{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function IdeaCard({
  idea,
  onEdit,
  onDelete,
  compact = false,
}: {
  idea: Idea;
  onEdit: (idea: Idea) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <article className={`record-card ${compact ? 'is-compact' : ''}`}>
      <div className="record-head">
        <div>
          {idea.category && <span className="status-badge status-idea">{idea.category}</span>}
          <h3>{idea.idea}</h3>
        </div>
        <CardActions onEdit={() => onEdit(idea)} onDelete={() => onDelete(idea.id)} />
      </div>
      {idea.memo && <p className="memo-text">{idea.memo}</p>}
    </article>
  );
}

function RelationshipCard({
  entry,
  onEdit,
  onDelete,
  compact = false,
}: {
  entry: RelationshipEntry;
  onEdit: (entry: RelationshipEntry) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <article className={`record-card ${compact ? 'is-compact' : ''}`}>
      <div className="record-head">
        <div>
          <h3>{entry.name}</h3>
          <RatingStars value={entry.interestRating} />
        </div>
        <CardActions onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)} />
      </div>
      <div className="notes-grid">
        {entry.insight && (
          <div>
            <strong>気づき</strong>
            <p>{entry.insight}</p>
          </div>
        )}
        {entry.funPoint && (
          <div>
            <strong>面白かったポイント</strong>
            <p>{entry.funPoint}</p>
          </div>
        )}
        {entry.idea && (
          <div>
            <strong>アイデア</strong>
            <p>{entry.idea}</p>
          </div>
        )}
        {entry.memo && (
          <div>
            <strong>メモ</strong>
            <p>{entry.memo}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function CardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="card-actions">
      <button className="icon-button" type="button" onClick={onEdit} aria-label="編集">
        <Edit3 size={17} />
      </button>
      <button className="icon-button danger" type="button" onClick={onDelete} aria-label="削除">
        <Trash2 size={17} />
      </button>
    </div>
  );
}
