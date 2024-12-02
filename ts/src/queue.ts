import { Queue } from 'bullmq';

export const queue = new Queue('mongo-redis', {
  connection: {
    host: 'localhost',
    port: 6380,
  },
});