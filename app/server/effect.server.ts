import { env } from "cloudflare:workers";
import { D1Client } from "@effect/sql-d1";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

export const runQuery = <A, E>(
  effect: Effect.Effect<A, E, SqlClient.SqlClient>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(D1Client.layer({ db: env.DB }).pipe(Layer.orDie)),
    ),
  );
