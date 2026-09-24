// Archivo: api/enviar-sms.js
export default async function handler(req, res) {
  // Solo aceptamos peticiones POST desde tu app
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { contactos, mensaje } = req.body;
  const apiKey = process.env.SMS_API_KEY; // La llave que guardaste en Vercel

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta la API KEY en el servidor' });
  }

  try {
    // Recorremos los contactos y enviamos un SMS a cada uno
    for (let numero of contactos) {
      const url = `http://servicio.smsmasivos.com.ar/enviar_sms.asp?api=1&APIKEY=${apiKey}&TOS=${numero}&TEXTO=${encodeURIComponent(mensaje)}`;
      
      // Hacemos la llamada silenciosa a SMS Masivos
      await fetch(url, { method: 'GET' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error en Vercel al enviar SMS:", error);
    res.status(500).json({ error: 'Fallo al procesar el SMS' });
  }
}
