import { Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis();

const worker = new Worker(
  'mongo-redis',
  
  async (job) => {
    try {
      const fullDocument = job.data.fullDocument;
      console.log('Processing document:', JSON.stringify(fullDocument));

      const documentId = fullDocument._id.toString();

      const flattenedDocument = flattenObject(fullDocument);

      await redis.hset(documentId, flattenedDocument);

      console.log(`Saved to Redis hash: key:${documentId}`);

      await createIndexes(flattenedDocument, documentId);

      console.log(`Indexes created for document ID: ${documentId}`);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
    }
  },
  {
    concurrency: 20,
    connection: {
      host: 'localhost',
      port: 6380,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job completed: ${job.data.fullDocument._id}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job failed: ${job?.id}`, err);
});


function flattenObject(
  obj: any,
  parentKey = '',
  result: { [key: string]: any } = {}
): { [key: string]: any } {
  for (const [key, value] of Object.entries(obj)) {
    const compoundKey = parentKey ? `${parentKey}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, compoundKey, result);
    } else {
      result[compoundKey] = value;
    }
  }
  return result;
}


async function createIndexes(document: any, documentId: string) {
  const indexFields = ['name', 'address.city'];

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