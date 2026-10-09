import type { PGlite } from '@electric-sql/pglite';
import {
  CompiledQuery,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type QueryResult,
} from 'kysely';
import type { Kysely } from 'kysely';

/** Serialises access so one PGlite instance behaves like a single pooled connection. */
class Mutex {
  private tail: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.tail;
    this.tail = previous.then(() => next);
    await previous;
    return release;
  }
}

class PGliteConnection implements DatabaseConnection {
  constructor(private readonly client: PGlite) {}

  async executeQuery<R>(query: CompiledQuery): Promise<QueryResult<R>> {
    if (query.parameters.length === 0) {
      // Simple protocol: needed for multi-statement migrations.
      const results = await this.client.exec(query.sql);
      const last = results[results.length - 1];
      return {
        rows: (last?.rows ?? []) as R[],
        numAffectedRows: BigInt(last?.affectedRows ?? 0),
      };
    }
    const result = await this.client.query<R>(query.sql, [...query.parameters]);
    return {
      rows: result.rows,
      numAffectedRows: BigInt(result.affectedRows ?? 0),
    };
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('Streaming is not supported by the PGlite dialect');
  }
}

class PGliteDriver implements Driver {
  private readonly mutex = new Mutex();
  private readonly releases = new WeakMap<DatabaseConnection, () => void>();
  private readonly connection: PGliteConnection;

  constructor(private readonly client: PGlite) {
    this.connection = new PGliteConnection(client);
  }

  async init(): Promise<void> {
    await this.client.waitReady;
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    const release = await this.mutex.acquire();
    this.releases.set(this.connection, release);
    return this.connection;
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('begin'));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('commit'));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('rollback'));
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    this.releases.get(connection)?.();
  }

  async destroy(): Promise<void> {
    await this.client.close();
  }
}

export class PGliteDialect implements Dialect {
  constructor(private readonly client: PGlite) {}

  createAdapter(): PostgresAdapter {
    return new PostgresAdapter();
  }
  createDriver(): Driver {
    return new PGliteDriver(this.client);
  }
  createIntrospector(db: Kysely<unknown>): PostgresIntrospector {
    return new PostgresIntrospector(db);
  }
  createQueryCompiler(): PostgresQueryCompiler {
    return new PostgresQueryCompiler();
  }
}
