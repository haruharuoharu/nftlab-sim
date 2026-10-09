CREATE TABLE IF NOT EXISTS learning_progress (
 session_id uuid NOT NULL,
 namespace varchar(100) NOT NULL,
 progress jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(session_id, namespace)
);
