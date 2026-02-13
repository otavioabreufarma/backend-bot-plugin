const { app } = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Backend VIP rodando na porta ${port}`);
});
