CREATE TABLE IF NOT EXISTS arithmetic_documents(class_id TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(class_id,kind,id));
CREATE TABLE IF NOT EXISTS arithmetic_runs(class_id TEXT NOT NULL,id TEXT NOT NULL,seat TEXT NOT NULL,kind TEXT NOT NULL,task_id TEXT,status TEXT NOT NULL,start_request_id TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(class_id,id),UNIQUE(class_id,seat,start_request_id));
CREATE UNIQUE INDEX IF NOT EXISTS arithmetic_exam_once ON arithmetic_runs(class_id,seat,task_id) WHERE kind='exam';
CREATE INDEX IF NOT EXISTS arithmetic_history ON arithmetic_runs(class_id,seat,updated_at DESC);
CREATE TABLE IF NOT EXISTS arithmetic_mutation_guard(value INTEGER CHECK(value=1));
