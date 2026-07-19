import type { Document } from "mongoose";
import type mongoose from "mongoose";

export abstract class BaseRag {
  protected async createSearchIndex(
    model: typeof mongoose.Model<Document>,
    indexName: string
  ) {
    const list_existed_indexes = await model.listSearchIndexes();

    if (list_existed_indexes.length > 0) {
      return;
    }

    await model.createSearchIndex({
      name: indexName,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 1024,
            similarity: "cosine",
          }, // fixed numDimensions for voyage ai
        ],
      },
    });
  }
}
