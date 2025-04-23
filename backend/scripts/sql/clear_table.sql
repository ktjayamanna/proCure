-- clear_table.sql
-- Script to clear (delete all rows from) a specified table
-- Usage:
--   psql -h <host> -p <port> -d <database> -U <user> -v table=table_name -f clear_table.sql
--
-- The table name must be provided as an argument. If not specified, defaults to 'user_activities'

-- Check if table parameter is provided, otherwise use default
DO $$
DECLARE
    table_param text;
BEGIN
    -- Get the table parameter value
    BEGIN
        table_param := current_setting('table');
    EXCEPTION WHEN OTHERS THEN
        table_param := 'user_activities';
    END;

    -- Store the table name in a GUC (Grand Unified Configuration) variable
    PERFORM set_config('table_to_clear.name', table_param, false);
END $$;

-- Get the table name from the GUC variable
\gset table_to_clear = `echo "SELECT current_setting('table_to_clear.name')"`

-- Print information about what's being cleared
\echo 'Clearing table: ' :table_to_clear

-- Safety check: Make sure the table exists
DO $$
DECLARE
    table_name text := current_setting('table_to_clear.name');
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = table_name
    ) THEN
        RAISE EXCEPTION 'Table % does not exist', table_name;
    END IF;
END
$$;

-- Count rows before deletion
SELECT format('SELECT COUNT(*) AS rows_before_deletion FROM %I', current_setting('table_to_clear.name'))
\gexec

-- Delete all rows from the table
SELECT format('DELETE FROM %I', current_setting('table_to_clear.name'))
\gexec

-- Count rows after deletion to confirm
SELECT format('SELECT COUNT(*) AS rows_after_deletion FROM %I', current_setting('table_to_clear.name'))
\gexec

-- Print completion message
\echo 'Table ' :table_to_clear ' has been cleared successfully.'
