const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    criadoEm: { type: Date, default: () => new Date(), required: true }
  },
  {
    versionKey: false
  }
);

subscriberSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Subscriber', subscriberSchema);
