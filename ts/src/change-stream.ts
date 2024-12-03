import { MongoClient, ChangeStream, ChangeStreamDocument } from "mongodb";
import { Writable } from "stream";
import { queue } from "./queue";

const uri = "mongodb://127.0.0.1:27017/sync/?replicaSet=rs0";

async function main() {
  const client = new MongoClient(uri);

  try {
    console.log("Connecting to the MongoDB cluster...");
    await client.connect();

    const pipeline = [
      {
        $match: {
          operationType: { $in: ["insert", "update", "delete"] },
        },
      },
    ];

    // Uncomment the desired method of monitoring

    // Method 1: Using EventEmitter
    // await monitorListingsUsingEventEmitter(client, 30000, pipeline);

    // Method 2: Using hasNext()
    // await monitorListingsUsingHasNext(client, 30000, pipeline);

    // Method 3: Using Stream API
    console.log("running");
    await monitorListingsUsingStreamAPI(client, pipeline);
  } finally {
    await client.close();
  }
}

main().catch(console.error);

/**
 * Close the given change stream after the given amount of time
 * @param timeInMs The amount of time in ms to monitor listings
 * @param changeStream The open change stream that should be closed
 */
function closeChangeStream(timeInMs: number, changeStream: ChangeStream) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      console.log("Closing the change stream");
      changeStream.close();
      resolve();
    }, timeInMs);
  });
}

/**
 * Monitor changes using EventEmitter's `on` method
 * @param client MongoDB client
 * @param timeInMs Monitoring duration
 * @param pipeline Change stream aggregation pipeline
 */
async function monitorListingsUsingEventEmitter(
  client: MongoClient,
  timeInMs: number,
  pipeline: object[]
) {
  const collection = client
    .db("sample_airbnb")
    .collection("listingsAndReviews");
  const changeStream = collection.watch(pipeline);

  changeStream.on("change", (doc) => {
    console.log(
      "EventEmitter - Detected change:",
      JSON.stringify(doc, null, 2)
    );
  });

  await closeChangeStream(timeInMs, changeStream);
}

/**
 * Monitor changes using ChangeStream's `hasNext` method
 * @param client MongoDB client
 * @param timeInMs Monitoring duration
 * @param pipeline Change stream aggregation pipeline
 */
async function monitorListingsUsingHasNext(
  client: MongoClient,
  timeInMs: number,
  pipeline: object[]
) {
  const collection = client
    .db("sample_airbnb")
    .collection("listingsAndReviews");
  const changeStream = collection.watch(pipeline);

  closeChangeStream(timeInMs, changeStream);

  try {
    while (await changeStream.hasNext()) {
      const doc = await changeStream.next();
      console.log("hasNext - Detected change:", JSON.stringify(doc, null, 2));
    }
  } catch (error) {
    if (changeStream.closed) {
      console.log("ChangeStream is closed.");
    } else {
      throw error;
    }
  }
}

/**
 * Monitor changes using Node.js Stream API
 * @param client MongoDB client
 * @param pipeline Change stream aggregation pipeline
 */
async function monitorListingsUsingStreamAPI(
  client: MongoClient,
  pipeline: object[]
) {
  const collection = client.db("sync").collection("listingsAndReviews");
  const changeStream = collection.watch(pipeline);

  await new Promise<void>((resolve, reject) => {
    changeStream.stream().pipe(
      new Writable({
        objectMode: true,
        write(doc: ChangeStreamDocument<any>, _, callback) {
          queue.add("mongo-redis", doc);
          console.log(
            "Stream API - Detected change:",
            JSON.stringify(doc, null, 2)
          );
          callback();
        },
      })
    );

    changeStream.on("error", (error) => {
      console.error("Change stream error:", error);
      reject(error);
    });

    // changeStream.on("close", () => {
    //   console.log("Change stream closed.");
    //   resolve();
    // });
  });
}
