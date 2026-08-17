import jwt from 'jsonwebtoken';
const token = jwt.sign({
  sub: '30000000-0000-0000-0000-000000000005',
  email: 'homestay@servicehub.com',
  role: 'PROVIDER',
  providerId: '40000000-0000-0000-0000-000000000001'
}, 'servicehub_super_secret_jwt_key_2026', { expiresIn: '1h' });
console.log(token);
