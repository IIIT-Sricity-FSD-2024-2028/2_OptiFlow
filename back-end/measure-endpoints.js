const { exec } = require('child_process');

const ENDPOINTS = [
  '/users',
  '/tasks',
  '/projects',
  '/escalations',
  '/evidence',
  '/branches',
  '/roles',
  '/subtasks',
  '/audit-logs',
  '/compliance-rules',
  '/compliance-violations',
  '/users/roles/mapping',
  '/process-instances',
  '/process-templates',
  '/process-instance-steps',
  '/teams',
  '/notifications',
  '/compliance-categories',
  '/compliance-bindings',
];

function test(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = `http://localhost:3000${endpoint}`;
    exec(`curl -o /dev/null -s -w "%{http_code}" -H "x-user-role: superuser" -H "x-company-id: all" ${url}`, (err, stdout, stderr) => {
      const duration = Date.now() - start;
      resolve({ endpoint, code: stdout.trim(), duration });
    });
  });
}

async function run() {
  console.log("Measuring response times for all endpoints...");
  const results = [];
  for (const ep of ENDPOINTS) {
    const res = await test(ep);
    results.push(res);
    console.log(`Endpoint ${ep.padEnd(25)}: Code ${res.code}, Time: ${res.duration}ms`);
  }
}
run();
