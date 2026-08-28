BEGIN;

CREATE TABLE sec_m09_crash_probe (
  id integer PRIMARY KEY
);

INSERT INTO sec_m09_crash_probe (id) VALUES (1);

SELECT pg_terminate_backend(pg_backend_pid());

COMMIT;
