import type { Document } from "mongoose";
import type mongoose from "mongoose";

/**
 * Base class for Retrieval-Augmented Generation (RAG) services.
 * 
 * Provides shared utilities for managing MongoDB Atlas Vector Search indexes.
 * This class ensures that the required infrastructure for semantic search 
 * is provisioned correctly before operations begin.
 * 
 * @abstract
 */
export abstract class BaseRag {

  /**
   * Provisions a Vector Search index on the specified model if it does not already exist.
   * 
   * @param model - The Mongoose model representing the collection to index.
   * @param indexName - The unique name for the search index (typically "default").
   * 
   * @protected
   * @remarks
   * This method is idempotent. It first inspects existing indexes to avoid 
   * conflicting creation requests.
   * 
   * **Configuration Details:**
   * - **Dimensions:** 1024 (Optimized for Voyage-4 embeddings).
   * - **Similarity:** Cosine (Standard for high-dimensional semantic search).
   * - **Path:** Expected field name in the document is `embedding`.
   */
  protected async createSearchIndex(
    model: typeof mongoose.Model<Document>,
    indexName: string
  ) {
    const list_existed_indexes = await model.listSearchIndexes();

    if (list_existed_indexes.length > 0) {
      return;
    }

        /**
     * Provision the Vector Search Index.
     * Note: This operation is asynchronous and may take a few minutes 
     * on the Atlas cluster to become 'Active'.
     */
    await model.createSearchIndex({
      name: indexName,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",  // The field where the Voyage vectors are stored
            numDimensions: 1024, // Specific to voyage-4 architecture
            similarity: "cosine", // Best for measuring semantic distance
          },
        ],
      },
    });
  }
}
