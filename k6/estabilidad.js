// k6/estabilidad.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 15 },   // subida suave
    { duration: '8m', target: 15 },   // meseta larga (aquí se detectan fugas)
    { duration: '1m', target: 0 },    // bajada
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // p95 por debajo de 500ms
    http_req_failed:   ['rate<0.01'],  // <1% de errores
    checks:            ['rate>0.99'],  // >99% de checks OK
  },
};

const URL = 'http://localhost:4000/api/products/get-all-products';

export default function () {
  const res = http.get(URL);
  check(res, { 'status es 200': (r) => r.status === 200 });
  sleep(1);
}