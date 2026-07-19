import { reportModel, type ReportType } from "@/models/report-model";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import mongoose from "mongoose";
import type { Collection } from "mongodb"
import { BaseRag } from "./base";
import { MongoDBAtlasVectorSearch, VoyageEmbeddings } from "@langchain/mongodb"
import { baseConfig } from "@/config";

class ReportEmbedding extends BaseRag {
    static transactionOptions: mongoose.mongo.TransactionOptions = {
        readPreference: "primary",
        readConcern: { level: "local" },
        writeConcern: { w: "majority" }

    }
    async create(data: ReportType) {
        const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", { chunkSize: 500, chunkOverlap: 50 })
        const summary = `
        report_id: ${data.report_id}
        user_id: ${data.user_id}
        category: ${data.category}
        Incident: ${data.summary}
        `
        const output = await splitter.createDocuments(
            [summary],
            [{
                report_id: data.report_id
            }]
        );
        const nativeCollection = mongoose.connection.getClient()
            .db(mongoose.connection.name)
            .collection(reportModel.collection.name) as unknown as Collection;

        await MongoDBAtlasVectorSearch.fromDocuments( // const returned = 
            output,
            new VoyageEmbeddings({
                apiKey: baseConfig.VOYAGE_API_KEY,
                modelName: "voyage-4",
            }),
            {
                collection: nativeCollection,
                indexName: "default",
                textKey: "summary",
                embeddingKey: "embedding",
            }

        )
        // console.log("returns :", returned)
        await this.createSearchIndex(reportModel, "default")
    }

    async getResponseFromVectorSearch(query: string) {
        const collection = mongoose.connection.getClient()
            .db(mongoose.connection.name)
            .collection(reportModel.collection.name) as unknown as Collection;

        const vectorStore = new MongoDBAtlasVectorSearch(

            new VoyageEmbeddings({
                apiKey: baseConfig.VOYAGE_API_KEY,
                modelName: "voyage-4",
            }), {
            collection,
            indexName: "default",
            textKey: "summary",
            embeddingKey: "embedding"

        }


        )
        const retriever = vectorStore.asRetriever({
            searchType: "mmr",
            searchKwargs: {
                fetchK: 20,
                lambda: 1.0
            },
        })

        const output = await retriever._getRelevantDocuments(query)
        console.log("here is the output mahin: ", output)
        return output
    }


}

export const reportEmbedding = new ReportEmbedding()