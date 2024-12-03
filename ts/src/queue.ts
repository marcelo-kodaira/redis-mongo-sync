import { Queue } from "bullmq";

export const queue = new Queue("mongo-redis", {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
  connection: {
    host: "localhost",
    port: 6380,
  },
});
