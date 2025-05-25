import { obtenerSaludoPorLada } from './utils/getSaludoPorLada'

const typing = async function (ctx: any, provider: any) {
    if (provider && provider?.vendor && provider.vendor?.sendPresenceUpdate) {
        const id = ctx.key.remoteJid
        await provider.vendor.sendPresenceUpdate('composing', id)
    }
}
const recording = async function (ctx: any, provider: any) {
    if (provider && provider?.vendor && provider.vendor?.sendPresenceUpdate) {
        const id = ctx.key.remoteJid
        await provider.vendor.sendPresenceUpdate('recording', id)
    }
}

// 🔥 Nuevo: generar saludo según lada
const getSaludoDeBienvenida = function (ctx: any): string {
  const numero = ctx?.key?.remoteJid || '+521000000000'
  return `${obtenerSaludoPorLada(numero)} 👋 Bienvenido, ¿en qué te puedo ayudar hoy?`
}

export { typing, recording, getSaludoDeBienvenida }
