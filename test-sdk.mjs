import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId: '69455d52c9eab36b7d26cc74',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpbXZpc2lvbmdyb3VwYWJAZ21haWwuY29tIiwiZXhwIjoxNzc3NTQzODY3LCJpYXQiOjE3NzQ5NTE4NjcsImF1ZCI6InBsYXRmb3JtIn0.CVM4wcKGz6yQMniSMIy6ofzAPswGJRVBJcF_AGDt0AI',
  serverUrl: 'https://base44.app',
});

try {
  const articles = await base44.entities.Article.list('-created_date', 1);
  console.log('SUCCESS:', JSON.stringify(articles, null, 2).slice(0, 500));
} catch (err) {
  console.log('ERROR:', err.message, err.status, JSON.stringify(err.data || {}, null, 2));
}
