// D4 : test de charge k6 simple — `k6 run scripts/load-test.js`
// Cible /health/live et /api/jobs (public) pour verifier la latence
// sous 20 VUs sur 1 minute. Pas de login/auth pour simplicite.

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '40s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
  },
};

const BASE = __ENV.API_URL || 'https://omni-gerant-api.onrender.com';

export default function () {
  const r1 = http.get(`${BASE}/health/live`);
  check(r1, { 'live 200': (r) => r.status === 200 });

  const r2 = http.get(`${BASE}/api/jobs`);
  check(r2, { 'jobs 200': (r) => r.status === 200 });

  sleep(1);
}
