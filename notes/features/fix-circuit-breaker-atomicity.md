# Fix: Circuit Breaker Race Condition (Atomicity)

## Problem

The `recordFailure` method in `webhook-delivery.service.ts` uses a
non-atomic incr+check+set pattern:

1. `INCR circuit:failures:<id>` -- increment counter
2. `EXPIRE circuit:failures:<id> 600` -- set TTL
3. If failures >= 10: `SET circuit:open:<id> <timestamp> PX 300000`

Between steps 1 and 3 another worker can also reach the threshold,
causing a redundant (though harmless) SET. More importantly this is a
textbook check-then-act race condition and violates atomicity
guarantees.

## Fix

Replace the three Redis calls with a single Lua script executed via
`EVAL`. Redis executes Lua scripts atomically so no interleaving is
possible.

## Changes

- `RedisLike` interface: add `eval` method
- `WebhookDeliveryService`: add static `CIRCUIT_BREAKER_SCRIPT` Lua
  string and rewrite `recordFailure` to call `redis.eval()`
- Fallback: if `eval` throws (e.g., mock Redis without eval support),
  gracefully degrade to the original non-atomic pattern

## TDD Steps

1. RED -- write `circuit-breaker-atomicity.test.ts` verifying the new
   behavior (eval called, correct args, fallback works)
2. GREEN -- implement the Lua script in `webhook-delivery.service.ts`
3. REFACTOR -- review for clarity and maintainability
