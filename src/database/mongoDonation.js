const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    valor: { type: Number, required: true },
    mensagem: { type: String, trim: true, default: '' },
    recebidoEm: { type: Date, default: () => new Date(), required: true }
  },
  {
    versionKey: false
  }
);

donationSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Donation', donationSchema);
