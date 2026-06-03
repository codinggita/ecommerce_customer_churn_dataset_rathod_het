const mongoose = require('mongoose');

const revokedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index: auto-removes document when expiresAt is reached
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);
