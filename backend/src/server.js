require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models (creates tables if they don't exist; use migrations in prod)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Models synced.');

    app.listen(PORT, () => {
      console.log(`PhoneBox API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
