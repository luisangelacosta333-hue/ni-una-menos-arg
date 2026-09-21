export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { email, asunto, msg } = req.body;

    if (!email || !asunto || !msg) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    try {
        const fetchRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_TOKEN}` 
            },
            body: JSON.stringify({
                from: 'C4 Alertas S.O.S <alertas@niunamenosarg.com>', // Tu dominio verificado
                to: [email],
                subject: asunto,
                text: msg
            })
        });

        const data = await fetchRes.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
