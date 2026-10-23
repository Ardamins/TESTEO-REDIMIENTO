import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 15,              // Carga baja constante
  duration: '5m',       // 5 minutos (puedes cambiarlo a '10m')
};

export default function () {
 const res = http.get('http://localhost:4000/api/products/get-all-products');
  sleep(1);
}