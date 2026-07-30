# ADR 0002: Storage Abstraction (Repository Pattern)

## Status
Proposed

## Context
The system needs to persist sessions, findings, and configuration. We want to avoid coupling the business logic to a specific database implementation.

## Decision
We will adopt the **Repository Pattern**. All data access will be performed through well-defined interfaces.

## Rationale
-   **Decoupling**: Business logic remains independent of the storage mechanism.
-   **Testability**: Easier to mock data access for unit and integration tests.
-   **Flexibility**: Allows starting with local SQLite or file-based storage and migrating to a more robust database (e.g., PostgreSQL) if needed in the future without changing the core logic.

## Consequences
-   Interfaces for each entity (Session, Finding, etc.) must be defined in the contracts package.
-   Implementations will be provided in a separate infrastructure layer.
