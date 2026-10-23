import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Sube a 20 usuarios en 30 seg
    { duration: '1m', target: 20 },   // Mantén 20 usuarios por 1 min
    { duration: '30s', target: 0 },   // Baja a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // El 95% debe responder en < 500ms
    http_req_failed: ['rate<0.01'],   // Menos del 1% de errores
  },
};

export default function () {
 const res = http.get('http://localhost:4000/api/products/get-all-products');
  check(res, { 'status es 200': (r) => r.status === 200 });
  sleep(1);
}