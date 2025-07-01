const express = require('express');
const cors = require('cors');
const routes = require('./routes/vaccine');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', routes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Node API running on port ${PORT}`);
});