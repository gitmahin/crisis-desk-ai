import { reportModel, type ReportType } from "@/models/report-model";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import mongoose from "mongoose";
import type { Collection } from "mongodb";
import { BaseRag } from "./base";
import { MongoDBAtlasVectorSearch, VoyageEmbeddings } from "@langchain/mongodb";
import { baseConfig } from "@/config";

/**
 * Service class for managing Retrieval-Augmented Generation (RAG) for Incident Reports.
 * 
 * This class handles the transformation of raw report data into semantic vector 
 * embeddings and manages the retrieval of contextually relevant documents using 
 * MongoDB Atlas Vector Search.
 * 
 * @extends BaseRag
 */
class ReportEmbedding extends BaseRag {
  /**
 * Optimized transaction settings for MongoDB operations to ensure 
 * consistency and performance during vector indexing.
 */
  static transactionOptions: mongoose.mongo.TransactionOptions = {
    readPreference: "primary",
    readConcern: { level: "local" },
    writeConcern: { w: "majority" },
  };

  /**
  * Processes a report by generating semantic embeddings and storing them in the vector store.
  * 
  * @param data - The raw report data to be indexed.
  * 
  * @remarks
  * 1. Summarization: Creates an LLM-friendly narrative of the report.
  * 2. Splitting: Breaks the narrative into chunks to fit embedding model context windows.
  * 3. Vectorization: Uses Voyage AI to generate 1024+ dimension vectors.
  * 4. Persistence: Saves chunks into the MongoDB collection with an `embedding` field.
  */
  async create(data: ReportType) {
    /**
     * Define the splitting strategy.
     * Use 'markdown' language mode to intelligently handle structure.
     * ChunkSize 500 is a 'sweet spot' for maintaining context without losing granularity.
     */
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 500,
      chunkOverlap: 50,
    });

    /**
    * Narrative Engineering:
    * We don't just embed the raw JSON. We create a structured string that
    * helps the embedding model understand the relationships between fields.
    */
    const summary = `
        report_id: ${data.report_id}
        user_id: ${data.user_id}
        category: ${data.category}
        Incident: ${data.summary}
        report created date: ${new Date(data.created_at!).toLocaleString(
      "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    )}
        `;
    const output = await splitter.createDocuments(
      [summary],
      [
        {
          report_id: data.report_id,
        },
      ]
    );
    /**
     * Access the native MongoDB driver collection.
     * Necessary because LangChain's MongoDB integration interacts with the 
     * driver layer directly, bypassing the Mongoose ORM abstraction.
     */
    const nativeCollection = mongoose.connection
      .getClient()
      .db(mongoose.connection.name)
      .collection(reportModel.collection.name) as unknown as Collection;

    await MongoDBAtlasVectorSearch.fromDocuments(
      // const returned =
      output,
      new VoyageEmbeddings({
        apiKey: baseConfig.VOYAGE_API_KEY,
        modelName: "voyage-4",
      }),
      {
        // @ts-ignore
        collection: nativeCollection,
        indexName: "default",
        textKey: "summary",
        embeddingKey: "embedding",
      }
    );
    // console.error("returns :", returned)
    /** Ensure the search index is properly synchronized */
    await this.createSearchIndex(reportModel, "default");
  }

   /**
   * Performs a semantic search across the report database to find contextually relevant info.
   * 
   * @param query - The natural language query from the user or AI agent.
   * @returns {Promise<Document[]>} A list of relevant document chunks.
   * 
   * @remarks
   * Uses **MMR (Maximal Marginal Relevance)**. 
   * Unlike standard similarity search, MMR re-ranks results to ensure a diverse 
   * set of information, preventing the AI from receiving redundant chunks.
   */
  async getResponseFromVectorSearch(query: string) {
    const collection = mongoose.connection
      .getClient()
      .db(mongoose.connection.name)
      .collection(reportModel.collection.name) as unknown as Collection;

    const vectorStore = new MongoDBAtlasVectorSearch(
      new VoyageEmbeddings({
        apiKey: baseConfig.VOYAGE_API_KEY,
        modelName: "voyage-4",
      }),
      {
        collection,
        indexName: "default",
        textKey: "summary",
        embeddingKey: "embedding",
      }
    );
    const retriever = vectorStore.asRetriever({
      searchType: "mmr",
      searchKwargs: {
        fetchK: 20,
        lambda: 1.0,
      },
    });

    const output = await retriever._getRelevantDocuments(query);
    // console.error("here is the output mahin: ", output);
    return output;
  }
}

export const reportEmbedding = new ReportEmbedding();
