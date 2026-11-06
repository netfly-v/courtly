import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from 'vitest';

type Db = pg.Pool | pg.PoolClient;

const OVERLAP_ERROR = { code: '23P01', constraint: 'booking_no_overlap' };

describe('booking_no_overlap constraint', () => {
  const pool = new pg.Pool({ connectionString: inject('databaseUrl') });
  const userId = randomUUID();
  const courtId = randomUUID();
  const otherCourtId = randomUUID();

  const insertBooking = (
    db: Db,
    court: string,
    from: string,
    to: string,
    status: 'ACTIVE' | 'CANCELLED' = 'ACTIVE'
  ) =>
    db.query(
      `INSERT INTO bookings (user_id, court_id, starts_at, ends_at, total_price_cents, status)
       VALUES ($1, $2, $3, $4, 2000, $5)`,
      [userId, court, `2030-06-01T${from}:00Z`, `2030-06-01T${to}:00Z`, status]
    );

  const countActiveBookings = async (db: Db, court: string) => {
    const { rows } = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM bookings WHERE court_id = $1 AND status = 'ACTIVE'`,
      [court]
    );
    return rows[0]?.count;
  };

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO users (id, email, name, password_hash) VALUES ($1, 'overlap@test.dev', 'Test', 'unused')`,
      [userId]
    );
    await pool.query(
      `INSERT INTO courts (id, name, sport, hourly_price_cents, open_hour, close_hour)
       VALUES ($1, 'Court A', 'PADEL', 2000, 8, 22), ($2, 'Court B', 'PADEL', 2000, 8, 22)`,
      [courtId, otherCourtId]
    );
  });

  afterEach(async () => {
    await pool.query('DELETE FROM bookings WHERE court_id IN ($1, $2)', [courtId, otherCourtId]);
  });

  // All test files share one database, and in watch mode it lives between reruns.
  afterAll(async () => {
    await pool.query('DELETE FROM courts WHERE id IN ($1, $2)', [courtId, otherCourtId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.end();
  });

  it('rejects an overlapping booking from a parallel transaction', async () => {
    const first = await pool.connect();
    const second = await pool.connect();
    try {
      await first.query('BEGIN');
      await second.query('BEGIN');
      await insertBooking(first, courtId, '10:00', '12:00');

      // The first booking is not committed yet, so a "check, then insert" guard in code would see a free slot.
      expect(await countActiveBookings(second, courtId)).toBe(0);

      await Promise.all([
        expect(insertBooking(second, courtId, '11:00', '12:00')).rejects.toMatchObject(
          OVERLAP_ERROR
        ),
        first.query('COMMIT'),
      ]);
    } finally {
      await Promise.all([first.query('ROLLBACK'), second.query('ROLLBACK')]);
      first.release();
      second.release();
    }
  });

  it('allows back-to-back bookings', async () => {
    await insertBooking(pool, courtId, '10:00', '11:00');
    await insertBooking(pool, courtId, '11:00', '12:00');

    expect(await countActiveBookings(pool, courtId)).toBe(2);
  });

  it('ignores cancelled bookings', async () => {
    await insertBooking(pool, courtId, '10:00', '12:00', 'CANCELLED');
    await insertBooking(pool, courtId, '10:00', '12:00');

    expect(await countActiveBookings(pool, courtId)).toBe(1);
  });

  it('allows the same time on another court', async () => {
    await insertBooking(pool, courtId, '10:00', '12:00');
    await insertBooking(pool, otherCourtId, '10:00', '12:00');

    expect(await countActiveBookings(pool, otherCourtId)).toBe(1);
  });
});
