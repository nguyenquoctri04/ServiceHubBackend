const axios = require('axios');
axios.post('http://localhost:3000/api/auth/login', {
  email: 'homestay@servicehub.com',
  password: 'Password123'
}).then(res => console.log('SUCCESS:', res.data)).catch(err => console.log('ERROR:', err.response?.data || err.message));
