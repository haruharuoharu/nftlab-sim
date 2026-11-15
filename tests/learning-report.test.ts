import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {actionBit, ALL, reportSql} from '../lib/analytics';
import {aggregateReach, REACH_KEYS, reachCounts, reachRate} from '../lib/learning-report';
import {monthlyCsv} from '../lib/community';

test('reach report aggregates SQL milestones by mode without averaging referral rates or counting attempts', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('../migrations/0001_analytics.sql', import.meta.url), 'utf8'));
    const insert = db.prepare('INSERT INTO analytics_journeys VALUES(?,?,?,?,?)');
    // Two referrals, including a run that has started but has no successful actions.
    insert.run('a', 'devnet', 'note', ALL, '2026-11-11');
    insert.run('b', 'devnet', 'note', 1 | 2 | actionBit('ticket', 'mint'), '2026-11-12');
    insert.run('c', 'devnet', 'study-group', 1, '2026-11-13');
    insert.run('d', 'demo', 'note', ALL & ~2, '2026-11-14');
    insert.run('outside', 'devnet', 'note', ALL, '2026-12-01');
    const rows = db.prepare(reportSql()).all('2026-11-01', '2026-11-30') as Record<string, unknown>[];
    const totals = aggregateReach(rows, 'devnet');
    assert.equal(totals.started, 3);
    assert.equal(totals.walletConnected, 2);
    assert.equal(totals.minted, 2); // One completed run has three mints, counted once here.
    assert.equal(totals.transferred, 1);
    assert.equal(totals.redeemed, 1);
    assert.equal(totals.lessonsCompleted, 1);
    assert.equal(totals.ticket_mint, 2);
    assert.equal(totals.membership_mint, 1);
    assert.equal(reachRate(totals.certificate, totals.started), 1 / 3);
    assert.equal(aggregateReach(rows, 'demo').started, 1);
    assert.equal(aggregateReach(rows, 'demo').walletConnected, 0);
    // Every CSV reach field has a corresponding SQL aggregate, with zero defaults for inactive referrals.
    for (const key of REACH_KEYS) assert.ok(key in rows[0]);
    assert.ok(Object.values(reachCounts()).every(value => value === 0));
    assert.equal(reachRate(0, 0), null);
    const csv = monthlyCsv([{month: '2026-11', mode: 'devnet', ref: 'note', ...totals}]);
    assert.ok(csv.includes('"ticket_mint"'));
    assert.ok(csv.includes('"walletConnected"'));
    assert.equal(csv.split('\r\n')[0].split(',').length, csv.split('\r\n')[1].split(',').length);
  } finally { db.close(); }
});
