const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '256kb' }));

function isValidEmail(email) {
  // Validación práctica (misma intención que en frontend) 
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

app.post('/contacto', async (req, res) => {
  const { nombre, correo, mensaje } = req.body || {};

  // Validaciones del servidor
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ ok: false, error: 'Nombre es requerido' });
  }

  if (!correo || !isValidEmail(correo)) {
    return res.status(400).json({ ok: false, error: 'Correo inválido' });
  }

  if (!mensaje || !String(mensaje).trim()) {
    return res.status(400).json({ ok: false, error: 'Mensaje es requerido' });
  }

  const host = process.env.HOSTINGER_SMTP_HOST;
  const port = Number(process.env.HOSTINGER_SMTP_PORT || 465);
  const user = process.env.HOSTINGER_EMAIL;
  const pass = process.env.HOSTINGER_PASSWORD;
  const to = process.env.CONTACT_TO || 'soportechiasegura@chiasegura.site';

  if (!host || !user || !pass) {
    console.error('[Error enviando mensaje] SMTP no configurado');
    return res.status(500).json({ ok: false, error: 'SMTP no configurado en el servidor' });
  }

  console.log('Conectando SMTP');

  // Verifica conectividad + credenciales antes de enviar
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: true, // 465 SSL
      auth: { user, pass },
    });

    await transporter.verify();
    console.log('SMTP conectado');
  } catch (verifyErr) {
    console.error('Error conectando SMTP', verifyErr);
    return res.status(500).json({ ok: false, error: 'Error conectando SMTP' });
  }

  console.log('Enviando correo');

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: true, // 465 SSL
      auth: {
        user,
        pass,
      },
    });

    const subject = `Contacto - ${nombre}`;

    const info = await transporter.sendMail({
      from: user,
      to,
      subject,
      text: `Nombre: ${String(nombre).trim()}\nCorreo: ${String(correo).trim()}\n\nMensaje:\n${String(mensaje).trim()}`,
      replyTo: String(correo).trim(),
    });

    console.log('Mensaje enviado correctamente', { messageId: info && info.messageId });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error enviando mensaje', err);
    return res.status(500).json({ ok: false, error: 'Error enviando mensaje' });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

