// k6/capacidad.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    capacity: {
      executor: 'ramping-arrival-rate',
      startRate: 10,           // empieza a 10 req/s
      timeUnit: '1s',          // el rate se mide por segundo
      preAllocatedVUs: 100,    // VUs reservadas al inicio
      maxVUs: 1000,            // techo de VUs que k6 puede crear si hace falta
      stages: [
        { duration: '1m', target: 100 },   // sube a 100 req/s en 1 min
        { duration: '1m', target: 200 },   // 200 req/s
        { duration: '1m', target: 400 },   // 400 req/s
        { duration: '1m', target: 800 },   // 800 req/s
        { duration: '1m', target: 1200 },  // 1200 req/s (probablemente ya rompe)
        { duration: '30s', target: 0 },    // bajada
      ],
    },
  },
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const URL = 'http://localhost:4000/api/products/get-all-products';

export default function () {
  const res = http.get(URL);
  check(res, { 'status es 200': (r) => r.status === 200 });
  // Sin sleep: la carga es la que marca el executor, no cada VU.
}