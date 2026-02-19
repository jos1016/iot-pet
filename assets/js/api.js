// MODO LOCAL PURO - VELOCIDAD INSTANTÁNEA
// Se ha eliminado la conexión a Internet para garantizar rendimiento ⚡

const MOCK_DATA = [
    { id: "1", nombre: "Dispensador Sala", estado: "Encendido", modo: "automatico", nivel_comida: "Medio", cantidad: 450, ultima_dispensacion: new Date().toISOString() },
    { id: "2", nombre: "Patio Trasero", estado: "Apagado", modo: "manual", nivel_comida: "Vacio", cantidad: 50, ultima_dispensacion: new Date(Date.now() - 3600000).toISOString() },
    { id: "3", nombre: "Cocina", estado: "Encendido", modo: "programado", nivel_comida: "Lleno", cantidad: 900, ultima_dispensacion: new Date(Date.now() - 7200000).toISOString() }
];

// Simulamos una respuesta asíncrona pero MUY rápida (10ms)
const delay = (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));

async function getDispositivos() {
    await delay();
    // Retornamos una COPIA para evitar mutaciones directas inesperadas
    return JSON.parse(JSON.stringify(MOCK_DATA));
}

async function crearDispositivo(data) {
    await delay();
    const nuevo = { ...data, id: Date.now().toString() };
    MOCK_DATA.push(nuevo);
    return nuevo;
}

async function actualizarDispositivo(id, data) {
    await delay();
    const index = MOCK_DATA.findIndex(d => d.id === id);
    if (index !== -1) {
        MOCK_DATA[index] = { ...MOCK_DATA[index], ...data };
        // Actualizar timestamp si se dispensa (opcional)
        if (data.nivel_comida) {
            MOCK_DATA[index].ultima_dispensacion = new Date().toISOString();
        }
    }
}

async function eliminarDispositivo(id) {
    await delay();
    const index = MOCK_DATA.findIndex(d => d.id === id);
    if (index !== -1) {
        MOCK_DATA.splice(index, 1);
    }
}
