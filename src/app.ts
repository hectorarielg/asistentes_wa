import "dotenv/config"
import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB } from '@builderbot/bot'
import { BaileysProvider } from '@builderbot/provider-baileys'
import { toAsk, httpInject } from "@builderbot-plugins/openai-assistants"
import { typing } from "./utils/presence"

/** Puerto en el que se ejecutará el servidor */
const PORT = process.env.PORT ?? 3008
/** ID del asistente de OpenAI */
const ASSISTANT_ID = process.env.ASSISTANT_ID ?? ''
const userQueues = new Map();
const userLocks = new Map(); // New lock mechanism

// Enviar datos a Sheets
const sendToGoogleSheets = async (data: {
  nombre: string;
  correo: string;
  tipo: string;
  whatsapp: string;
}) => {
  try {
    console.log('📤 Enviando a:', process.env.GOOGLE_SHEETS_WEBHOOK);
    console.log('📦 Datos:', data);

    const response = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK!, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.text();
    console.log('✅ Respuesta del Web App:', result);
  } catch (error) {
    console.error('❌ Error enviando a Sheets:', error);
  }
};




/**
 * Function to process the user's message by sending it to the OpenAI API
 * and sending the response back to the user.
 */
const processUserMessage = async (ctx, { flowDynamic, state, provider }) => {
    await typing(ctx, provider);
    const response = await toAsk(ASSISTANT_ID, ctx.body, state);

    // Split the response into chunks and send them sequentially
   const chunks = response.split(/\n\n+/);
for (const chunk of chunks) {
    const cleanedChunk = chunk.trim().replace(/【.*?】[ ] /g, "");

    // 👇 Evitar mostrar el comando de guardar
    if (cleanedChunk.startsWith('#guardar(')) continue;

    await flowDynamic([{ body: cleanedChunk }]);
}


  const match = response.match(/#guardar\((.*?)\)/);
if (match) {
    const entries = match[1].split(',').map(pair => {
        const [key, value] = pair.split('=');
        return [key.trim(), value.trim()];
    });
    const rawParams = Object.fromEntries(entries);

    const formattedParams = {
  nombre: rawParams.nombre || '',
  correo: rawParams.correo || '',
  tipo: rawParams.tipo || '',
  whatsapp: ctx.from
};


    console.log('📤 Enviando datos a Sheets:', formattedParams);

    await sendToGoogleSheets(formattedParams);
}




};

/**
 * Function to handle the queue for each user.
 */
const handleQueue = async (userId) => {
    const queue = userQueues.get(userId);
    
    if (userLocks.get(userId)) {
        return; // If locked, skip processing
    }

    while (queue.length > 0) {
        userLocks.set(userId, true); // Lock the queue
        const { ctx, flowDynamic, state, provider } = queue.shift();
        try {
            await processUserMessage(ctx, { flowDynamic, state, provider });
        } catch (error) {
            console.error(`Error processing message for user ${userId}:`, error);
        } finally {
            userLocks.set(userId, false); // Release the lock
        }
    }

    userLocks.delete(userId); // Remove the lock once all messages are processed
    userQueues.delete(userId); // Remove the queue once all messages are processed
};

/**
 * Flujo de bienvenida que maneja las respuestas del asistente de IA
 * @type {import('@builderbot/bot').Flow<BaileysProvider, MemoryDB>}
 */
const welcomeFlow = addKeyword<BaileysProvider, MemoryDB>(EVENTS.WELCOME)
    .addAction(async (ctx, { flowDynamic, state, provider }) => {
        const userId = ctx.from; // Use the user's ID to create a unique queue for each user

        if (!userQueues.has(userId)) {
            userQueues.set(userId, []);
        }

        const queue = userQueues.get(userId);
        queue.push({ ctx, flowDynamic, state, provider });

        // If this is the only message in the queue, process it immediately
        if (!userLocks.get(userId) && queue.length === 1) {
            await handleQueue(userId);
        }
    });

/**
 * Función principal que configura y inicia el bot
 * @async
 * @returns {Promise<void>}
 */
const main = async () => {

    console.log('🚀 Variables cargadas:');
    console.log('ASSISTANT_ID:', process.env.ASSISTANT_ID);
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
    console.log('GOOGLE_SHEETS_WEBHOOK:', process.env.GOOGLE_SHEETS_WEBHOOK);
    /**
     * Flujo del bot
     * @type {import('@builderbot/bot').Flow<BaileysProvider, MemoryDB>}
     */
    const adapterFlow = createFlow([welcomeFlow]);

    /**
     * Proveedor de servicios de mensajería
     * @type {BaileysProvider}
     */
    const adapterProvider = createProvider(BaileysProvider, {
        groupsIgnore: true,
        readStatus: false,
    });

    /**
     * Base de datos en memoria para el bot
     * @type {MemoryDB}
     */
    const adapterDB = new MemoryDB();

    /**
     * Configuración y creación del bot
     * @type {import('@builderbot/bot').Bot<BaileysProvider, MemoryDB>}
     */
    const { httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    httpInject(adapterProvider.server);
    httpServer(+PORT);
};

main();
