-- The accounts role and its grants (TASK-061, ADR-0027). Static, idempotent SQL.
--
-- Run as a superuser, after the build role `nameatlas` and the read-only role
-- `nameatlas_web` exist: by `provision.sh` on the VM (TASK-063), and by the
-- integration test (tests/integration/src/accounts.test.ts), which runs this
-- very file so that the grants it checks are the ones that ship. It uses no
-- psql meta-commands or variables for that reason.
--
-- The role gets no password here. The VM sets one from a GitHub secret, the same
-- way it sets the web role's, and PgBouncer's user list gets its SCRAM secret.
--
-- What the grants mean:
--   nameatlas_app  reads and writes the tables of schemas accounts and family
--                  (TASK-068, ADR-0029), and holds no privilege on any table of
--                  public beyond what PUBLIC itself holds (PostGIS's own catalog;
--                  none of the register).
--   nameatlas_web  has no grant on schema accounts or family (it is only ever
--                  granted `public`'s tables).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nameatlas_app') THEN
    CREATE ROLE nameatlas_app LOGIN;
  END IF;
END
$$;

-- Unlike the web role, this one writes. Its own limits keep a runaway query
-- from holding a pooled connection.
ALTER ROLE nameatlas_app SET statement_timeout = '10s';
ALTER ROLE nameatlas_app SET idle_in_transaction_session_timeout = '30s';

-- The migration creates the schema as the build role; creating it here too, owned
-- by the build role, lets this file run before the first migration does.
CREATE SCHEMA IF NOT EXISTS accounts AUTHORIZATION nameatlas;

-- Nothing for anyone who is not named below, and in particular nothing for the
-- read-only role, which has no grant on this schema and must never get one.
REVOKE ALL ON SCHEMA accounts FROM PUBLIC;
GRANT USAGE ON SCHEMA accounts TO nameatlas_app;

-- The role may read and write rows. It may not change the tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA accounts TO nameatlas_app;
-- Tables the build role creates in this schema later (a new migration) are
-- covered without another run of this file.
ALTER DEFAULT PRIVILEGES FOR ROLE nameatlas IN SCHEMA accounts
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nameatlas_app;

-- The family tree (TASK-068, ADR-0029 §2.1): the same role, the same grants, a
-- second schema. Its tables carry row-level security policies (migration 0030),
-- which apply to this role because it does not own the tables.
CREATE SCHEMA IF NOT EXISTS family AUTHORIZATION nameatlas;
REVOKE ALL ON SCHEMA family FROM PUBLIC;
GRANT USAGE ON SCHEMA family TO nameatlas_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA family TO nameatlas_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nameatlas IN SCHEMA family
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nameatlas_app;

-- The role may connect to this database.
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO nameatlas_app', current_database());
END
$$;

-- It is granted no table of `public`. (It can still name the schema, since
-- PostgreSQL lets PUBLIC use `public`, but a query on any of its tables is
-- refused for want of a table privilege: `provision.sh` grants those to the web
-- role only. The integration test asserts the refusal.)
