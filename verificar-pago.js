export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Método no permitido' });

    try {
        const { local, fotoBase64 } = req.body;
        if (!fotoBase64) return res.status(400).json({ success: false, msg: 'Faltan datos (Foto del comprobante).' });

        // Variables de Entorno en Vercel
        const openAiKey = process.env.OPENAI_API_KEY;
        const supaUrl = process.env.SUPABASE_URL; 
        const supaKey = process.env.SUPABASE_KEY; 

        if (!openAiKey) return res.status(500).json({ success: false, msg: 'Falta la llave de OpenAI en Vercel.' });

        const fechaHoy = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

        // 🛡️ ORDEN ESTRICTA PARA LA IA (NIVEL AUDITORÍA FORENSE)
        const systemPrompt = `Sos un auditor financiero experto antifraude del Sistema Judicial C4 Ni Una Menos. Analizá este comprobante de transferencia bancaria. 
        La fecha de hoy es: ${fechaHoy}.
        
        Condiciones estrictas de aprobación (Sin excepciones):
        1. MONTO EXACTO: Debe ser exactamente $5.900 (plan mensual) o $39.900 (plan anual).
        2. DESTINATARIO: Obligatoriamente "Luis Angel Acosta", o el Alias "noir.elite.ceo", o CBU "0110257630025717844115".
        3. ESTADO: Debe decir "Aprobada", "Exitosa", "Completada" o "Comprobante de transferencia". Si dice "Programada", "Pendiente" o "En proceso", RECHAZAR.
        4. FECHA: Debe ser de hoy o máximo 48 horas atrás. Si es vieja, rechazar.
        5. CÓDIGO ÚNICO: Extraé el "Número de Transacción", "Id de Operación" o "Código de Comprobante". Es OBLIGATORIO para evitar doble gasto.
        
        Devuelve ÚNICAMENTE un JSON estricto con este formato: 
        {"aprobado": true, "plan": "anual", "motivo": "Aprobado", "numero_operacion": "123456789"}
        {"aprobado": true, "plan": "mensual", "motivo": "Aprobado", "numero_operacion": "123456789"}
        
        Si NO cumple alguna regla o el ticket es sospechoso:
        {"aprobado": false, "plan": "NINGUNO", "motivo": "Explicación detallada del rechazo", "numero_operacion": null}`;

        const openAiPayload = {
            model: "gpt-4o",
            messages: [{ role: "user", content: [{ type: "text", text: systemPrompt }, { type: "image_url", image_url: { url: fotoBase64 } }] }],
            response_format: { type: "json_object" },
            max_tokens: 250
        };

        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(openAiPayload)
        });

        const openAiData = await openAiRes.json();
        const iaDecision = JSON.parse(openAiData.choices[0].message.content);

        // 1. FILTRO IA: Rechazo inmediato si hay fraude visible o falta el ID de operación
        if (!iaDecision.aprobado || !iaDecision.numero_operacion) {
            return res.status(200).json({ success: false, msg: "TICKET RECHAZADO: " + iaDecision.motivo });
        }

        // 2. FILTRO BASE DE DATOS: Evitar doble gasto (Comprobantes reciclados)
        if (supaUrl && supaKey) {
            const checkReq = await fetch(`${supaUrl}/rest/v1/c4_pagos_usados?numero_operacion=eq.${iaDecision.numero_operacion}`, {
                headers: { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` }
            });
            const checkData = await checkReq.json();

            // Si el comprobante ya está en la base de datos, lo rebotamos
            if (checkData && checkData.length > 0) {
                return res.status(200).json({ success: false, msg: "FRAUDE DETECTADO: Este ticket ya fue utilizado previamente para activar otra cuenta." });
            }

            // Si es un ticket nuevo, lo guardamos para "quemarlo"
            await fetch(`${supaUrl}/rest/v1/c4_pagos_usados`, {
                method: 'POST',
                headers: { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ numero_operacion: iaDecision.numero_operacion })
            });
        }

        // SI PASÓ TODOS LOS FILTROS DE SEGURIDAD
        return res.status(200).json({ 
            success: true, 
            plan: iaDecision.plan, 
            msg: `¡PAGO APROBADO! Plan ${iaDecision.plan.toUpperCase()} auditado y activado correctamente.` 
        });

    } catch (error) { 
        return res.status(500).json({ success: false, msg: "Error del servidor de auditoría: " + error.message }); 
    }
}
