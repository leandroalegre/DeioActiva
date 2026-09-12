// ecosystem.config.js — DeioActiva backend
// Config de PM2 para correr el backend NestJS en sistemascloud.ar,
// siguiendo el mismo patron que ya usan rrhh-api / elecciones-defensoria en este hosting.
//
// Uso en el servidor (Terminal de cPanel):
//   cd ~/deioactiva-backend
//   pm2 start ecosystem.config.js
//   pm2 save

module.exports = {
  apps: [
    {
      name: 'deioactiva-api',
      cwd: __dirname,
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
