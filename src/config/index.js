const path = require('path');
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  // Central place for the data file location so services/tests can override it if needed.
  dataFilePath: process.env.DATA_FILE_PATH || path.join(__dirname, '..', 'data', 'expenses.json'),
};
