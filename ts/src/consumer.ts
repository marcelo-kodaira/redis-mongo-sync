import { Worker } from "bullmq";
import Redis from "ioredis";

const redis = new Redis({
  port: 6381,
});

const worker = new Worker(
  "mongo-redis",

  async (job) => {
    const jobData = job.data;

    const operationType = job.data.operationType;

    await operationMapper[operationType](jobData);
  },
  {
    concurrency: 20,
    connection: {
      host: "localhost",
      port: 6380,
    },
  }
);

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job failed: ${job?.id}`, err);
});

const operationMapper: Record<string, (jobData: any) => Promise<void>> = {
  insert: async (jobData: any) => {
    console.log("Inserting document:", JSON.stringify(jobData.fullDocument));
    await addDocumentToRedis(jobData.fullDocument);
  },
  update: async (jobData: any) => {
    console.log("Updating document:", JSON.stringify(jobData.fullDocument));
  },
  delete: async (jobData: any) => {
    await deleteDocumentFromRedis(jobData.documentKey._id.toString());
  },
};

const addDocumentToRedis = async (fullDocument: any) => {
  try {
    await redis.call(
      "JSON.SET",
      fullDocument._id.toString(),
      ".",
      JSON.stringify(fullDocument)
    );
  } catch (error) {
    console.error("Error adding document to Redis:", error);
  }
};

const deleteDocumentFromRedis = async (documentId: string) => {
  try {
    await redis.del(documentId);
  } catch (error) {
    console.error("Error deleting document from Redis:", error);
  }
};

const shutdown = async () => {
  await worker.close();
  await redis.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);



const updateDocumentInRedis = async (fullDocument: any) => {
  await redis.call(
    "JSON.SET",
    fullDocument._id.toString(),
    ".",
    JSON.stringify(fullDocument)
  );
  //update indexes
};

// const flattenedDocument = flattenObject(fullDocument);

// await redis.hset(documentId, flattenedDocument);

// await createIndexes(flattenedDocument, documentId);

//console.log(`Saved to Redis hash: key:${documentId}`);

function flattenObject(
  obj: any,
  parentKey = "",
  result: { [key: string]: any } = {}
): { [key: string]: any } {
  for (const [key, value] of Object.entries(obj)) {
    const compoundKey = parentKey ? `${parentKey}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenObject(value, compoundKey, result);
    } else {
      result[compoundKey] = value;
    }
  }
  return result;
}

async function createIndexes(document: any, documentId: string) {
  const indexFields = ["name", "address.city"];

  for (const field of indexFields) {
    if (document[field] !== undefined && document[field] !== null) {
      const fieldValue = document[field].toString();

      await redis.sadd(`index:${field}:${fieldValue}`, documentId);

      console.log(
        `Indexed field '${field}' with value '${fieldValue}' for document ID ${documentId}`
      );
    }
  }

}
