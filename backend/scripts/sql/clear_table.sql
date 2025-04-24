-- File: clear_table.sql
-- Usage: psql -v table_to_clear=your_table_name -f clear_table.sql

\echo ⚠️  WARNING: This will delete ALL data from the ':table_to_clear' table!
\echo 🗑️  Clearing table: :table_to_clear

-- 1) Existence check via dynamic DO block
SELECT
  'DO $$ 
     BEGIN
       IF NOT EXISTS (
         SELECT 1
           FROM information_schema.tables
          WHERE table_schema = ''public''
            AND table_name = ''' || :'table_to_clear' || '''
       ) THEN
         RAISE EXCEPTION ''❌ Table "%"" does not exist in schema "public"'', ' 
         || quote_literal(:'table_to_clear') || ';
       END IF;
     END
   $$;'
\gexec

-- 2) Count rows before deletion
SELECT format(
  'SELECT COUNT(*) AS rows_before_deletion FROM %I',
   :'table_to_clear'
)
\gexec

-- 3) Delete all rows
SELECT format(
  'DELETE FROM %I',
   :'table_to_clear'
)
\gexec

-- 4) Count rows after deletion
SELECT format(
  'SELECT COUNT(*) AS rows_after_deletion FROM %I',
   :'table_to_clear'
)
\gexec

\echo ✅ Table :table_to_clear has been cleared successfully.
