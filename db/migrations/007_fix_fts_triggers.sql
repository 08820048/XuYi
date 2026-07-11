DROP TRIGGER IF EXISTS posts_au;
DROP TRIGGER IF EXISTS posts_ad;

CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO posts_fts(rowid, title, content)
  VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
END;

INSERT INTO posts_fts(posts_fts) VALUES ('rebuild');
