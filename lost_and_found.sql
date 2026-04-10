-- ============================================================
-- Lost & Found Network for Campus
-- MySQL DDL Schema — FINAL
-- Group 84 | COMP 2154 | George Brown Polytechnic
-- ============================================================
-- ============================================================
CREATE DATABASE IF NOT EXISTS lost_found_db;
USE lost_found_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS item_status_history;
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS potential_matches;
DROP TABLE IF EXISTS claim_images;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- 1. users
-- --------------------------------------------------------
CREATE TABLE users (
    id                  INT             NOT NULL AUTO_INCREMENT,
    email               VARCHAR(255)    NOT NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    first_name          VARCHAR(100)    NOT NULL,
    last_name           VARCHAR(100)    NOT NULL,
    role                ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    is_verified_member  BOOLEAN         NOT NULL DEFAULT FALSE,  -- TRUE = GBC institutional email confirmed
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
);

-- --------------------------------------------------------
-- 2. categories
-- --------------------------------------------------------
CREATE TABLE categories (
    id          INT             NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)    NOT NULL,
    description TEXT,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_name (name)
);

-- --------------------------------------------------------
-- 3. locations
-- --------------------------------------------------------
CREATE TABLE locations (
    id              INT             NOT NULL AUTO_INCREMENT,
    campus          ENUM(
                        'St. James',
                        'Casa Loma',
                        'Waterfront',
                        'Online'
                    )               NOT NULL,
    building_name   VARCHAR(150)    NOT NULL,
    room_number     VARCHAR(50)     NULL,
    display_name    VARCHAR(200)    NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id),
    UNIQUE KEY uq_location (campus, building_name, room_number)  -- FIX-4
);

-- --------------------------------------------------------
-- 4. items
-- --------------------------------------------------------
CREATE TABLE items (
    id                  INT             NOT NULL AUTO_INCREMENT,
    user_id             INT             NOT NULL,
    category_id         INT             NOT NULL,
    location_id         INT             NOT NULL,
    type                ENUM('lost', 'found')               NOT NULL,
    title               VARCHAR(200)                        NOT NULL,
    description         TEXT                                NOT NULL,
    location_details    VARCHAR(500)                        NULL,       -- Free-text additional context
    date                DATE                                NOT NULL,   -- Date lost or found
    status              ENUM(
                            'active',
                            'claimed',
                            'expired',
                            'archived'
                        )                                   NOT NULL DEFAULT 'active',
    is_deleted          BOOLEAN                             NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                     ON UPDATE CURRENT_TIMESTAMP, -- FIX-3

    PRIMARY KEY (id),
    CONSTRAINT fk_items_user        FOREIGN KEY (user_id)       REFERENCES users(id)        ON DELETE RESTRICT,
    CONSTRAINT fk_items_category    FOREIGN KEY (category_id)   REFERENCES categories(id)   ON DELETE RESTRICT,
    CONSTRAINT fk_items_location    FOREIGN KEY (location_id)   REFERENCES locations(id)    ON DELETE RESTRICT,

    --
    INDEX idx_items_browse      (status, type, category_id, location_id, created_at),
    -- Keep date standalone for date-range-only queries
    INDEX idx_items_date        (date),
    -- Keep user_id standalone for "my items" dashboard queries
    INDEX idx_items_user_id     (user_id)
);

-- --------------------------------------------------------
-- 5. images
-- --------------------------------------------------------
CREATE TABLE images (
    id          INT             NOT NULL AUTO_INCREMENT,
    item_id     INT             NOT NULL,
    image_url   VARCHAR(500)    NOT NULL,
    uploaded_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_images_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,

    INDEX idx_images_item_id (item_id)
);

-- --------------------------------------------------------
-- 6. claims
-- --------------------------------------------------------
CREATE TABLE claims (
    id                   INT             NOT NULL AUTO_INCREMENT,
    item_id              INT             NOT NULL,
    claimant_id          INT             NOT NULL,
    verification_details TEXT            NOT NULL,
    status               ENUM(
                             'pending',
                             'approved',
                             'rejected',
                             'escalated'
                         )               NOT NULL DEFAULT 'pending',
    reporter_feedback    TEXT            NULL,
    escalation_reason    TEXT            NULL,
    contact_shared_at    TIMESTAMP       NULL DEFAULT NULL,
    created_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                  ON UPDATE CURRENT_TIMESTAMP, 
    reviewed_at          TIMESTAMP       NULL DEFAULT NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_claims_item       FOREIGN KEY (item_id)       REFERENCES items(id)  ON DELETE CASCADE,
    CONSTRAINT fk_claims_claimant   FOREIGN KEY (claimant_id)   REFERENCES users(id)  ON DELETE RESTRICT,

    INDEX idx_claims_admin      (item_id, status),
    -- Keep claimant_id standalone for "my claims" dashboard queries
    INDEX idx_claims_claimant   (claimant_id)
);

-- --------------------------------------------------------
-- 7. claim_images
-- Claimants can attach proof-of-ownership images.
-- --------------------------------------------------------
CREATE TABLE claim_images (
    id          INT             NOT NULL AUTO_INCREMENT,
    claim_id    INT             NOT NULL,
    image_url   VARCHAR(500)    NOT NULL,
    uploaded_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_claim_images_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,

    INDEX idx_claim_images_claim_id (claim_id)
);

-- --------------------------------------------------------
-- 8. potential_matches
-- --------------------------------------------------------
CREATE TABLE potential_matches (
    id                  INT             NOT NULL AUTO_INCREMENT,
    lost_item_id        INT             NOT NULL,
    found_item_id       INT             NOT NULL,
    match_criteria      JSON            NULL
                        COMMENT '{"category_match": boolean, "location_match": boolean, "date_proximity_days": int, "score": float}',
    notified_lost_user  BOOLEAN         NOT NULL DEFAULT FALSE,
    notified_found_user BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at         TIMESTAMP       NULL DEFAULT NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_pm_lost_item  FOREIGN KEY (lost_item_id)  REFERENCES items(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_found_item FOREIGN KEY (found_item_id) REFERENCES items(id) ON DELETE CASCADE,

    UNIQUE KEY uq_match_pair    (lost_item_id, found_item_id),
    INDEX idx_pm_lost_item_id   (lost_item_id),
    INDEX idx_pm_found_item_id  (found_item_id)
);

-- --------------------------------------------------------
-- 9. email_logs
-- Audit trail for all outbound notifications.
-- reference_id = item_id or claim_id depending on email_type.
-- --------------------------------------------------------
CREATE TABLE email_logs (
    id              INT             NOT NULL AUTO_INCREMENT,
    user_id         INT             NOT NULL,
    email_type      ENUM(
                        'match_detected',
                        'claim_submitted',
                        'claim_approved',
                        'claim_rejected',
                        'dispute_escalated'
                    )               NOT NULL,
    reference_id    INT             NOT NULL,
    sent_to         VARCHAR(255)    NOT NULL,
    sent_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status          ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'pending',

    PRIMARY KEY (id),
    CONSTRAINT fk_email_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,

    INDEX idx_email_logs_user_id    (user_id),
    INDEX idx_email_logs_type       (email_type),
    INDEX idx_email_logs_reference  (reference_id)
);

-- --------------------------------------------------------
-- 10. item_status_history
-- FIX-5: changed_by is now nullable to support system-initiated transitions
--        (e.g. auto-expiry cron job has no human user_id to reference)
--        NULL changed_by = system action; non-NULL = admin action
-- --------------------------------------------------------
CREATE TABLE item_status_history (
    id          INT             NOT NULL AUTO_INCREMENT,
    item_id     INT             NOT NULL,
    old_status  ENUM('active', 'claimed', 'expired', 'archived') NOT NULL,
    new_status  ENUM('active', 'claimed', 'expired', 'archived') NOT NULL,
    changed_by  INT             NULL,      
    reason      VARCHAR(500)    NULL,
    changed_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_ish_item          FOREIGN KEY (item_id)    REFERENCES items(id)  ON DELETE CASCADE,
    CONSTRAINT fk_ish_changed_by    FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE RESTRICT,

    INDEX idx_ish_item_id    (item_id),
    INDEX idx_ish_changed_by (changed_by)
);

-- ============================================================
-- Seed Data: System User
--        history rows. Used when changed_by cannot be a human.
-- ============================================================
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified_member) VALUES
    (1, 'system@lostfound.local', '[SYSTEM_ACCOUNT_NOT_FOR_LOGIN]', 'System', 'Account', 'admin', FALSE);

-- ============================================================
-- Seed Data: Admin User
--        Default admin account for the application.
--        password: 1234
-- ============================================================
INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified_member) VALUES
    ('admin@georgebrown.ca', '$2b$10$Khirp1iJY947OEOVbBjC8OmVqXL4rPOOHzsBIFr/3QgEC6k3Rciq2', 'Admin', 'Admin', 'admin', TRUE);

-- ============================================================
-- Seed Data: Categories
-- ============================================================
INSERT INTO categories (name, description) VALUES
    ('Electronics',     'Phones, laptops, tablets, headphones, chargers'),
    ('Clothing',        'Jackets, hats, scarves, gloves, bags'),
    ('Accessories',     'Wallets, keys, jewelry, glasses, watches'),
    ('Books & Notes',   'Textbooks, notebooks, printed notes, binders'),
    ('ID & Cards',      'Student ID, transit cards, bank cards, library cards'),
    ('Sports & Gym',    'Water bottles, gym equipment, sports gear'),
    ('Other',           'Items that do not fit other categories');

-- ============================================================
-- Seed Data: Locations (George Brown Campuses)
-- ============================================================
INSERT INTO locations (campus, building_name, room_number, display_name) VALUES
    ('St. James',   'Building A',   NULL,   'St. James – Building A (Main)'),
    ('St. James',   'Building B',   NULL,   'St. James – Building B'),
    ('St. James',   'Library',      NULL,   'St. James – Library'),
    ('Casa Loma',   'Building C',   NULL,   'Casa Loma – Building C'),
    ('Casa Loma',   'Building H',   NULL,   'Casa Loma – Building H (Gym)'),
    ('Waterfront',  'Building W',   NULL,   'Waterfront – Building W');

-- ============================================================
-- Verification Queries
-- Run these after executing to confirm everything created correctly
-- ============================================================
-- SHOW TABLES;
-- SHOW CREATE TABLE items\G
-- SHOW CREATE TABLE claims\G
-- SHOW CREATE TABLE item_status_history\G
-- SELECT * FROM users WHERE id = 1;
-- SELECT * FROM categories;
-- SELECT * FROM locations;