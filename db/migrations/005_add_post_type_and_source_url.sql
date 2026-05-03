-- 新增文章类型与原文地址
ALTER TABLE posts ADD COLUMN post_type TEXT NOT NULL DEFAULT 'original' CHECK(post_type IN ('original', 'repost', 'translation'));
ALTER TABLE posts ADD COLUMN source_url TEXT;
