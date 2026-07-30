import { z } from 'zod';

/**
 * Cursor pagination is the only supported pagination style: offsets break as
 * soon as the underlying store is swapped (ADR-0004) or rows are appended
 * during a live session.
 */
export const PageRequestSchema = z.strictObject({
  /** Max items to return. Stores MAY return fewer. */
  limit: z.int().min(1).max(1_000).optional(),
  /** Opaque cursor returned by a previous page. */
  cursor: z.string().max(2_048).optional(),
  /** Field path to sort by; must be declared sortable by the repository. */
  sortBy: z.string().max(128).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});
export type PageRequest = z.infer<typeof PageRequestSchema>;

export interface Page<T> {
  items: T[];
  /** Cursor for the next page; absent when the end has been reached. */
  nextCursor?: string;
  /** Total matching rows when the store can supply it cheaply. */
  totalCount?: number;
  hasMore: boolean;
}

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.strictObject({
    items: z.array(item),
    nextCursor: z.string().max(2_048).optional(),
    totalCount: z.int().min(0).optional(),
    hasMore: z.boolean(),
  });
