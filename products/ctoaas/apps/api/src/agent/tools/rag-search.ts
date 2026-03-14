/**
 * RAG Search Tool
 *
 * Wraps the RAGQueryService to provide a tool node
 * for the advisory agent graph. Accepts a query string,
 * returns structured results with citations and grounding.
 *
 * [IMPL-033][FR-005][FR-006][FR-007][US-03][US-04]
 */

import {
  RAGQueryService,
  QueryOptions,
  QueryResult,
} from '../../services/rag-query.service';

// --------------- types ---------------

export interface RAGSearchToolInstance {
  execute: (query: string, options?: QueryOptions) => Promise<QueryResult>;
}

// --------------- factory ---------------

/**
 * Create a RAG search tool that delegates to the RAGQueryService.
 *
 * Accepts the service as a dependency for testability.
 */
export function createRAGSearchTool(
  ragService: RAGQueryService
): RAGSearchToolInstance {
  return {
    async execute(
      query: string,
      options?: QueryOptions
    ): Promise<QueryResult> {
      return ragService.query(query, options);
    },
  };
}
