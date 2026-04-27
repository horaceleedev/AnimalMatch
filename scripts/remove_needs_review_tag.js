import PocketBase from 'pocketbase';

const pb = new PocketBase('http://0.0.0.0:8306');

async function loginToPocketBase(pb) {
  process.loadEnvFile('.env');
  const { PB_EMAIL, PB_PASSWORD } = process.env;
  try {
    await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD);
  } catch {
    await pb.collection('users').authWithPassword(PB_EMAIL, PB_PASSWORD);
  }
}

async function removeNeedsReviewTag() {
  const tables = ['videos', 'individuals', 'crops'];

  await loginToPocketBase(pb);

  try {
    for (const table of tables) {
      console.log(`Processing ${table}...`);
      
      // Fetch all records from the table
      const records = await pb.collection(table).getFullList();
      
      for (const record of records) {
        if (record.custom_tags && Array.isArray(record.custom_tags)) {
          // Remove "needs_review" from the array
          const updatedTags = record.custom_tags.filter(tag => tag !== 'needs_review');
          
          // Only update if the array changed
          if (updatedTags.length !== record.custom_tags.length) {
            await pb.collection(table).update(record.id, {
              custom_tags: updatedTags
            });
            console.log(`Updated ${record.id} in ${table}`);
          }
        }
      }
      
      console.log(`Completed ${table}`);
    }
    
    console.log('All tables processed successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

removeNeedsReviewTag();