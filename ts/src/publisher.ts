import { queue } from './queue';

const main = async () => {
  for (let i = 0; i < 5; i++) {
    const job = await queue.add('save-to-redis', { data: `Data ${i}` });
    console.log('Job added:', job.id);
  }
};

main();
