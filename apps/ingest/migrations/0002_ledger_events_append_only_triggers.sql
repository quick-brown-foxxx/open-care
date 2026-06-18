-- Enforce the ledger_events append-only invariant at the database layer.

CREATE TRIGGER ledger_events_no_delete
BEFORE DELETE ON ledger_events
BEGIN
    SELECT RAISE(ABORT, 'ledger_events is append-only — DELETE forbidden');
END;

CREATE TRIGGER ledger_events_no_update
BEFORE UPDATE ON ledger_events
BEGIN
    SELECT RAISE(ABORT, 'ledger_events is append-only — UPDATE forbidden');
END;
