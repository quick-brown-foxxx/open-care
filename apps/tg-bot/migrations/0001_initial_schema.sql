-- bot-db initial schema
-- Source: docs/specs/03-data-model.md

-- Opaque handles for Telegram users
CREATE TABLE handles (
    opaque_id                 TEXT PRIMARY KEY,
    handle                    TEXT NOT NULL UNIQUE COLLATE NOCASE
                              CHECK (length(handle) BETWEEN 3 AND 32
                                     AND handle GLOB '[A-Za-z0-9_][A-Za-z0-9_][A-Za-z0-9_]*'
                                     AND lower(substr(handle, 1, 7)) <> 'benpub_'),
    telegram_user_ref         TEXT NOT NULL UNIQUE,
    telegram_chat_id_enc      TEXT NOT NULL,
    telegram_chat_key_version INTEGER NOT NULL CHECK (telegram_chat_key_version >= 1),
    first_seen_utc            TEXT NOT NULL,
    last_seen_utc             TEXT NOT NULL,
    is_active                 INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Conversations for card delivery and operator replies
CREATE TABLE conversations (
    id                       INTEGER PRIMARY KEY,
    opaque_id                TEXT NOT NULL REFERENCES handles(opaque_id),
    kind                     TEXT NOT NULL CHECK (kind IN ('card_request', 'operator_reply', 'system')),
    status                   TEXT NOT NULL CHECK (status IN ('pending', 'in_flight', 'delivered', 'failed')),
    public_beneficiary_ref   TEXT CHECK (
                                public_beneficiary_ref IS NULL
                                OR public_beneficiary_ref GLOB 'benpub_[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
                              ),
    delivery_code_hash       TEXT,
    delivery_code_last4      TEXT,
    encrypted_code_ttl_blob  TEXT,
    encrypted_code_expires_at_utc TEXT
                                  CHECK (encrypted_code_expires_at_utc IS NULL
                                         OR encrypted_code_expires_at_utc GLOB '????-??-??T??:??:??Z'),
    created_at_utc           TEXT NOT NULL,
    updated_at_utc           TEXT NOT NULL
);