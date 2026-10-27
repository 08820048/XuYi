-- 012: 译文 AI 翻译状态与来源指纹
-- source_hash：翻译时中文标题+正文的指纹，中文改动后据此判定译文「已过期」
-- ai_state：NULL 表示无进行中任务；translating = 翻译中；failed = 失败（原因见 ai_error）
ALTER TABLE post_translations ADD COLUMN source_hash TEXT;
ALTER TABLE post_translations ADD COLUMN ai_state TEXT CHECK(ai_state IN ('translating', 'failed'));
ALTER TABLE post_translations ADD COLUMN ai_error TEXT;
