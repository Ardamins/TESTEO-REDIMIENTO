import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Calentamiento
    { duration: '1m', target: 150 },  // Sube fuerte
    { duration: '1m', target: 300 },  // Punto de quiebre
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:4000/api/products/get-all-products');
  check(res, { 'status es 200': (r) => r.status === 200 });
  sleep(1);
}