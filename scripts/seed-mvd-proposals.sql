-- Seed MVD Proposals — Full Decision Flow
-- Run: cd /opt/radix-guild/bot && sqlite3 guild.db < /path/to/seed-mvd-proposals.sql

-- Ensure user exists
INSERT OR IGNORE INTO users (tg_id, radix_address, username)
VALUES (1, 'account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq', 'bigdevxrd');

-- ═══════════════════════════════════════════════════════
-- STEP 1: FOUNDATION (6 proposals — no dependencies)
-- These set the rules. Everything else depends on them.
-- ═══════════════════════════════════════════════════════

INSERT INTO proposals (title, type, options, creator_tg_id, status, ends_at, min_votes, stage, category, charter_param)
VALUES
-- F1: Charter adoption
('Should the Guild adopt the Radix DAO Charter as its founding governance document?',
 'yesno', NULL, 1, 'active', strftime('%s','now') + 259200, 3, 'formal_vote', 'foundation', 'charter.adoption'),

-- F2: RAC seats
('How many seats should the Radix Accountability Council (RAC) have?',
 'poll', '["3 seats","5 seats","7 seats","9 seats"]', 1, 'active', strftime('%s','now') + 259200, 3, 'formal_vote', 'foundation', 'rac.seats'),

-- F3: Standard quorum
('What should be the minimum number of votes for a standard proposal to be valid?',
 'poll', '["3 votes","10 votes","25 votes","50 votes"]', 1, 'active', strftime('%s','now') + 259200, 3, 'formal_vote', 'foundation', 'voting.quorum.standard'),

-- F4: Default voting period
('What should be the default voting period for standard proposals?',
 'poll', '["48 hours","72 hours","7 days","14 days"]', 1, 'active', strftime('%s','now') + 259200, 3, 'formal_vote', 'foundation', 'voting.period.standard'),

-- F5: Approval threshold
('What approval percentage should be required for standard proposals to pass?',
 'poll', '["Simple majority (>50%)","Supermajority (>60%)","Two-thirds (>66%)"]', 1, 'active', strftime('%s','now') + 259200, 3, 'formal_vote', 'foundation', 'voting.approval.standard'),

-- F6: Amendment threshold
('What approval percentage should be required to amend the Charter?',
 'poll', '["Supermajority (>60%)","Two-thirds (>66%)","Three-quarters (>75%)"]', 1, 'active', strftime('%s','now') + 259200, 3, 'formal_vote', 'foundation', 'voting.approval.amendment');

-- ═══════════════════════════════════════════════════════
-- STEP 2: CONFIGURATION (14 proposals — depend on Step 1)
-- These unlock AFTER foundation votes resolve.
-- Status: pending (bot shows them but they can't be voted on yet)
-- ═══════════════════════════════════════════════════════

INSERT INTO proposals (title, type, options, creator_tg_id, status, ends_at, min_votes, stage, category, charter_param)
VALUES
-- Depends on rac.seats
('What multi-signature threshold should the RAC use? (e.g. 3-of-5)',
 'poll', '["Simple majority","Two-thirds","All members"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'rac.multisig'),

('How often should the RAC meet?',
 'poll', '["Weekly","Every two weeks","Monthly"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'rac.meetings'),

('After how many missed meetings should a RAC member face review?',
 'poll', '["2 consecutive","3 consecutive","5 consecutive"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'rac.inactivity'),

-- Depends on voting.period.standard
('How long should Charter amendment votes last?',
 'poll', '["7 days","14 days","21 days"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'voting.period.amendment'),

('How long should emergency votes last?',
 'poll', '["24 hours","48 hours","72 hours"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'voting.period.emergency'),

('What is the minimum forum discussion period before a vote can start?',
 'poll', '["24 hours","48 hours","72 hours","7 days"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'timing.forum_min'),

('How long should the execution delay be after a proposal passes?',
 'poll', '["24 hours","48 hours","72 hours"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'timing.execution_delay'),

('How long before a failed proposal can be resubmitted?',
 'poll', '["7 days","14 days","30 days"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'timing.cooldown'),

-- Depends on voting.approval.standard
('What should be the maximum single grant amount before requiring supermajority?',
 'poll', '["5,000 XRD","10,000 XRD","25,000 XRD","50,000 XRD"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'treasury.grant_limit'),

('What should be the maximum single bounty payout?',
 'poll', '["1,000 XRD","5,000 XRD","10,000 XRD"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'treasury.bounty_limit'),

('What should be the monthly operational spending limit?',
 'poll', '["5,000 XRD","10,000 XRD","25,000 XRD"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'treasury.ops_limit'),

('Should proposals require a stake/deposit to submit? How much?',
 'poll', '["No stake required","100 XRD","500 XRD","1,000 XRD"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'proposals.stake'),

('Should XP/reputation decay over time if members are inactive?',
 'poll', '["No decay","5% per month","10% per month"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'reputation.decay'),

('What should be the default suspension duration for violations?',
 'poll', '["30 days","60 days","90 days"]', 1, 'pending', strftime('%s','now') + 604800, 3, 'pending', 'configuration', 'enforcement.suspension');

-- ═══════════════════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════════════════

SELECT '=== SEEDED ===' as info;
SELECT status, COUNT(*) as count FROM proposals GROUP BY status;
SELECT id, status, type, charter_param, substr(title, 1, 60) as title FROM proposals ORDER BY id;
