-- 013: AI 翻译分段结果暂存（分步翻译、断点续传；翻译完成后清理）
-- idx = -1 存放标题/摘要的翻译结果（JSON），idx >= 0 为正文各段译文
CREATE TABLE IF NOT EXISTS post_translation_chunks (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  idx INTEGER NOT NULL,
  source_hash TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (post_id, lang, idx)
);
