# ADR 0001: Internal Event Bus vs. Direct Calls

## Status
Proposed

## Context
The AI Penetration Testing Copilot consists of multiple engines (e.g., Orchestration, Recon, Exploitation) that need to communicate. We need to decide how these engines interact.

## Decision
We will use a hybrid approach:
1.  **Direct Calls (Request/Response)**: Used for synchronous operations where the caller expects an immediate result.
    *   *Boundary*: Orchestration Engine → Model Provider.
    *   *Boundary*: Engine → Repository.
    *   *Boundary*: Plugin Manager → Plugin (for specific tasks).
2.  **Internal Event Bus (Pub/Sub)**: Used for asynchronous, one-to-many communication and cross-cutting concerns.
    *   *Boundary*: Engine Findings → Audit Log / Telemetry.
    *   *Boundary*: Session State changes → UI/Notification Engine.
    *   *Boundary*: Recon findings → Exploitation Engine (loosely coupled triggers).

## Rationale
-   **Direct Calls** provide simplicity, lower latency, and type safety for critical request/response paths. It is easier to reason about the flow when a result is immediately returned.
-   **Event Bus** promotes loose coupling, allowing new subscribers (e.g., a real-time dashboard or an external logging service) to be added without modifying the core engines. It also prevents the system from being blocked if a non-critical component (like telemetry) is slow.

## Consequences
-   Engines must be designed to handle both synchronous responses and asynchronous events.
-   An event bus implementation needs to be provided in the core/contracts package.
