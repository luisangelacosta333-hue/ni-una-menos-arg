export default async function handler(req, res) {
    // Configuración de seguridad y CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejo del pre-flight de los navegadores
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Método no permitido' });

    try {
        const { contactos, mensaje } = req.body;
        if (!contactos || !mensaje || contactos.length === 0) {
            return res.status(400).json({ success: false, msg: 'Faltan los contactos o el mensaje de emergencia.' });
        }

        // 🛡️ ORDEN PARA LEER LAS LLAVES OCULTAS DE VERCEL
        // Asegurate de crear estas variables en Settings > Environment Variables de Vercel
        const idInstance = process.env.GREEN_API_ID;
        const apiTokenInstance = process.env.GREEN_API_TOKEN;

        if (!idInstance || !apiTokenInstance) {
            return res.status(500).json({ success: false, msg: 'Faltan las llaves de Green API en Vercel.' });
        }

        // URL del servidor de Green API
        const urlGreenApi = `https://7107.api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;

        // Bucle para mandar la alerta a todos los familiares registrados
        const promesasDeEnvio = contactos.map(async (numeroFormateado) => {
            // Acá el número ya viene formateado y limpio desde el Frontend, 
            // solo le agregamos el @c.us que necesita Green API
            const chatId = `${numeroFormateado}@c.us`;

            const payload = {
                chatId: chatId,
                message: mensaje
            };

            return fetch(urlGreenApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        });

        // Disparamos todos los mensajes al mismo tiempo (Gatillo múltiple)
        await Promise.all(promesasDeEnvio);

        return res.status(200).json({ success: true, msg: '🚨 Alertas de emergencia enviadas correctamente.' });

    } catch (error) { 
        console.error("Error en el disparador de WhatsApp:", error);
        return res.status(500).json({ success: false, msg: error.message }); 
    }
}
